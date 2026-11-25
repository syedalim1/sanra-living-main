"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { validateImageSize } from "@/lib/admin/validation";
import { createServerClient } from "@/lib/supabase/server";
import { MAX_PROJECT_PHOTOS, mediaKeyFromUrl, projectIdFromMediaKey } from "@/lib/media/paths";
import { readWatermarkLogo, removeProtectedMedia, storeProtectedMedia } from "@/lib/media/storage";
import type { MediaActionState } from "@/lib/admin/media-fields";

const fields = z.object({
  title: z.string().trim().min(3).max(120),
  product_type: z.string().trim().min(2).max(100),
  quantity: z.coerce.number().int().positive().max(1_000_000),
  location: z.string().trim().min(2).max(120),
  delivery_date: z.union([z.iso.date(), z.literal("")]),
  delivery_details: z.string().trim().max(800),
});

function planPhotos(form: FormData, saved: string[]) {
  const uploads = form.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
  if (!form.has("ordered_photos")) {
    const removed = new Set(form.getAll("remove_photo"));
    return [...saved.filter((url) => !removed.has(url)), ...uploads];
  }

  const available = new Map<string, string | File>(saved.map((url) => [url, url]));
  uploads.forEach((file, index) => available.set("upload:" + index, file));
  const order = form.getAll("photo_order");
  if (new Set(order).size !== order.length) throw new Error("List each photo once.");

  const photos = order.map((entry) => {
    const photo = typeof entry === "string" ? available.get(entry) : undefined;
    if (!photo) throw new Error("The photo order changed. Reload the editor and try again.");
    return photo;
  });
  if (photos.filter((photo) => photo instanceof File).length !== uploads.length) {
    throw new Error("Order all selected files before saving.");
  }
  return photos;
}

async function cleanProjectPhotos(db: ReturnType<typeof createServerClient>, id: string, urls: string[]) {
  const keys = urls.map(mediaKeyFromUrl).filter((key): key is string => key !== null && projectIdFromMediaKey(key) === id);
  const results = await Promise.allSettled([...new Set(keys)].map((key) => removeProtectedMedia(db, key)));
  return results.every((result) => result.status === "fulfilled");
}

function refreshProjects() {
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
}

export async function saveProjectAction(_: MediaActionState, form: FormData): Promise<MediaActionState> {
  const admin = await requireAdmin();
  const parsed = fields.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: "Check the project details and actual delivered quantity." };

  const existingId = String(form.get("id") ?? "").toLowerCase();
  const id = existingId || randomUUID();
  const revision = Number(form.get("revision") ?? 0);
  if (!z.uuid().safeParse(id).success || !Number.isSafeInteger(revision) || (existingId ? revision < 1 : revision !== 0)) {
    return { error: "Invalid project reference." };
  }

  const db = createServerClient();
  let saved: string[] = [];
  if (revision) {
    const { data, error } = await db.from("supply_projects").select("photo_urls").eq("id", id).eq("revision", revision).maybeSingle();
    if (error || !data) return { error: "This project changed. Reload it before saving." };
    saved = data.photo_urls.filter((url: string) => projectIdFromMediaKey(mediaKeyFromUrl(url) ?? "") === id);
  }

  const published = form.get("published") === "on";
  const generated: string[] = [];
  const ordered: string[] = [];
  let writeAttempted = false;
  try {
    const photos = planPhotos(form, saved);
    if (photos.length > MAX_PROJECT_PHOTOS) throw new Error("A project can have at most eight photographs.");
    if (published && !photos.length) throw new Error("Add an authentic project photograph before publishing.");
    if (published && form.get("approved") !== "on") throw new Error("Confirm these details and photos are approved for publication.");

    for (const photo of photos) {
      if (photo instanceof File) validateImageSize(photo.size);
    }
    const logo = photos.some((photo) => photo instanceof File) ? await readWatermarkLogo(db) : null;
    for (const photo of photos) {
      if (typeof photo === "string") {
        ordered.push(photo);
        continue;
      }
      const key = "project/" + id + "/photo-" + randomUUID() + ".webp";
      const url = await storeProtectedMedia(db, key, Buffer.from(await photo.arrayBuffer()), "project", logo);
      generated.push(url);
      ordered.push(url);
    }

    const record = {
      ...parsed.data,
      delivery_date: parsed.data.delivery_date || null,
      delivery_details: parsed.data.delivery_details || null,
      photo_urls: ordered,
      published,
      revision: revision + 1,
    };
    const query = revision
      ? db.from("supply_projects").update(record).eq("id", id).eq("revision", revision)
      : db.from("supply_projects").insert({ ...record, id });
    writeAttempted = true;
    const { data, error } = await query.select("id").maybeSingle();
    if (error || !data) throw new Error("The project could not be saved. Reload the editor and try again.");
  } catch (error) {
    if (generated.length) {
      if (writeAttempted) {
        // A lost response may follow a committed write. Keep any photo that might be referenced.
        const current = await db.from("supply_projects").select("photo_urls").eq("id", id).maybeSingle();
        if (!current.error) {
          await cleanProjectPhotos(db, id, generated.filter((url) => !current.data?.photo_urls.includes(url)));
        }
      } else {
        await cleanProjectPhotos(db, id, generated);
      }
    }
    return { error: error instanceof Error ? error.message : "Could not save the project." };
  }

  const cleaned = await cleanProjectPhotos(db, id, saved.filter((url) => !ordered.includes(url)));
  const audited = await writeAudit(db, admin.email, {
    action: revision ? "UPDATE" : "CREATE",
    target_table: "supply_projects",
    target_id: id,
    summary: published ? "Saved a published bulk supply project." : "Saved a draft bulk supply project.",
  }).then(() => true, () => false);
  refreshProjects();
  return { message: cleaned && audited ? "Project saved." : "Project saved. Check the audit log or storage cleanup." };
}

export async function deleteProjectAction(_: MediaActionState, form: FormData): Promise<MediaActionState> {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "").toLowerCase();
  const revision = Number(form.get("revision") ?? 0);
  if (!z.uuid().safeParse(id).success || !Number.isSafeInteger(revision) || revision < 1) {
    return { error: "Invalid project reference." };
  }
  if (form.get("confirm_delete") !== "on") return { error: "Confirm the permanent deletion." };

  const db = createServerClient();
  const { data, error } = await db.from("supply_projects").delete().eq("id", id).eq("revision", revision)
    .select("photo_urls").maybeSingle();
  if (error || !data) return { error: "The project could not be deleted. Reload the editor and try again." };

  const cleaned = await cleanProjectPhotos(db, id, data.photo_urls);
  const audited = await writeAudit(db, admin.email, {
    action: "DELETE",
    target_table: "supply_projects",
    target_id: id,
    summary: "Deleted a bulk supply project.",
  }).then(() => true, () => false);
  refreshProjects();
  return { message: cleaned && audited ? "Project deleted." : "Project deleted. Check the audit log or storage cleanup." };
}
