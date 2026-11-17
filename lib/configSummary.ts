import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { FALLBACK_OPTIONS, type ConfigOption } from "@/lib/configuratorOptions";
import type { ConfigPriceInput } from "@/lib/schemas";
import { stripCostFragments } from "@/lib/sanitize";

export interface ConfigSummary {
  product_name: string;
  sku: string;
  size_label: string;
  top_tab_label: string;
  top_material_label: string | null;
  top_label: string;
  gauge_code: string;
  gauge_label: string;
  gauge_load_kg: number | null;
  gauge_warranty: string | null;
  frame_color_label: string;
  build_label: string;
  addons_labels: string[];
  quantity: number;
  is_stone: boolean;
  is_stainless: boolean;
}

const FALLBACK_PRODUCT_NAMES: Record<string, string> = {
  "IMS-CF-42": "Commercial Heavy-Gauge Cafe Table (4x2 ft)",
  "IMS-WS-425": "Zero-Shake Modular Office Workstation (4x2.5 ft)",
  "IMS-DN-63": "Industrial Grade 6-Seater Dining Table (6x3 ft)",
};

function humanize(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findOption(options: ConfigOption[], group: string, code: string | null | undefined): ConfigOption | undefined {
  if (!code) return undefined;
  return options.find((option) => option.option_group === group && option.option_code === code);
}

function labelFor(options: ConfigOption[], group: string, code: string | null | undefined): string {
  const option = findOption(options, group, code);
  return stripCostFragments(option?.label_en || humanize(code || ""));
}

export async function getConfigSummary(input: ConfigPriceInput): Promise<ConfigSummary> {
  let options: ConfigOption[] = FALLBACK_OPTIONS;
  let productName = FALLBACK_PRODUCT_NAMES[input.sku] || input.sku;

  try {
    const { data: optionRows } = await supabaseServer
      .from("configurator_options")
      .select("option_group, option_code, parent_code, label_en, load_kg, warranty_text")
      .eq("is_active", true);

    if (optionRows && optionRows.length > 0) {
      options = optionRows as ConfigOption[];
    }
  } catch {
    options = FALLBACK_OPTIONS;
  }

  try {
    const { data: productRow } = await supabaseServer
      .from("products")
      .select("name")
      .eq("sku", input.sku)
      .maybeSingle();

    if (productRow?.name) {
      productName = productRow.name;
    }
  } catch {
    productName = FALLBACK_PRODUCT_NAMES[input.sku] || input.sku;
  }

  const topTabLabel = labelFor(options, "TOP_TAB", input.top_tab);
  const topMaterialLabel =
    input.top_tab === "FRAME_ONLY" ? null : labelFor(options, "TOP_MATERIAL", input.top_material);
  const gaugeOption = findOption(options, "GAUGE", input.gauge);
  const isStainless = input.gauge === "SS202" || input.gauge === "SS304";

  return {
    product_name: productName,
    sku: input.sku,
    size_label: labelFor(options, "SIZE", input.size),
    top_tab_label: topTabLabel,
    top_material_label: topMaterialLabel,
    top_label: topMaterialLabel ? `${topTabLabel} — ${topMaterialLabel}` : topTabLabel,
    gauge_code: input.gauge,
    gauge_label: labelFor(options, "GAUGE", input.gauge),
    gauge_load_kg: gaugeOption?.load_kg ?? null,
    gauge_warranty: gaugeOption?.warranty_text ?? null,
    frame_color_label: isStainless
      ? "Natural Stainless Steel Finish"
      : labelFor(options, "FRAME_COLOR", input.frame_color),
    build_label: labelFor(options, "BUILD_TYPE", input.build_type),
    addons_labels: input.addons.map((addon) => labelFor(options, "ADDON", addon)),
    quantity: input.quantity,
    is_stone: input.top_tab === "STONE",
    is_stainless: isStainless,
  };
}
