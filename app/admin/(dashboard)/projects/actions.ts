"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { validateImageSize } from "@/lib/admin/validation";
import { createServerClient } from "@/lib/supabase/server";
import { mediaKeyFromUrl } from "@/lib/media/paths";
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

export async function saveProjectAction(_: MediaActionState, form: FormData): Promise<MediaActionState> {
  const admin = await requireAdmin();
  const submitted = Object.fromEntries(form.entries());
  const parsed = fields.safeParse(submitted);
  if (!parsed.success) return { error: "Check the project details and actual delivered quantity." };

  const id = String(form.get("id") ?? "") || randomUUID();
  const revision = Number(form.get("revision") ?? 0);
  if (!z.uuid().safeParse(id).success || !Number.isSafeInteger(revision) || revision < 0) {
    return { error: "Invalid project reference." };
  }

  const db = createServerClient();
  let photoUrls: string[] = [];
  if (revision) {
    const { data, error } = await db.from("supply_projects").select("photo_urls").eq("id", id).eq("revision", revision).maybeSingle();
    if (error || !data) return { error: "This project changed. Reload it before saving." };
    photoUrls = data.photo_urls;
  }

  const removal = new Set(form.getAll("remove_photo"));
  const retained = photoUrls.filter((url) => !removal.has(url));
  const uploads = form.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
  const published = form.get("published") === "on";
  if (retained.length + uploads.length > 8) return { error: "A project can have at most eight photographs." };
  if (published && !retained.length && !uploads.length) return { error: "Add an authentic project photograph before publishing." };
  if (published && form.get("approved") !== "on") return { error: "Confirm these details and photos are approved for publication." };

  const generated: string[] = [];
  try {
    if (uploads.length) {
      const logo = await readWatermarkLogo(db);
      for (const file of uploads) {
        validateImageSize(file.size);
        const key = "project/" + id + "/photo-" + randomUUID() + ".webp";
        generated.push(await storeProtectedMedia(db, key, Buffer.from(await file.arrayBuffer()), "project", logo));
      }
    }

    const record = {
      ...parsed.data,
      delivery_date: parsed.data.delivery_date || null,
      delivery_details: parsed.data.delivery_details || null,
      photo_urls: [...retained, ...generated],
      published,
      revision: revision + 1,
    };
    const query = revision
      ? db.from("supply_projects").update(record).eq("id", id).eq("revision", revision)
      : db.from("supply_projects").insert({ ...record, id });
    const { data, error } = await query.select("id").maybeSingle();
    if (error || !data) throw new Error("The project could not be saved. Reload the editor and try again.");
  } catch (error) {
    await Promise.allSettled(generated.map((url) => removeProtectedMedia(db, mediaKeyFromUrl(url) ?? "")));
    return { error: error instanceof Error ? error.message : "Could not save the project." };
  }

  const cleanup = await Promise.allSettled(photoUrls.filter((url) => removal.has(url))
    .map((url) => removeProtectedMedia(db, mediaKeyFromUrl(url) ?? "")));
  const audited = await writeAudit(db, admin.email, {
    action: revision ? "UPDATE" : "CREATE",
    target_table: "supply_projects",
    target_id: id,
    summary: published ? "Saved a published bulk supply project." : "Saved a draft bulk supply project.",
  }).then(() => true, () => false);
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  const issue = cleanup.some((result) => result.status === "rejected") || !audited;
  return { message: issue ? "Project saved. Check the audit log or storage cleanup." : "Project saved." };
}
