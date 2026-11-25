import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { validateImageSize } from "@/lib/admin/validation";
import { MEDIA_DERIVATIVES_BUCKET, MEDIA_ORIGINALS_BUCKET, isMediaKey, isOriginalKey, mediaUrl } from "./paths";
import { renderProtectedImage, type MediaProfile, type ProtectedImage } from "./watermark";

export const LOGO_PATH = "branding/logo.png";

export async function readWatermarkLogo(db: SupabaseClient) {
  const { data } = await db.storage.from(MEDIA_ORIGINALS_BUCKET).download(LOGO_PATH);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}

export async function saveWatermarkLogo(db: SupabaseClient, file: File) {
  validateImageSize(file.size);
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { failOn: "error", limitInputPixels: 8_000_000 });
  const meta = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1) !== 1) {
    throw new Error("Upload a still JPG, PNG or WebP logo.");
  }
  const png = await image.rotate().resize({ width: 480, height: 240, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const { error } = await db.storage.from(MEDIA_ORIGINALS_BUCKET).upload(LOGO_PATH, png, {
    contentType: "image/png", upsert: true,
  });
  if (error) throw new Error("The logo could not be saved.");
}

async function archiveOriginal(db: SupabaseClient, key: string, bytes: Buffer, contentType: string) {
  const { error } = await db.storage.from(MEDIA_ORIGINALS_BUCKET).upload(key, bytes, {
    contentType, cacheControl: "0", upsert: false,
  });
  if (error) throw new Error("Could not save the private original. Use regeneration if this image was already processed.");
}

async function writeDerivatives(db: SupabaseClient, key: string, image: ProtectedImage, upsert: boolean) {
  const bucket = db.storage.from(MEDIA_DERIVATIVES_BUCKET);
  const options = { contentType: "image/webp", cacheControl: "60", upsert };
  const mobile = await bucket.upload("mobile/" + key, image.mobile, options);
  if (mobile.error) throw new Error("Could not save the mobile image.");
  const full = await bucket.upload(key, image.buffer, options);
  if (full.error) {
    if (!upsert) await bucket.remove(["mobile/" + key]);
    throw new Error("Could not save the protected image.");
  }
}

export async function archiveAndRender(
  db: SupabaseClient,
  key: string,
  bytes: Buffer,
  profile: MediaProfile,
  logo?: Buffer | null
) {
  if (!isOriginalKey(key)) throw new Error("Invalid image key.");
  validateImageSize(bytes.length);
  const image = await renderProtectedImage(bytes, profile, logo === undefined ? await readWatermarkLogo(db) : logo);
  await archiveOriginal(db, key, bytes, image.sourceType);
  return image;
}

export async function storeProtectedMedia(
  db: SupabaseClient,
  key: string,
  bytes: Buffer,
  profile: MediaProfile,
  logo?: Buffer | null
) {
  if (!isMediaKey(key)) throw new Error("Invalid protected image key.");
  const image = await archiveAndRender(db, key, bytes, profile, logo);
  try {
    await writeDerivatives(db, key, image, false);
    return mediaUrl(key);
  } catch (error) {
    await removeOriginal(db, key);
    throw error;
  }
}

export async function regenerateMedia(db: SupabaseClient, key: string, profile: MediaProfile, logo?: Buffer | null) {
  if (!isMediaKey(key)) throw new Error("Invalid protected image key.");
  const original = await db.storage.from(MEDIA_ORIGINALS_BUCKET).download(key);
  if (!original.data) throw new Error("A clean private original is required for regeneration.");
  const image = await renderProtectedImage(
    Buffer.from(await original.data.arrayBuffer()), profile, logo === undefined ? await readWatermarkLogo(db) : logo
  );
  await writeDerivatives(db, key, image, true);
}

export async function removeOriginal(db: SupabaseClient, key: string) {
  if (isOriginalKey(key)) await db.storage.from(MEDIA_ORIGINALS_BUCKET).remove([key]);
}

export async function removeProtectedMedia(db: SupabaseClient, key: string) {
  if (!isMediaKey(key)) return;
  const { error } = await db.storage.from(MEDIA_DERIVATIVES_BUCKET).remove([key, "mobile/" + key]);
  if (error) throw new Error("Image cleanup failed.");
  await removeOriginal(db, key);
}
