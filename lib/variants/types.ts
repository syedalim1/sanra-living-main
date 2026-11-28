import type { PublicBuildCategory } from "@/lib/buildCategory";

export type FrameMaterialCode = "SS" | "MS";
export type BuildCategoryLevel = "ECONOMY" | "STANDARD" | "HEAVY_DUTY";
export type SurfaceKind = "TABLETOP" | "SEAT" | "FRAME_ONLY";
export type VariantAvailability =
  | "IN_STOCK"
  | "MADE_TO_ORDER"
  | "QUOTE_ONLY"
  | "UNAVAILABLE";
export type VariantStatus = "DRAFT" | "PUBLISHED";

/**
 * Public-safe build category option (never includes internal gauge or thickness).
 */
export interface PublicBuildCategoryOption {
  id: string;
  code: string;
  frame_material: FrameMaterialCode;
  level: BuildCategoryLevel;
  public_label: PublicBuildCategory;
  public_description: string | null;
  public_spec_summary: string | null;
  sort_order: number;
}

/**
 * Public-safe surface option.
 */
export interface PublicSurfaceOption {
  id: string;
  code: string;
  kind: SurfaceKind;
  label: string;
  material_family: string | null;
  public_description: string | null;
  applicable_product_types: string[];
  sort_order: number;
}

/**
 * Public-safe economic product variant DTO.
 * Never contains manufacturing_cost, gauge_code, nominal_thickness_mm, or margin fields.
 */
export interface PublicProductVariant {
  id: string;
  product_id: string;
  variant_code: string;
  frame_material: FrameMaterialCode;
  build_category_id: string;
  build_category_label: PublicBuildCategory;
  surface_option_id: string | null;
  surface_label: string | null;
  size_code: string;
  size_label: string;
  length_ft: number | null;
  width_ft: number | null;
  height_ft: number | null;
  finish_label: string | null;
  variant_image_url: string | null;
  availability: VariantAvailability;
  lead_time_days: number | null;
  sort_order: number;
}

/**
 * Server-only private gauge & pipe thickness specification.
 */
export interface PrivateBuildCategorySpec {
  build_category_id: string;
  gauge_code: string;
  nominal_thickness_mm: number;
  legacy_gauge_code: string | null;
  internal_notes: string | null;
  updated_at: string;
}

export type CostSource = "UNSET" | "EXCEL_IMPORT" | "MANUAL" | "LEGACY_OVERRIDE";
export type MarginType = "GROSS_MARGIN" | "MARKUP";
export type RoundingRule =
  | "NONE"
  | "UP_9"
  | "UP_99"
  | "UP_10"
  | "UP_50"
  | "UP_100"
  | "NEAREST_99";
export type GstMode = "INCLUSIVE" | "EXCLUSIVE";

export interface PrivatePricingProfile {
  id: string;
  code: string;
  name: string;
  channel: "RETAIL" | "B2B";
  margin_type: MarginType;
  default_margin_pct: number | null;
  min_margin_pct: number | null;
  rounding_rule: RoundingRule;
  gst_rate: number;
  gst_mode: GstMode;
  is_active: boolean;
}

export interface PrivateVariantPricing {
  variant_id: string;
  manufacturing_cost: number | null;
  cost_source: CostSource;
  cost_effective_from: string | null;
  pricing_profile_id: string | null;
  price_override_ex_gst: number | null;
  price_override_inc_gst: number | null;
  min_selling_price: number | null;
  internal_notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface PrivatePricingTier {
  id: string;
  scope: "PRODUCT_TYPE" | "PRODUCT" | "VARIANT";
  product_type: string | null;
  product_id: string | null;
  variant_id: string | null;
  min_qty: number;
  max_qty: number | null;
  model: "DISCOUNT_PCT" | "FIXED_UNIT_PRICE" | "MARGIN_PCT" | "QUOTE_REQUIRED";
  value: number | null;
  priority: number;
  is_active: boolean;
}

export interface PrivateBulkRule {
  id: string;
  product_type: string;
  min_qty: number;
  below_min_action: "SURCHARGE_PCT" | "QUOTE_REQUIRED" | "BLOCK";
  below_min_value: number | null;
  special_quote_qty: number | null;
  special_quote_action: "QUOTE_REQUIRED" | "NONE";
  scope: "LINE" | "BASKET";
  is_active: boolean;
}
