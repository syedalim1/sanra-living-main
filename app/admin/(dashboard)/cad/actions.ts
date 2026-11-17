"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/admin/audit";
import {
  CadFileDeleteSchema,
  CadFileMetaSchema,
  MAX_CAD_FILE_BYTES,
  cadExtension,
} from "@/lib/admin/cadValidation";
import {
  buildCadPath,
  removeCadFile,
  uploadCadFile,
} from "@/lib/admin/cadStorage";
import { stripHtml } from "@/lib/b2b/leads";
import { formString, parseBoolean } from "@/lib/admin/validation";
import type { CadActionResult } from "@/lib/admin/cad-types";

function revalidateCad(): void {
  revalidatePath("/admin/cad");
  revalidatePath("/b2b");
  revalidatePath("/admin/audit");
}

export async function saveCadFileAction(
  _prevState: CadActionResult,
  formData: FormData
): Promise<CadActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const rawId = formString(formData.get("file_id"));
    const parsed = CadFileMetaSchema.safeParse({
      file_id: rawId || null,
      title: formString(formData.get("title")),
      description: formString(formData.get("description")),
      file_type: formString(formData.get("file_type")),
      product_sku: formString(formData.get("product_sku")),
      is_active: parseBoolean(formData.get("is_active")),
    });

    if (!parsed.success) {
      return { ok: false, error: "Check the CAD file details." };
    }

    const file = formData.get("file");
    const hasFile = file instanceof File && file.size > 0;

    let existing: {
      id: string;
      storage_path: string;
    } | null = null;

    if (parsed.data.file_id) {
      const { data, error } = await db
        .from("cad_files")
        .select("id, storage_path")
        .eq("id", parsed.data.file_id)
        .maybeSingle();

      if (error || !data) {
        return { ok: false, error: "CAD file not found." };
      }
      existing = data;
    }

    if (!existing && !hasFile) {
      return { ok: false, error: "Choose a .skp or .dwg file." };
    }

    let newPath: string | null = null;

    if (hasFile) {
      if (file.size > MAX_CAD_FILE_BYTES) {
        return { ok: false, error: "CAD files must be 50 MB or smaller." };
      }

      const extension = cadExtension(file.name);
      if (!extension) {
        return { ok: false, error: "Only .skp and .dwg files are accepted." };
      }

      if (extension.toUpperCase() !== parsed.data.file_type) {
        return {
          ok: false,
          error: "The file extension must match the selected file type.",
        };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      newPath = buildCadPath(extension);
      await uploadCadFile(db, newPath, buffer);
    }

    const metadata = {
      title: stripHtml(parsed.data.title),
      description: stripHtml(parsed.data.description) || null,
      file_type: parsed.data.file_type,
      product_sku: parsed.data.product_sku || null,
      is_active: parsed.data.is_active,
    };

    if (existing) {
      const update = newPath
        ? { ...metadata, storage_path: newPath }
        : metadata;

      const { error } = await db
        .from("cad_files")
        .update(update)
        .eq("id", existing.id);

      if (error) {
        if (newPath) await removeCadFile(db, newPath).catch(() => undefined);
        return { ok: false, error: "Unable to update the CAD file." };
      }

      if (newPath) {
        await removeCadFile(db, existing.storage_path).catch(() => undefined);
      }

      await writeAudit(db, session.email, {
        action: "UPDATE",
        target_table: "cad_files",
        target_id: existing.id,
        summary: `CAD file ${metadata.title} ${newPath ? "replaced" : "updated"}`,
      });

      revalidateCad();
      return { ok: true, id: existing.id };
    }

    const { data: inserted, error } = await db
      .from("cad_files")
      .insert({
        ...metadata,
        storage_path: newPath,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      if (newPath) await removeCadFile(db, newPath).catch(() => undefined);
      return { ok: false, error: "Unable to save the CAD file." };
    }

    await writeAudit(db, session.email, {
      action: "CREATE",
      target_table: "cad_files",
      target_id: inserted.id,
      summary: `CAD file ${metadata.title} uploaded`,
    });

    revalidateCad();
    return { ok: true, id: inserted.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save the CAD file.";
    return { ok: false, error: message };
  }
}

export async function deleteCadFileAction(
  _prevState: CadActionResult,
  formData: FormData
): Promise<CadActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = CadFileDeleteSchema.safeParse({
      file_id: formString(formData.get("file_id")),
    });

    if (!parsed.success) {
      return { ok: false, error: "Invalid CAD file." };
    }

    const { data: file, error } = await db
      .from("cad_files")
      .select("id, title, storage_path")
      .eq("id", parsed.data.file_id)
      .maybeSingle();

    if (error || !file) {
      return { ok: false, error: "CAD file not found." };
    }

    await removeCadFile(db, file.storage_path);

    const { error: deleteError } = await db
      .from("cad_files")
      .delete()
      .eq("id", file.id);

    if (deleteError) {
      return { ok: false, error: "Unable to delete the CAD file record." };
    }

    await writeAudit(db, session.email, {
      action: "DELETE",
      target_table: "cad_files",
      target_id: file.id,
      summary: `CAD file ${file.title} deleted`,
    });

    revalidateCad();
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to delete the CAD file." };
  }
}
