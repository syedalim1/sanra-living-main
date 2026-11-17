import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const CAD_BUCKET = "cad-files";

export function buildCadPath(extension: "skp" | "dwg"): string {
  return `cad/${randomUUID()}.${extension}`;
}

export async function uploadCadFile(
  db: SupabaseClient,
  path: string,
  buffer: Buffer
): Promise<void> {
  const { error } = await db.storage.from(CAD_BUCKET).upload(path, buffer, {
    contentType: "application/octet-stream",
    cacheControl: "300",
    upsert: false,
  });

  if (error) throw new Error("CAD upload failed.");
}

export async function removeCadFile(
  db: SupabaseClient,
  path: string
): Promise<void> {
  const { error } = await db.storage.from(CAD_BUCKET).remove([path]);
  if (error) throw new Error("CAD file cleanup failed.");
}
