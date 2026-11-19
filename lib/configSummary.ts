import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import {
  FALLBACK_OPTIONS,
  mergeConfigOptions,
  type ConfigOption,
} from "@/lib/configuratorOptions";
import type { ConfigPriceInput, NonTableConfigInput } from "@/lib/schemas";
import type { NonTableProductType, ProductType } from "@/lib/productTypeConfig";
import { stripCostFragments } from "@/lib/sanitize";

export interface SelectionLine {
  label: string;
  value: string;
}

export interface ConfigSummary {
  product_type: ProductType;
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
  selection_lines: SelectionLine[];
}

export type ConfigSummaryInput =
  | { productType: "TABLE"; tableInput: ConfigPriceInput }
  | { productType: NonTableProductType; nonTableInput: NonTableConfigInput };

const FALLBACK_PRODUCT_NAMES: Record<string, string> = {
  "IMS-CF-42": "Commercial Heavy-Gauge Cafe Table (4x2 ft)",
  "IMS-WS-425": "Zero-Shake Modular Office Workstation (4x2.5 ft)",
  "IMS-DN-63": "Industrial Grade 6-Seater Dining Table (6x3 ft)",
  "IMS-CH-01": "Cafe Chair",
  "IMS-CH-BS": "Bar Stool",
  "IMS-ST-12": "12-inch Stool",
  "IMS-ST-INV": "Inverter Stand",
  "IMS-ST-KD": "Kadai Stand",
  "IMS-RK-01": "Boutique Garment Rack",
  "IMS-SS-CT": "SS Canteen Table",
};

function humanize(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findOption(
  options: ConfigOption[],
  group: string,
  code: string | null | undefined
): ConfigOption | undefined {
  if (!code) return undefined;
  return options.find(
    (option) => option.option_group === group && option.option_code === code
  );
}

function labelFor(
  options: ConfigOption[],
  group: string,
  code: string | null | undefined
): string {
  const option = findOption(options, group, code);
  return stripCostFragments(option?.label_en || humanize(code || ""));
}

function selectionLine(
  options: ConfigOption[],
  group: string,
  code: string | null | undefined,
  label: string
): SelectionLine {
  return { label, value: labelFor(options, group, code) };
}

async function loadOptionsAndName(sku: string): Promise<{
  options: ConfigOption[];
  productName: string;
}> {
  let options: ConfigOption[] = FALLBACK_OPTIONS;
  let productName = FALLBACK_PRODUCT_NAMES[sku] || sku;

  try {
    const { data: optionRows } = await supabaseServer
      .from("configurator_options")
      .select("option_group, option_code, parent_code, label_en, load_kg, warranty_text")
      .eq("is_active", true);

    if (optionRows && optionRows.length > 0) {
      options = mergeConfigOptions(FALLBACK_OPTIONS, optionRows as ConfigOption[]);
    }
  } catch {
    options = FALLBACK_OPTIONS;
  }

  try {
    const { data: productRow } = await supabaseServer
      .from("products")
      .select("name")
      .eq("sku", sku)
      .maybeSingle();

    if (productRow?.name) {
      productName = productRow.name;
    }
  } catch {
    productName = FALLBACK_PRODUCT_NAMES[sku] || sku;
  }

  return { options, productName };
}

async function loadActiveGroups(
  productType: NonTableProductType
): Promise<Array<{ option_group: string; group_title: string }>> {
  try {
    const { data } = await supabaseServer
      .from("product_type_option_groups")
      .select("option_group, group_title, is_active, sort_order")
      .eq("product_type", productType)
      .order("sort_order");

    return (data ?? [])
      .filter((group) => group.is_active !== false)
      .map((group) => ({
        option_group: group.option_group,
        group_title: group.group_title,
      }));
  } catch {
    return [];
  }
}

function appendGenericLines(
  lines: SelectionLine[],
  groups: Array<{ option_group: string; group_title: string }>,
  options: ConfigOption[],
  selections: Record<string, string | undefined>
): SelectionLine[] {
  const seen = new Set(lines.map((line) => line.value));
  const next = [...lines];

  for (const group of groups) {
    const code = selections[group.option_group];
    if (!code) continue;
    const value = labelFor(options, group.option_group, code);
    if (!value || seen.has(value)) continue;
    next.push({ label: group.group_title, value });
    seen.add(value);
  }

  return next;
}

function buildNonTableLines(
  input: NonTableConfigInput,
  options: ConfigOption[]
): SelectionLine[] {
  if (input.product_type === "CHAIR") {
    const selections = input.selections;
    const metalOption = findOption(options, "METAL_TYPE", selections.METAL_TYPE);
    const isSS = selections.METAL_TYPE !== "MS_COATED";
    const lines = [
      selectionLine(options, "METAL_TYPE", selections.METAL_TYPE, "Metal type"),
      selectionLine(options, "SEAT", selections.SEAT, "Seat"),
    ];

    if (selections.SEAT === "SEAT_REXINE" && selections.SEAT_COLOR) {
      lines.push(
        selectionLine(options, "SEAT_COLOR", selections.SEAT_COLOR, "Seat color")
      );
    }

    lines.push({
      label: "Frame",
      value: isSS
        ? "Natural SS finish"
        : labelFor(options, "FRAME_COLOR", selections.FRAME_COLOR),
    });
    lines.push(
      selectionLine(options, "BUILD_TYPE", selections.BUILD_TYPE, "Build")
    );

    if (metalOption?.warranty_text) {
      lines.push({ label: "Warranty", value: stripCostFragments(metalOption.warranty_text) });
    }

    return lines;
  }

  if (input.product_type === "STAND") {
    const selections = input.selections;
    return [
      selectionLine(options, "STAND_MATERIAL", selections.STAND_MATERIAL, "Material"),
      selectionLine(options, "PACK", selections.PACK, "Pack size"),
      selectionLine(options, "BASE", selections.BASE, "Base"),
    ];
  }

  if (input.product_type === "RACK") {
    const selections = input.selections;
    return [
      selectionLine(options, "FINISH", selections.FINISH, "Finish"),
      selectionLine(options, "SHELF", selections.SHELF, "Shelf"),
      selectionLine(options, "RACK_SIZE", selections.RACK_SIZE, "Height & length"),
    ];
  }

  const selections = input.selections;
  return [
    selectionLine(options, "GRADE", selections.GRADE, "Grade"),
    selectionLine(options, "THICKNESS", selections.THICKNESS, "Top thickness"),
    selectionLine(options, "SS_FINISH", selections.SS_FINISH, "Finish"),
  ];
}

export async function getConfigSummary(input: ConfigSummaryInput): Promise<ConfigSummary> {
  const sku =
    input.productType === "TABLE" ? input.tableInput.sku : input.nonTableInput.sku;
  const quantity =
    input.productType === "TABLE"
      ? input.tableInput.quantity
      : input.nonTableInput.quantity;

  const { options, productName } = await loadOptionsAndName(sku);

  if (input.productType === "TABLE") {
    const tableInput = input.tableInput;
    const topTabLabel = labelFor(options, "TOP_TAB", tableInput.top_tab);
    const topMaterialLabel =
      tableInput.top_tab === "FRAME_ONLY"
        ? null
        : labelFor(options, "TOP_MATERIAL", tableInput.top_material);
    const gaugeOption = findOption(options, "GAUGE", tableInput.gauge);
    const frameMaterialOption = findOption(
      options,
      "FRAME_MATERIAL",
      tableInput.frame_material ?? "MS"
    );
    const isStainless =
      tableInput.frame_material === "SS" ||
      tableInput.gauge === "SS202" ||
      tableInput.gauge === "SS304";

    return {
      product_type: "TABLE",
      product_name: productName,
      sku: tableInput.sku,
      size_label: labelFor(options, "SIZE", tableInput.size),
      top_tab_label: topTabLabel,
      top_material_label: topMaterialLabel,
      top_label: topMaterialLabel ? `${topTabLabel} — ${topMaterialLabel}` : topTabLabel,
      gauge_code: tableInput.gauge,
      gauge_label: labelFor(options, "GAUGE", tableInput.gauge),
      gauge_load_kg: gaugeOption?.load_kg ?? null,
      gauge_warranty:
        frameMaterialOption?.warranty_text ?? gaugeOption?.warranty_text ?? null,
      frame_color_label: isStainless
        ? "SS Mirror / Matte Finish"
        : labelFor(options, "FRAME_COLOR", tableInput.frame_color),
      build_label: labelFor(options, "BUILD_TYPE", tableInput.build_type),
      addons_labels: tableInput.addons.map((addon) => labelFor(options, "ADDON", addon)),
      quantity,
      is_stone: tableInput.top_tab === "STONE",
      is_stainless: isStainless,
      selection_lines: [],
    };
  }

  const nonTableInput = input.nonTableInput;
  const activeGroups = await loadActiveGroups(nonTableInput.product_type);
  const selectionLines = appendGenericLines(
    buildNonTableLines(nonTableInput, options),
    activeGroups,
    options,
    nonTableInput.selections as Record<string, string | undefined>
  );

  const base = {
    product_name: productName,
    sku: nonTableInput.sku,
    size_label: "",
    top_tab_label: "",
    top_material_label: null,
    top_label: "",
    gauge_code: "",
    gauge_label: "",
    gauge_load_kg: null,
    gauge_warranty: null,
    frame_color_label: "",
    build_label: "",
    addons_labels: [],
    quantity,
    is_stone: false,
    selection_lines: selectionLines,
  };

  if (nonTableInput.product_type === "CHAIR") {
    const selections = nonTableInput.selections;
    const metalOption = findOption(options, "METAL_TYPE", selections.METAL_TYPE);
    const isMS = selections.METAL_TYPE === "MS_COATED";

    return {
      ...base,
      product_type: "CHAIR",
      gauge_code: selections.METAL_TYPE,
      gauge_label: labelFor(options, "METAL_TYPE", selections.METAL_TYPE),
      gauge_warranty: metalOption?.warranty_text ?? null,
      frame_color_label: isMS
        ? labelFor(options, "FRAME_COLOR", selections.FRAME_COLOR)
        : "Natural SS finish",
      build_label: labelFor(options, "BUILD_TYPE", selections.BUILD_TYPE),
      is_stainless: !isMS,
    };
  }

  if (nonTableInput.product_type === "STAND") {
    const selections = nonTableInput.selections;

    return {
      ...base,
      product_type: "STAND",
      gauge_code: selections.STAND_MATERIAL,
      gauge_label: labelFor(options, "STAND_MATERIAL", selections.STAND_MATERIAL),
      is_stainless: selections.STAND_MATERIAL === "ST_SS304",
    };
  }

  if (nonTableInput.product_type === "RACK") {
    const selections = nonTableInput.selections;

    return {
      ...base,
      product_type: "RACK",
      size_label: labelFor(options, "RACK_SIZE", selections.RACK_SIZE),
      is_stainless: false,
    };
  }

  const selections = nonTableInput.selections;

  return {
    ...base,
    product_type: "SS_UNIT",
    gauge_code: selections.GRADE,
    gauge_label: labelFor(options, "GRADE", selections.GRADE),
    is_stainless: true,
  };
}
