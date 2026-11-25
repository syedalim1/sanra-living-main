import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { renderProtectedImage, WATERMARK_MARKER } from "../lib/media/watermark";
import { MEDIA_DERIVATIVES_BUCKET, MEDIA_ORIGINALS_BUCKET } from "../lib/media/paths";

vi.mock("server-only", () => ({}));

function solid(width: number, height: number, color: string) {
  return sharp({ create: { width, height, channels: 3, background: color } });
}

describe("photo protection", () => {
  it("embeds a watermark in WebP pixels, preserves aspect ratio and strips source metadata", async () => {
    const input = await solid(1800, 900, "#256397").jpeg()
      .withExif({ IFD0: { Copyright: "Source EXIF" } }).toBuffer();
    const image = await renderProtectedImage(input, "catalog");
    const full = await sharp(image.buffer).metadata();
    const mobile = await sharp(image.mobile).metadata();
    expect([full.format, full.width, full.height]).toEqual(["webp", 1600, 800]);
    expect(full.exif).toBeUndefined();
    expect(full.xmp?.includes(WATERMARK_MARKER)).toBe(true);
    expect([mobile.width, mobile.height]).toEqual([640, 320]);
    expect(image.mobile.length).toBeLessThan(image.buffer.length);
    const pixels = await sharp(image.buffer).stats();
    expect(pixels.channels[0].stdev).toBeGreaterThan(3);
    await expect(renderProtectedImage(image.buffer, "catalog")).rejects.toThrow(/already watermarked/);
    await expect(renderProtectedImage(image.mobile, "catalog")).rejects.toThrow(/already watermarked/);
  });

  it("adapts contrast and gives bulk supply images a stronger visible mark", async () => {
    const lightInput = await solid(500, 300, "#fff").png().toBuffer();
    const darkInput = await solid(500, 300, "#000").png().toBuffer();
    const [light, dark, project] = await Promise.all([
      renderProtectedImage(lightInput, "catalog"),
      renderProtectedImage(darkInput, "catalog"),
      renderProtectedImage(darkInput, "project"),
    ]);
    const [lightStats, darkStats, projectStats] = await Promise.all(
      [light, dark, project].map((image) => sharp(image.buffer).stats())
    );
    expect(lightStats.channels[0].min).toBeLessThan(215);
    expect(darkStats.channels[0].max).toBeGreaterThan(45);
    expect(projectStats.channels[0].mean).toBeGreaterThan(darkStats.channels[0].mean);
  });

  it("rejects unsupported images and enforces the upload size limit", async () => {
    const gif = await solid(20, 20, "#fff").gif().toBuffer();
    await expect(renderProtectedImage(gif, "catalog")).rejects.toThrow(/JPG, PNG and WebP/);
    const { validateImageSize, MAX_IMAGE_BYTES } = await import("../lib/admin/validation");
    expect(() => validateImageSize(MAX_IMAGE_BYTES + 1)).toThrow(/8 MB/);
  });

  it("archives the unchanged upload in a private bucket and saves only derivatives to the serving bucket", async () => {
    const { buildStoragePath, uploadImageFile } = await import("../lib/admin/images");
    const first = buildStoragePath("IMS-CF-42", "main");
    const second = buildStoragePath("IMS-CF-42", "main");
    expect(first).toMatch(/^products\/IMS-CF-42\/main-[0-9a-f-]+\.webp$/);
    expect(second).not.toBe(first);
    const input = await solid(140, 90, "#f2bc60").jpeg().toBuffer();
    const uploads: Array<{ bucket: string; key: string; bytes: Buffer }> = [];
    const db = {
      storage: { from: (bucket: string) => ({
        download: vi.fn().mockResolvedValue({ data: null }),
        upload: async (key: string, bytes: Buffer) => {
          uploads.push({ bucket, key, bytes });
          return { error: null };
        },
      }) },
    } as unknown as SupabaseClient;

    const url = await uploadImageFile(db, first, new File([Uint8Array.from(input)], "supplier-original.jpg"));
    expect(url).toBe("/api/media/catalog/" + first);
    expect(uploads.map(({ bucket }) => bucket)).toEqual([MEDIA_ORIGINALS_BUCKET, MEDIA_DERIVATIVES_BUCKET, MEDIA_DERIVATIVES_BUCKET]);
    expect(uploads[0].bytes.equals(input)).toBe(true);
    for (const derivative of uploads.slice(1)) {
      expect((await sharp(derivative.bytes).metadata()).xmp?.includes(WATERMARK_MARKER)).toBe(true);
    }
  });
});
