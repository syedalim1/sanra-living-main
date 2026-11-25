"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { validateImageSize } from "@/lib/admin/validation";
import { isLegacyImagePath, legacyImagePath, mediaKeyFromUrl, profileForMediaKey } from "@/lib/media/paths";
import { readWatermarkLogo, regenerateMedia, saveWatermarkLogo, storeProtectedMedia } from "@/lib/media/storage";
import { renderProtectedImage } from "@/lib/media/watermark";
import type { MediaActionState } from "@/lib/admin/media-fields";

function message(error: unknown) {
  return error instanceof Error ? error.message : "Image processing failed.";
}

export async function previewMediaAction(_: MediaActionState, form: FormData): Promise<MediaActionState> {
  await requireAdmin();
  const file = form.get("photo");
  if (!(file instanceof File)) return { error: "Choose an image." };
  const profile = form.get("profile");
  if (profile !== "catalog" && profile !== "project" && profile !== "order" && profile !== "swatch") {
    return { error: "Choose a watermark profile." };
  }

  try {
    validateImageSize(file.size);
    const logo = await readWatermarkLogo(createServerClient());
    const image = await renderProtectedImage(Buffer.from(await file.arrayBuffer()), profile, logo);
    return { preview: "data:image/webp;base64," + image.mobile.toString("base64") };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function saveLogoAction(_: MediaActionState, form: FormData): Promise<MediaActionState> {
  await requireAdmin();
  const logo = form.get("logo");
  if (!(logo instanceof File) || !logo.size) return { error: "Choose the original brand logo." };
  try {
    await saveWatermarkLogo(createServerClient(), logo);
    return { message: "Logo saved. New and regenerated images will use it." };
  } catch (error) {
    return { error: message(error) };
  }
}

export async function batchMediaAction(_: MediaActionState, form: FormData): Promise<MediaActionState> {
  await requireAdmin();
  const entries = String(form.get("entries") ?? "").split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
  if (entries.length < 1 || entries.length > 12) return { error: "Enter 1–12 image references." };
  const uploads = form.getAll("originals").filter((file): file is File => file instanceof File && file.size > 0);
  const byName = new Map(uploads.map((file) => [file.name, file]));
  if (byName.size !== uploads.length) return { error: "Give each original a distinct filename." };
  if (uploads.length && form.get("clean_sources") !== "on") return { error: "Confirm the replacement sources are clean originals." };

  const instructions = [];
  for (const entry of entries) {
    const assignment = entry.match(/^([^=]+)\s*=\s*(\S+)$/);
    const file = assignment ? byName.get(assignment[1].trim()) : undefined;
    const ref = assignment ? assignment[2] : entry;
    const legacy = legacyImagePath(ref) ?? (isLegacyImagePath(ref) ? ref : null);
    const key = mediaKeyFromUrl(ref) ?? (legacy ? "catalog/legacy/" + legacy : null);
    if (!key || (assignment && (!file || !key.startsWith("catalog/legacy/")))) {
      return { error: "Use a protected image URL, or match clean originals to legacy storage paths using filename=path." };
    }
    if (file) byName.delete(file.name);
    instructions.push({ key, file, entry });
  }
  if (byName.size) return { error: "Map every selected original to its matching legacy reference." };
  if (new Set(instructions.map(({ key }) => key)).size !== instructions.length) return { error: "List each image once." };

  const db = createServerClient();
  const logo = await readWatermarkLogo(db);
  const failures: string[] = [];
  let completed = 0;

  for (const { key, file, entry } of instructions) {
    try {
      const profile = profileForMediaKey(key);
      if (file) {
        validateImageSize(file.size);
        await storeProtectedMedia(db, key, Buffer.from(await file.arrayBuffer()), profile, logo);
      } else {
        await regenerateMedia(db, key, profile, logo);
      }
      completed++;
    } catch (error) {
      failures.push(entry + " — " + message(error));
    }
  }

  return { message: completed + " image(s) processed.", resume: failures };
}
