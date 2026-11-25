import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { legacyImagePath, mediaKeyFromUrl, profileForMediaKey } from "@/lib/media/paths";
import { removeProtectedMedia, storeProtectedMedia } from "@/lib/media/storage";
import { validateImageSize } from "@/lib/admin/validation";

export function sanitizeStorageSegment(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-").replace(/-+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 120) || "UNASSIGNED";
}

export function buildStoragePath(segment: string, prefix: string, group?: string): string {
  const safeGroup = group ? sanitizeStorageSegment(group) + "/" : "";
  return "products/" + safeGroup + sanitizeStorageSegment(segment) + "/" + prefix + "-" + randomUUID() + ".webp";
}

export async function uploadImageFile(db: SupabaseClient, path: string, file: File): Promise<string> {
  validateImageSize(file.size);
  const key = "catalog/" + path;
  return storeProtectedMedia(db, key, Buffer.from(await file.arrayBuffer()), profileForMediaKey(key));
}

export function isManagedImage(url: string | null | undefined, prefix: string): boolean {
  const path = mediaKeyFromUrl(url) ?? legacyImagePath(url);
  return Boolean(path?.split("/").at(-1)?.startsWith(prefix + "-"));
}

export async function removeStoredImage(db: SupabaseClient, url: string | null | undefined): Promise<void> {
  const path = legacyImagePath(url);
  const key = mediaKeyFromUrl(url) ?? (path ? "catalog/legacy/" + path : null);
  if (key) await removeProtectedMedia(db, key);
}
