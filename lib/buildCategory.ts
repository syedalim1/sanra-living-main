import type { ConfigOption } from "@/lib/configuratorOptions";
import type { OptionGroupRow } from "@/lib/productTypeConfig";

export type PublicBuildCategory = "Economy" | "Standard" | "Heavy Duty";

export const PUBLIC_BUILD_CATEGORIES: readonly PublicBuildCategory[] = [
  "Economy",
  "Standard",
  "Heavy Duty",
] as const;

const PRIVATE_OPTION_GROUPS = new Set(["GAUGE", "THICKNESS", "GRADE"]);

const CODE_TO_BUILD_CATEGORY: Record<string, PublicBuildCategory> = {
  G18: "Economy",
  ECONOMY: "Economy",
  G16: "Standard",
  TH_18G: "Standard",
  SS202: "Standard",
  SSG_202: "Standard",
  STANDARD: "Standard",
  G14: "Heavy Duty",
  TH_16G: "Heavy Duty",
  SS304: "Heavy Duty",
  SSG_304: "Heavy Duty",
  HEAVY_DUTY: "Heavy Duty",
};

/**
 * Maps internal gauge, thickness, or grade codes to customer-facing build categories.
 */
export function buildCategoryForCode(
  code: string | null | undefined
): PublicBuildCategory | null {
  if (!code) return null;
  return CODE_TO_BUILD_CATEGORY[code.trim().toUpperCase()] ?? null;
}

export function isPrivateOptionGroup(optionGroup: string): boolean {
  return PRIVATE_OPTION_GROUPS.has(optionGroup);
}

export function toPublicGroupTitle(
  optionGroup: string,
  currentTitle: string
): string {
  if (optionGroup === "GAUGE" || optionGroup === "THICKNESS") {
    return "Build category";
  }
  if (optionGroup === "GRADE") {
    return "Build grade";
  }
  return currentTitle;
}

export function toPublicOptionLabel(
  optionGroup: string,
  optionCode: string,
  currentLabel: string
): string {
  if (
    optionGroup === "GAUGE" ||
    optionGroup === "THICKNESS" ||
    optionGroup === "GRADE"
  ) {
    return buildCategoryForCode(optionCode) ?? "Standard";
  }

  if (optionGroup === "FRAME_MATERIAL" && optionCode === "SS") {
    return "Stainless Steel";
  }

  if (
    optionGroup === "METAL_TYPE" &&
    (optionCode === "SS202" || optionCode === "SS304")
  ) {
    const category = buildCategoryForCode(optionCode) ?? "Standard";
    return `Stainless Steel — ${category}`;
  }

  if (optionGroup === "STAND_MATERIAL" && optionCode === "ST_SS304") {
    return "Stainless Steel";
  }

  return currentLabel;
}

export function sanitizePublicSpecNote(
  optionGroup: string,
  optionCode: string,
  specNote: string | null | undefined
): string | null {
  if (optionGroup === "FRAME_MATERIAL") {
    return optionCode === "SS"
      ? "Commercial stainless steel with mirror or matte finish"
      : "Industrial powder-coated mild steel frame";
  }

  if (optionGroup === "GAUGE" || optionGroup === "THICKNESS" || optionGroup === "GRADE") {
    const category = buildCategoryForCode(optionCode);
    if (category === "Economy") return "Light commercial & home use";
    if (category === "Heavy Duty") return "High-traffic institutional & industrial use";
    return "Commercial cafe, hotel & office use";
  }

  return specNote ?? null;
}

/**
 * Returns an explicit public-safe copy of configurator options without internal gauge/thickness/grade labels.
 */
export function sanitizePublicConfigOptions(
  options: ConfigOption[]
): ConfigOption[] {
  return options.map((option) => ({
    option_group: option.option_group,
    option_code: option.option_code,
    parent_code: option.parent_code ?? null,
    label_en: toPublicOptionLabel(
      option.option_group,
      option.option_code,
      option.label_en
    ),
    group_label: option.group_label ?? null,
    swatch_color_hex: option.swatch_color_hex ?? null,
    swatch_texture_img: option.swatch_texture_img ?? null,
    spec_note: sanitizePublicSpecNote(
      option.option_group,
      option.option_code,
      option.spec_note
    ),
    load_kg: option.load_kg ?? null,
    warranty_text: option.warranty_text ?? null,
    badge_text: option.badge_text ?? null,
    sort_order: option.sort_order,
  }));
}

/**
 * Returns an explicit public-safe copy of option groups with customer-facing group titles.
 */
export function sanitizePublicOptionGroups(
  groups: OptionGroupRow[]
): OptionGroupRow[] {
  return groups.map((group) => ({
    product_type: group.product_type,
    option_group: group.option_group,
    group_title: toPublicGroupTitle(group.option_group, group.group_title),
    sort_order: group.sort_order,
    is_required: group.is_required,
    default_code: group.default_code ?? null,
    display_style: group.display_style ?? null,
    allow_multiple: group.allow_multiple ?? false,
    is_active: group.is_active !== false,
  }));
}
