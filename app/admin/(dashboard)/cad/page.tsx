import "server-only";

import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import CadManager from "@/app/admin/(dashboard)/cad/CadManager";
import type { AdminCadFile } from "@/lib/admin/cad-types";

export const metadata = {
  title: "CAD Files | SANRA Internal",
};

export default async function AdminCadPage() {
  await connection();
  await requireAdmin();
  const db = createServerClient();

  const [fileResult, productResult] = await Promise.all([
    db
      .from("cad_files")
      .select("id, title, description, file_type, product_sku, is_active, created_at")
      .order("created_at", { ascending: false }),
    db.from("products").select("sku, name").order("sort_order"),
  ]);

  if (fileResult.error) {
    throw new Error("Unable to load CAD files.");
  }

  const files: AdminCadFile[] = (fileResult.data ?? []).map((file) => ({
    id: file.id,
    title: file.title,
    description: file.description ?? null,
    file_type: file.file_type as "SKP" | "DWG",
    product_sku: file.product_sku ?? null,
    is_active: Boolean(file.is_active),
    created_at: file.created_at,
  }));

  return (
    <div className="space-y-6 pb-12">
      <div>
        <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded">
          CAD Library
        </span>
        <h1 className="text-2xl font-black text-[#111111] tracking-tight mt-3">
          CAD & SketchUp Files
        </h1>
        <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
          Upload private .skp or .dwg models. The public page shows metadata only;
          downloads use a short-lived signed URL after a lead is saved.
        </p>
      </div>

      <CadManager
        files={files}
        products={productResult.data ?? []}
      />
    </div>
  );
}
