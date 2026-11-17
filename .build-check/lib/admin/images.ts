import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ALLOWED_IMAGE_FORMATS } from "@/lib/admin/validation";

const BUCKET = "product-images";
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

export async function processAdminImage(
  input: Buffer,
  watermark: boolean
): Promise<ProcessedImage> {
  const base = sharp(input, { failOn: "error", limitInputPixels: 40_000_000 }).rotate();
  const metadata = await base.metadata();

  if (
    !metadata.format ||
    !ALLOWED_IMAGE_FORMATS.includes(metadata.format as (typeof ALLOWED_IMAGE_FORMATS)[number])
  ) {
    throw new Error("Only JPG, PNG and WEBP images are accepted.");
  }

  const resized = await base
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  if (!watermark) {
    return { buffer: resized.data, width: resized.info.width, height: resized.info.height };
  }

  const fontSize = Math.max(22, Math.min(120, Math.round(resized.info.width * 0.07)));
  const svg = Buffer.from(
    `<svg width="${resized.info.width}" height="${resized.info.height}" xmlns="http://www.w3.org/2000/svg">` +
      `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" ` +
      `letter-spacing="3" fill="#FFFFFF" fill-opacity="0.15">SANRA LIVING</text>` +
      `</svg>`
  );

  const watermarked = await sharp(resized.data)
    .composite([{ input: svg, gravity: "center" }])
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: watermarked.data,
    width: watermarked.info.width,
    height: watermarked.info.height,
  };
}

export function sanitizeStorageSegment(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "UNASSIGNED";
}

export function buildStoragePath(segment: string, prefix: string, group?: string): string {
  const safeSegment = sanitizeStorageSegment(segment);
  const safeGroup = group ? `${sanitizeStorageSegment(group)}/` : "";
  return `products/${safeGroup}${safeSegment}/${prefix}-${randomUUID()}.webp`;
}

export async function uploadImageBuffer(
  db: SupabaseClient,
  path: string,
  buffer: Buffer
): Promise<string> {
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw new Error("Image upload failed.");
  }

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isManagedImage(
  url: string | null | undefined,
  prefix: string
): boolean {
  const path = storagePathFromPublicUrl(url);
  if (!path) return false;
  return path.split("/").some((segment) => segment.startsWith(`${prefix}-`));
}

export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const index = url.indexOf(PUBLIC_MARKER);
  if (index === -1) return null;
  const path = url.slice(index + PUBLIC_MARKER.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

export async function removeStoredImage(
  db: SupabaseClient,
  url: string | null | undefined
): Promise<void> {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;

  const { error } = await db.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error("Old image cleanup failed.");
  }
}
