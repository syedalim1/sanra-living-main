import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

describe("admin image pipeline", () => {
  it("resizes, converts to WEBP, strips EXIF and changes pixels for the watermark", async () => {
    const { processAdminImage } = await import("../lib/admin/images");

    const input = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: { r: 30, g: 90, b: 160 },
      },
    })
      .jpeg()
      .withExif({ IFD0: { Copyright: "SANRA Test" } })
      .toBuffer();

    const beforeMetadata = await sharp(input).metadata();
    expect(beforeMetadata.exif).toBeDefined();

    const processed = await processAdminImage(input, true);
    const plain = await processAdminImage(input, false);
    const metadata = await sharp(processed.buffer).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(1600);
    expect(metadata.height).toBeLessThanOrEqual(1600);
    expect(metadata.exif).toBeUndefined();
    expect(Buffer.compare(processed.buffer, plain.buffer)).not.toBe(0);
    expect(processed.buffer.length).toBeGreaterThan(0);
  });

  it("keeps swatch images unwatermarked and capped at 1600 px", async () => {
    const { processAdminImage } = await import("../lib/admin/images");

    const input = await sharp({
      create: {
        width: 900,
        height: 400,
        channels: 3,
        background: { r: 210, g: 180, b: 120 },
      },
    })
      .png()
      .toBuffer();

    const processed = await processAdminImage(input, false);
    const metadata = await sharp(processed.buffer).metadata();

    expect(metadata.format).toBe("webp");
    expect(processed.width).toBe(900);
    expect(processed.height).toBe(400);
  });

  it("rejects unsupported content and oversized files", async () => {
    const { processAdminImage } = await import("../lib/admin/images");
    const { validateImageSize, MAX_IMAGE_BYTES } = await import("../lib/admin/validation");

    const gif = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .gif()
      .toBuffer();

    await expect(processAdminImage(gif, false)).rejects.toThrow(
      "Only JPG, PNG and WEBP images are accepted."
    );

    expect(() => validateImageSize(MAX_IMAGE_BYTES + 1)).toThrow(
      "Images must be 8 MB or smaller."
    );
  });

  it("generates random storage paths without the original filename", async () => {
    const { buildStoragePath } = await import("../lib/admin/images");

    const first = buildStoragePath("IMS-CF-42", "main");
    const second = buildStoragePath("IMS-CF-42", "main");

    expect(first).toMatch(/^products\/IMS-CF-42\/main-[0-9a-f-]+\.webp$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain("original");
  });
});
