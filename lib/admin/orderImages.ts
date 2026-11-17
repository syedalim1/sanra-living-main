import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeStorageSegment } from "@/lib/admin/images";

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
  const { error } = await db.storage.from(ORDER_PHOTO_BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    cacheControl: "600",
    upsert: false,
  });

  if (error) throw new Error("Order photo upload failed.");
}

export async function removeOrderPhoto(
  db: SupabaseClient,
  path: string
): Promise<void> {
  const { error } = await db.storage.from(ORDER_PHOTO_BUCKET).remove([path]);
  if (error) throw new Error("Order photo cleanup failed.");
}
