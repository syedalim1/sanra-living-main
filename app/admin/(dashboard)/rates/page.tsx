import "server-only";

import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import RateMaster from "@/app/admin/(dashboard)/rates/RateMaster";
import type {
  GlobalRateRow,
  MaterialRateRow,
  OptionRateRow,
  PreviewOption,
  PreviewProduct,
} from "@/lib/admin/rates-types";

export const metadata = {
  title: "Rate Master | SANRA Internal",
};

export default async function RatesPage() {
  await connection();
  await requireAdmin();
  const db = createServerClient();

  const [materialResult, globalResult, optionResult, optionDefResult, productResult] =
    await Promise.all([
      db
        .from("material_rates")
        .select("id, material_code, display_name, category, unit, cost_per_unit, updated_at")
        .order("category")
        .order("display_name"),
      db
        .from("pricing_globals")
        .select("key, numeric_value, description, updated_at")
        .order("key"),
      db
        .from("option_pricing")
        .select("option_code, material_code, metal_cost_multiplier, flat_addon"),
      db
        .from("configurator_options")
        .select("option_group, option_code, parent_code, label_en")
        .eq("is_active", true)
        .order("sort_order"),
      db
        .from("products")
        .select("id, sku, name, allowed_top_categories")
        .eq("is_active", true)
        .eq("product_type", "TABLE")
        .order("sort_order"),
    ]);

  if (
    materialResult.error ||
    globalResult.error ||
    optionResult.error ||
    optionDefResult.error ||
    productResult.error
  ) {
    throw new Error("Unable to load rate master data.");
  }

  const materialRates: MaterialRateRow[] = (materialResult.data ?? [])
    .filter((row) => !row.material_code.startsWith("SHEET_"))
    .map((row) => ({
    id: row.id,
    material_code: row.material_code,
    display_name: row.display_name,
    category: row.category,
    unit: row.unit,
    cost_per_unit: Number(row.cost_per_unit),
    updated_at: row.updated_at,
  }));

  const globals: GlobalRateRow[] = (globalResult.data ?? []).map((row) => ({
    key: row.key,
    numeric_value: Number(row.numeric_value),
    description: row.description,
    updated_at: row.updated_at,
  }));

  const optionDefs = optionDefResult.data ?? [];
  const optionDefMap = new Map(optionDefs.map((row) => [row.option_code, row]));

  const editableOptionGroups: Record<string, "metal_cost_multiplier" | "flat_addon"> = {
    GAUGE: "metal_cost_multiplier",
    RACK_SIZE: "metal_cost_multiplier",
    THICKNESS: "metal_cost_multiplier",
    ADDON: "flat_addon",
    FRAME_COLOR: "flat_addon",
    SEAT_COLOR: "flat_addon",
    BASE: "flat_addon",
    FINISH: "flat_addon",
    SS_FINISH: "flat_addon",
  };

  const linkedOptionGroups = new Set([
    "FRAME_MATERIAL",
    "METAL_TYPE",
    "STAND_MATERIAL",
    "GRADE",
    "SEAT",
    "SHELF",
    "PACK",
    "BUILD_TYPE",
  ]);

  const options: OptionRateRow[] = [];

  for (const row of optionResult.data ?? []) {
    const definition = optionDefMap.get(row.option_code);
    if (!definition) continue;

    const editableField = editableOptionGroups[definition.option_group];

    if (editableField) {
      options.push({
        option_code: row.option_code,
        option_group: definition.option_group,
        label_en: definition.label_en,
        field: editableField,
        value: Number(row[editableField]),
        material_code: row.material_code ?? null,
      });
      continue;
    }

    if (linkedOptionGroups.has(definition.option_group)) {
      let note = "No direct option price.";

      if (["FRAME_MATERIAL", "METAL_TYPE", "STAND_MATERIAL", "GRADE", "SEAT", "SHELF"].includes(definition.option_group)) {
        note = `Linked to material rate: ${row.material_code ?? "—"}`;
      } else if (definition.option_group === "PACK") {
        note = "Pack saving is managed in Global Pricing Values";
      }

      options.push({
        option_code: row.option_code,
        option_group: definition.option_group,
        label_en: definition.label_en,
        field: null,
        value: 0,
        material_code: row.material_code ?? null,
        note,
      });
    }
  }

  options.sort((a, b) =>
    `${a.option_group}:${a.label_en}`.localeCompare(`${b.option_group}:${b.label_en}`)
  );

  const toPreviewOptions = (group: string): PreviewOption[] =>
    optionDefs
      .filter((row) => row.option_group === group)
      .map((row) => ({
        option_code: row.option_code,
        label_en: row.label_en,
        parent_code: row.parent_code ?? null,
      }));

  const previewProducts: PreviewProduct[] = (productResult.data ?? []).map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    allowed_top_categories: Array.isArray(row.allowed_top_categories)
      ? (row.allowed_top_categories as string[])
      : [],
  }));

  return (
    <RateMaster
      materialRates={materialRates}
      globals={globals}
      options={options}
      previewProducts={previewProducts}
      previewSizes={toPreviewOptions("SIZE")}
      previewTopTabs={toPreviewOptions("TOP_TAB")}
      previewMaterials={toPreviewOptions("TOP_MATERIAL")}
      previewGauges={toPreviewOptions("GAUGE")}
    />
  );
}
