import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhotoRecord, SignedPhoto } from "@/lib/tracking/types";

export const ORDER_PHOTO_BUCKET = "order-photos";
export const ORDER_PHOTO_SIGNED_URL_TTL = 600;

export async function signOrderPhotoRecords(
  db: SupabaseClient,
  photos: PhotoRecord[],
  expiresIn = ORDER_PHOTO_SIGNED_URL_TTL
): Promise<Array<PhotoRecord & { signed_url: string }>> {
  if (photos.length === 0) return [];

  const paths = photos.map((photo) => photo.storage_path);
  const { data, error } = await db.storage
    .from(ORDER_PHOTO_BUCKET)
    .createSignedUrls(paths, expiresIn);

  if (error || !data) return [];

  const photoByPath = new Map(photos.map((photo) => [photo.storage_path, photo]));

  return data.flatMap((entry) => {
    if (!entry.path || !entry.signedUrl) return [];
    const photo = photoByPath.get(entry.path);
    if (!photo) return [];
    return [{ ...photo, signed_url: entry.signedUrl }];
  });
}

export async function signOrderPhotoUrls(
  db: SupabaseClient,
  photos: PhotoRecord[],
  expiresIn = ORDER_PHOTO_SIGNED_URL_TTL
): Promise<SignedPhoto[]> {
  const signed = await signOrderPhotoRecords(db, photos, expiresIn);
  return signed.map((photo) => ({
    url: photo.signed_url,
    caption: photo.caption,
  }));
}
