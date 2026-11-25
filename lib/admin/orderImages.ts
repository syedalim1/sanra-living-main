import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeStorageSegment } from "@/lib/admin/images";
import { archiveAndRender, removeOriginal } from "@/lib/media/storage";

export const ORDER_PHOTO_BUCKET = "order-photos";

export function buildOrderPhotoPath(
  trackingCode: string,
  prefix = "wip"
): string {
  const safeCode = sanitizeStorageSegment(trackingCode);
  return `orders/${safeCode}/${prefix}-${randomUUID()}.webp`;
}

export async function uploadOrderPhoto(
  db: SupabaseClient,
  path: string,
  buffer: Buffer
): Promise<void> {
  const key = "order/" + path;
  const processed = await archiveAndRender(db, key, buffer, "order");
  const { error } = await db.storage.from(ORDER_PHOTO_BUCKET).upload(path, processed.buffer, {
    contentType: "image/webp",
    cacheControl: "600",
    upsert: false,
  });

  if (error) {
    await removeOriginal(db, key);
    throw new Error("Order photo upload failed.");
  }
}

export async function removeOrderPhoto(
  db: SupabaseClient,
  path: string
): Promise<void> {
  const { error } = await db.storage.from(ORDER_PHOTO_BUCKET).remove([path]);
  if (error) throw new Error("Order photo cleanup failed.");
  await removeOriginal(db, "order/" + path);
}
