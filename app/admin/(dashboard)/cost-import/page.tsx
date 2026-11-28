import "server-only";

import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import CostImportClient from "./CostImportClient";

export const instant = false;

export default async function AdminCostImportPage() {
  await connection();
  await requireAdmin();
  const db = createServerClient();

  const { data: batches } = await db
    .from("cost_import_batches")
    .select("id, filename, row_count, status, created_by, created_at, applied_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#111111] tracking-tight">
          Manufacturing Cost Import
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Upload simplified final variant costs exported from Excel as CSV. Existing prices and audit history are preserved.
        </p>
      </div>

      <CostImportClient batches={batches ?? []} />
    </div>
  );
}
