"use server";

import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/admin/audit";
import {
  RateSaveInputSchema,
  formatRateNumber,
  isLargeRateChange,
} from "@/lib/admin/validation";
import { calculateConfigPrice } from "@/lib/pricing/configPrice";

interface ActionResult {
  ok: boolean;
  error?: string;
  updated?: number;
}

const PreviewInputSchema = z.object({
  productId: z.string().uuid(),
  size: z.string().min(1).max(20),
  top_tab: z.string().min(1).max(30),
  top_material: z.string().nullable().optional(),
  gauge: z.string().min(1).max(20),
});

export async function saveRatesAction(input: unknown): Promise<ActionResult> {
  const session = await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = RateSaveInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Check the highlighted values and try again." };
    }

    const [materialResult, globalResult, optionResult, optionDefResult] = await Promise.all([
      db.from("material_rates").select("material_code, cost_per_unit"),
      db.from("pricing_globals").select("key, numeric_value"),
      db.from("option_pricing").select("option_code, metal_cost_multiplier, flat_addon"),
      db.from("configurator_options").select("option_code, option_group"),
    ]);

    if (
      materialResult.error ||
      globalResult.error ||
      optionResult.error ||
      optionDefResult.error
    ) {
      return { ok: false, error: "Unable to load current rates. Please try again." };
    }

    const materialMap = new Map(
      (materialResult.data ?? []).map((row) => [row.material_code, Number(row.cost_per_unit)])
    );
    const globalMap = new Map(
      (globalResult.data ?? []).map((row) => [row.key, Number(row.numeric_value)])
    );
    const optionGroupMap = new Map(
      (optionDefResult.data ?? []).map((row) => [row.option_code, row.option_group])
    );
    const optionMap = new Map(
      (optionResult.data ?? []).map((row) => [
        row.option_code,
        {
          metal_cost_multiplier: Number(row.metal_cost_multiplier),
          flat_addon: Number(row.flat_addon),
        },
      ])
    );

    const materialChanges = parsed.data.materialRates
      .map((change) => {
        const oldValue = materialMap.get(change.code);
        if (oldValue === undefined || oldValue === change.value) return null;
        return { code: change.code, oldValue, newValue: change.value };
      })
      .filter((change): change is { code: string; oldValue: number; newValue: number } =>
        Boolean(change)
      );

    const globalChanges = parsed.data.globals
      .map((change) => {
        const oldValue = globalMap.get(change.key);
        if (oldValue === undefined || oldValue === change.value) return null;
        return { key: change.key, oldValue, newValue: change.value };
      })
      .filter((change): change is { key: string; oldValue: number; newValue: number } =>
        Boolean(change)
      );

    const optionChanges = parsed.data.options
      .map((change) => {
        const group = optionGroupMap.get(change.code);
        const current = optionMap.get(change.code);
        if (!group || !current) return null;

        const multiplierGroups = new Set(["GAUGE", "RACK_SIZE", "THICKNESS"]);
        const flatGroups = new Set([
          "ADDON",
          "FRAME_COLOR",
          "SEAT_COLOR",
          "BASE",
          "FINISH",
          "SS_FINISH",
        ]);

        const allowed =
          (multiplierGroups.has(group) && change.field === "metal_cost_multiplier") ||
          (flatGroups.has(group) && change.field === "flat_addon");

        if (!allowed) return null;

        const oldValue = current[change.field];
        if (oldValue === change.value) return null;
        return { code: change.code, field: change.field, oldValue, newValue: change.value };
      })
      .filter(
        (change): change is {
          code: string;
          field: "metal_cost_multiplier" | "flat_addon";
          oldValue: number;
          newValue: number;
        } => Boolean(change)
      );

    const totalChanges =
      materialChanges.length + globalChanges.length + optionChanges.length;

    if (totalChanges === 0) {
      return { ok: true, updated: 0 };
    }

    if (!parsed.data.confirmLarge) {
      const large = [
        ...materialChanges.map((change) => isLargeRateChange(change.oldValue, change.newValue)),
        ...globalChanges.map((change) => isLargeRateChange(change.oldValue, change.newValue)),
        ...optionChanges.map((change) => isLargeRateChange(change.oldValue, change.newValue)),
      ].some(Boolean);

      if (large) {
        return {
          ok: false,
          error: "A change is over 40%. Tick the large-change confirmation and try again.",
        };
      }
    }

    let updated = 0;

    for (const change of materialChanges) {
      const { error } = await db
        .from("material_rates")
        .update({
          cost_per_unit: change.newValue,
          updated_at: new Date().toISOString(),
        })
        .eq("material_code", change.code);

      if (error) {
        return { ok: false, error: "Unable to update one or more material rates." };
      }

      await writeAudit(db, session.email, {
        action: "UPDATE",
        target_table: "material_rates",
        target_id: change.code,
        summary: `Rate ${change.code} ${formatRateNumber(change.oldValue)} -> ${formatRateNumber(change.newValue)}`,
      });
      updated += 1;
    }

    for (const change of globalChanges) {
      const { error } = await db
        .from("pricing_globals")
        .update({
          numeric_value: change.newValue,
          updated_at: new Date().toISOString(),
        })
        .eq("key", change.key);

      if (error) {
        return { ok: false, error: "Unable to update one or more global values." };
      }

      await writeAudit(db, session.email, {
        action: "UPDATE",
        target_table: "pricing_globals",
        target_id: change.key,
        summary: `Global ${change.key} ${formatRateNumber(change.oldValue)} -> ${formatRateNumber(change.newValue)}`,
      });
      updated += 1;
    }

    for (const change of optionChanges) {
      const { error } = await db
        .from("option_pricing")
        .update({ [change.field]: change.newValue })
        .eq("option_code", change.code);

      if (error) {
        return { ok: false, error: "Unable to update one or more option prices." };
      }

      const label = change.field === "flat_addon" ? "Add-on" : "Gauge";
      await writeAudit(db, session.email, {
        action: "UPDATE",
        target_table: "option_pricing",
        target_id: change.code,
        summary: `${label} ${change.code} ${formatRateNumber(change.oldValue)} -> ${formatRateNumber(change.newValue)}`,
      });
      updated += 1;
    }

    revalidateTag("sanra-from-prices", { expire: 0 });
    revalidatePath("/products");
    revalidatePath("/products/[sku]", "page");
    revalidatePath("/admin/rates");
    revalidatePath("/admin/audit");

    return { ok: true, updated };
  } catch {
    return { ok: false, error: "Unable to save rates. Please try again." };
  }
}

export async function previewPriceAction(input: unknown) {
  await requireAdmin();
  const db = createServerClient();

  try {
    const parsed = PreviewInputSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Select a valid product, size, top and gauge." };
    }

    const { data: product, error } = await db
      .from("products")
      .select("sku, allowed_top_categories")
      .eq("id", parsed.data.productId)
      .maybeSingle();

    if (error || !product) {
      return { ok: false, error: "Product not found." };
    }

    const allowed = Array.isArray(product.allowed_top_categories)
      ? (product.allowed_top_categories as string[])
      : [];

    if (!allowed.includes(parsed.data.top_tab)) {
      return { ok: false, error: "That top category is not allowed for this product." };
    }

    const price = await calculateConfigPrice({
      sku: product.sku,
      top_tab: parsed.data.top_tab,
      top_material:
        parsed.data.top_tab === "FRAME_ONLY" ? null : (parsed.data.top_material ?? null),
      gauge: parsed.data.gauge,
      frame_color: "MATTE_BLACK",
      build_type: "WELDED",
      size: parsed.data.size,
      addons: [],
      quantity: 1,
    });

    return {
      ok: true,
      unit_price: price.unit_price ?? null,
      total_price: price.total_price ?? null,
      requires_quote: Boolean(price.requires_quote),
    };
  } catch {
    return { ok: false, error: "Unable to preview this configuration." };
  }
}
