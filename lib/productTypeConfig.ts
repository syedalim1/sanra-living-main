import type { ConfigOption } from "@/lib/configuratorOptions";

export type ProductType = "TABLE" | "CHAIR" | "STAND" | "RACK" | "SS_UNIT";
export type NonTableProductType = Exclude<ProductType, "TABLE">;

export interface OptionGroupRow {
  product_type: ProductType;
  option_group: string;
  group_title: string;
  sort_order: number;
  is_required: boolean;
  default_code: string | null;
  display_style?: string | null;
  allow_multiple?: boolean | null;
  is_active?: boolean | null;
}

export const PRODUCT_TYPES: ProductType[] = ["TABLE", "CHAIR", "STAND", "RACK", "SS_UNIT"];
export const NON_TABLE_TYPES: NonTableProductType[] = ["CHAIR", "STAND", "RACK", "SS_UNIT"];

export const FALLBACK_GROUPS: Record<ProductType, OptionGroupRow[]> = {
  TABLE: [
    { product_type: "TABLE", option_group: "TOP_TAB", group_title: "Top surface", sort_order: 10, is_required: true, default_code: "WOOD" },
    { product_type: "TABLE", option_group: "TOP_MATERIAL", group_title: "Top material", sort_order: 20, is_required: false, default_code: "RUBBER_HONEY_TEAK" },
    { product_type: "TABLE", option_group: "GAUGE", group_title: "Structural steel gauge", sort_order: 30, is_required: true, default_code: "G16" },
    { product_type: "TABLE", option_group: "FRAME_COLOR", group_title: "Frame color", sort_order: 40, is_required: true, default_code: "MATTE_BLACK" },
    { product_type: "TABLE", option_group: "SIZE", group_title: "Frame size", sort_order: 50, is_required: true, default_code: "4x2" },
    { product_type: "TABLE", option_group: "BUILD_TYPE", group_title: "Delivery & assembly", sort_order: 60, is_required: true, default_code: "WELDED" },
    { product_type: "TABLE", option_group: "ADDON", group_title: "Optional add-ons", sort_order: 70, is_required: false, default_code: null },
    { product_type: "TABLE", option_group: "QTY_TIER", group_title: "Quantity", sort_order: 80, is_required: false, default_code: null },
  ],
  CHAIR: [
    { product_type: "CHAIR", option_group: "METAL_TYPE", group_title: "Metal type", sort_order: 10, is_required: true, default_code: "MS_COATED" },
    { product_type: "CHAIR", option_group: "SEAT", group_title: "Seat", sort_order: 20, is_required: true, default_code: "SEAT_RUBBER" },
    { product_type: "CHAIR", option_group: "SEAT_COLOR", group_title: "Seat color", sort_order: 30, is_required: false, default_code: "REXINE_BLACK" },
    { product_type: "CHAIR", option_group: "FRAME_COLOR", group_title: "Frame color", sort_order: 40, is_required: false, default_code: "MATTE_BLACK" },
    { product_type: "CHAIR", option_group: "BUILD_TYPE", group_title: "Delivery & assembly", sort_order: 50, is_required: true, default_code: "WELDED" },
    { product_type: "CHAIR", option_group: "QTY_TIER", group_title: "Quantity", sort_order: 60, is_required: false, default_code: null },
  ],
  STAND: [
    { product_type: "STAND", option_group: "STAND_MATERIAL", group_title: "Material", sort_order: 10, is_required: true, default_code: "ST_MS" },
    { product_type: "STAND", option_group: "PACK", group_title: "Pack size", sort_order: 20, is_required: true, default_code: "PACK_1" },
    { product_type: "STAND", option_group: "BASE", group_title: "Base type", sort_order: 30, is_required: true, default_code: "BASE_BUSH" },
    { product_type: "STAND", option_group: "QTY_TIER", group_title: "Quantity", sort_order: 40, is_required: false, default_code: null },
  ],
  RACK: [
    { product_type: "RACK", option_group: "FINISH", group_title: "Finish", sort_order: 10, is_required: true, default_code: "RF_BLACK" },
    { product_type: "RACK", option_group: "SHELF", group_title: "Bottom shelf", sort_order: 20, is_required: true, default_code: "SH_NONE" },
    { product_type: "RACK", option_group: "RACK_SIZE", group_title: "Height & length", sort_order: 30, is_required: true, default_code: "R4" },
    { product_type: "RACK", option_group: "QTY_TIER", group_title: "Quantity", sort_order: 40, is_required: false, default_code: null },
  ],
  SS_UNIT: [
    { product_type: "SS_UNIT", option_group: "GRADE", group_title: "Stainless grade", sort_order: 10, is_required: true, default_code: "SSG_202" },
    { product_type: "SS_UNIT", option_group: "THICKNESS", group_title: "Top thickness", sort_order: 20, is_required: true, default_code: "TH_18G" },
    { product_type: "SS_UNIT", option_group: "SS_FINISH", group_title: "Finish", sort_order: 30, is_required: true, default_code: "SSF_HAIRLINE" },
    { product_type: "SS_UNIT", option_group: "QTY_TIER", group_title: "Quantity", sort_order: 40, is_required: false, default_code: null },
  ],
};

export function isProductType(value: string | null | undefined): value is ProductType {
  return value === "TABLE" || value === "CHAIR" || value === "STAND" || value === "RACK" || value === "SS_UNIT";
}

export function getTypeGroupRows(
  productType: ProductType,
  rows?: Array<Partial<OptionGroupRow>> | null
): OptionGroupRow[] {
  const source =
    rows && rows.length > 0
      ? rows
          .filter(
            (row) =>
              row.product_type === productType &&
              row.option_group &&
              row.group_title &&
              row.is_active !== false
          )
          .map((row) => ({
            product_type: productType,
            option_group: row.option_group!,
            group_title: row.group_title!,
            sort_order: Number(row.sort_order ?? 100),
            is_required: Boolean(row.is_required),
            default_code: row.default_code ?? null,
            display_style: row.display_style ?? null,
            allow_multiple: row.allow_multiple ?? false,
            is_active: row.is_active !== false,
          }))
      : [];

  const resolved = source.length > 0 ? source : FALLBACK_GROUPS[productType];
  return [...resolved].sort((a, b) => a.sort_order - b.sort_order);
}

export function selectionParam(optionGroup: string): string {
  return optionGroup.toLowerCase();
}

export function buildSelectionKey(
  productType: ProductType,
  selections: Record<string, string | undefined>
): string {
  switch (productType) {
    case "CHAIR":
      return [
        selections.SEAT ?? "",
        selections.SEAT_COLOR ?? "",
        selections.METAL_TYPE ?? "",
        selections.FRAME_COLOR ?? "",
      ].join("|");
    case "STAND":
      return [selections.STAND_MATERIAL ?? "", selections.PACK ?? "", selections.BASE ?? ""].join("|");
    case "RACK":
      return [selections.FINISH ?? "", selections.SHELF ?? "", selections.RACK_SIZE ?? ""].join("|");
    case "SS_UNIT":
      return [selections.GRADE ?? "", selections.THICKNESS ?? "", selections.SS_FINISH ?? ""].join("|");
    default:
      return "";
  }
}

export function isSSSelection(
  productType: ProductType,
  selections: Record<string, string | undefined>
): boolean {
  if (productType === "CHAIR") return (selections.METAL_TYPE ?? "").startsWith("SS");
  if (productType === "STAND") return selections.STAND_MATERIAL === "ST_SS304";
  if (productType === "SS_UNIT") return true;
  return false;
}

export function getGroupOptions(
  options: ConfigOption[],
  optionGroup: string
): ConfigOption[] {
  return options
    .filter((option) => option.option_group === optionGroup)
    .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
}
