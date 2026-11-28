"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { createServerClient } from "@/lib/supabase/server";
import {
  applyCostImportBatch,
  invalidatePricingCaches,
  stageCostImport,
  type CostImportPreviewResult,
} from "@/lib/pricing/costImport";
import { evaluateVariantPricing } from "@/lib/pricing/variantPricingEngine";

export interface CostImportActionState {
  ok?: boolean;
  error?: string;
  preview?: CostImportPreviewResult & {
    duplicateBatchWarning?: boolean;
    priceImpacts: Record<
      string,
      { oldSellingPrice: number | null; newSellingPrice: number | null }
    >;
  };
  appliedCount?: number;
}

export async function stageCostImportAction(
  _prev: CostImportActionState,
  formData: FormData
): Promise<CostImportActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please select a CSV file to upload." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "CSV file must be 2 MB or smaller." };
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".csv")) {
    return {
      ok: false,
      error:
        "Only .csv files are supported. In Excel, use File → Save As → CSV (Comma delimited) (.csv) and upload that file.",
    };
  }

  try {
    const csvText = await file.text();
    const preview = await stageCostImport({
      filename: file.name,
      csvText,
      actorEmail: session.email,
    });

    // Check for prior APPLIED batch with the same checksum to warn against duplicate imports
    const { data: prior } = await db
      .from("cost_import_batches")
      .select("id")
      .eq("checksum", preview.checksum)
      .eq("status", "APPLIED")
      .neq("id", preview.batch_id)
      .limit(1);

    // Compute expected selling-price impact for valid matched variants
    const validCodes = preview.rows
      .filter((r) => !r.validation_error && r.variant_code)
      .map((r) => r.variant_code as string);

    const priceImpacts: Record<
      string,
      { oldSellingPrice: number | null; newSellingPrice: number | null }
    > = {};

    if (validCodes.length > 0) {
      const { data: variants } = await db
        .from("product_variants")
        .select("id, variant_code, availability, lead_time_days, size_code")
        .in("variant_code", validCodes);

      const variantIds = (variants ?? []).map((v) => v.id as string);
      const { data: pricings } = await db
        .from("variant_pricing_private")
        .select("*")
        .in("variant_id", variantIds);

      const profileIds = [
        ...new Set(
          (pricings ?? [])
            .map((p) => p.pricing_profile_id as string | null)
            .filter(Boolean) as string[]
        ),
      ];
      const { data: profiles } =
        profileIds.length > 0
          ? await db.from("pricing_profiles").select("*").in("id", profileIds)
          : { data: [] as Record<string, unknown>[] };

      const pricingByVariant = new Map(
        (pricings ?? []).map((p) => [p.variant_id as string, p])
      );
      const profileById = new Map(
        (profiles ?? []).map((p) => [p.id as string, p])
      );
      const variantByCode = new Map(
        (variants ?? []).map((v) => [v.variant_code as string, v])
      );

      for (const row of preview.rows) {
        if (row.validation_error || !row.variant_code || row.new_cost == null) continue;
        const v = variantByCode.get(row.variant_code);
        if (!v) continue;
        const vp = pricingByVariant.get(v.id as string) ?? null;
        const profile =
          vp?.pricing_profile_id ? profileById.get(vp.pricing_profile_id as string) ?? null : null;

        const baseParams = {
          variantId: v.id as string,
          variantCode: v.variant_code as string,
          availability: v.availability,
          leadTimeDays: v.lead_time_days != null ? Number(v.lead_time_days) : null,
          sizeCode: v.size_code as string,
          quantity: 1,
          profile: profile as never,
          bulkRule: null,
          tiers: [],
        };

        const oldEval = evaluateVariantPricing({
          ...baseParams,
          pricing: vp as never,
        });
        const newEval = evaluateVariantPricing({
          ...baseParams,
          pricing: vp
            ? ({ ...vp, manufacturing_cost: row.new_cost, cost_source: "EXCEL_IMPORT" } as never)
            : null,
        });

        priceImpacts[row.variant_code] = {
          oldSellingPrice: oldEval.unit_price,
          newSellingPrice: newEval.unit_price,
        };
      }
    }

    await writeAudit(db, session.email, {
      action: "STAGE_COST_IMPORT",
      target_table: "cost_import_batches",
      target_id: preview.batch_id,
      summary: `Staged ${preview.valid_rows}/${preview.total_rows} cost rows from ${preview.filename}`,
    });

    revalidatePath("/admin/cost-import");

    return {
      ok: true,
      preview: {
        ...preview,
        duplicateBatchWarning: (prior?.length ?? 0) > 0,
        priceImpacts,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to parse CSV file.",
    };
  }
}

const ApplyBatchSchema = z.object({
  batch_id: z.string().uuid(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function applyCostImportAction(
  _prev: CostImportActionState,
  formData: FormData
): Promise<CostImportActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const parsed = ApplyBatchSchema.safeParse({
    batch_id: formData.get("batch_id"),
    effective_from: formData.get("effective_from") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid batch confirmation request." };
  }

  try {
    const effectiveDate =
      parsed.data.effective_from ?? new Date().toISOString().slice(0, 10);

    // Prefer atomic transactional RPC; fall back to service helper if RPC not yet deployed.
    const { data: rpcCount, error: rpcErr } = await db.rpc(
      "apply_cost_import_batch_tx",
      {
        p_batch_id: parsed.data.batch_id,
        p_actor_email: session.email,
        p_effective_from: effectiveDate,
      }
    );

    let appliedRows = 0;
    if (!rpcErr && typeof rpcCount === "number") {
      appliedRows = rpcCount;
      invalidatePricingCaches();
    } else {
      const res = await applyCostImportBatch({
        batchId: parsed.data.batch_id,
        actorEmail: session.email,
        effectiveFrom: effectiveDate,
      });
      appliedRows = res.appliedRows;
    }

    await writeAudit(db, session.email, {
      action: "APPLY_COST_IMPORT",
      target_table: "cost_import_batches",
      target_id: parsed.data.batch_id,
      summary: `Applied ${appliedRows} manufacturing cost updates`,
    });

    revalidatePath("/admin/cost-import");
    revalidatePath("/admin/products");
    revalidatePath("/products");

    return { ok: true, appliedCount: appliedRows };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to apply cost import.",
    };
  }
}
