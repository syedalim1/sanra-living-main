import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type {
  CostSource,
  GstMode,
  MarginType,
  PrivateBuildCategorySpec,
  PrivateBulkRule,
  PrivatePricingProfile,
  PrivatePricingTier,
  PrivateVariantPricing,
  RoundingRule,
} from "./types";

/**
 * Server-only helper to fetch private gauge and nominal thickness mapping.
 * Never serialize the returned object to client components or public APIs.
 */
export async function getPrivateBuildCategorySpec(
  buildCategoryId: string
): Promise<PrivateBuildCategorySpec | null> {
  const { data, error } = await supabaseServer
    .from("build_category_specs_private")
    .select(
      "build_category_id, gauge_code, nominal_thickness_mm, legacy_gauge_code, internal_notes, updated_at"
    )
    .eq("build_category_id", buildCategoryId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    build_category_id: data.build_category_id as string,
    gauge_code: data.gauge_code as string,
    nominal_thickness_mm: Number(data.nominal_thickness_mm),
    legacy_gauge_code: (data.legacy_gauge_code as string | null) ?? null,
    internal_notes: (data.internal_notes as string | null) ?? null,
    updated_at: data.updated_at as string,
  };
}

/**
 * Server-only helper to fetch private manufacturing cost and pricing overrides for a variant.
 */
export async function getPrivateVariantPricing(
  variantId: string
): Promise<PrivateVariantPricing | null> {
  const { data, error } = await supabaseServer
    .from("variant_pricing_private")
    .select(
      "variant_id, manufacturing_cost, cost_source, cost_effective_from, pricing_profile_id, price_override_ex_gst, price_override_inc_gst, min_selling_price, internal_notes, updated_by, updated_at"
    )
    .eq("variant_id", variantId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    variant_id: data.variant_id as string,
    manufacturing_cost:
      data.manufacturing_cost != null ? Number(data.manufacturing_cost) : null,
    cost_source: data.cost_source as CostSource,
    cost_effective_from: (data.cost_effective_from as string | null) ?? null,
    pricing_profile_id: (data.pricing_profile_id as string | null) ?? null,
    price_override_ex_gst:
      data.price_override_ex_gst != null
        ? Number(data.price_override_ex_gst)
        : null,
    price_override_inc_gst:
      data.price_override_inc_gst != null
        ? Number(data.price_override_inc_gst)
        : null,
    min_selling_price:
      data.min_selling_price != null ? Number(data.min_selling_price) : null,
    internal_notes: (data.internal_notes as string | null) ?? null,
    updated_by: (data.updated_by as string | null) ?? null,
    updated_at: data.updated_at as string,
  };
}

export async function getPrivatePricingProfile(
  profileId: string
): Promise<PrivatePricingProfile | null> {
  const { data, error } = await supabaseServer
    .from("pricing_profiles")
    .select(
      "id, code, name, channel, margin_type, default_margin_pct, min_margin_pct, rounding_rule, gst_rate, gst_mode, is_active"
    )
    .eq("id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    code: data.code as string,
    name: data.name as string,
    channel: data.channel as "RETAIL" | "B2B",
    margin_type: data.margin_type as MarginType,
    default_margin_pct:
      data.default_margin_pct != null ? Number(data.default_margin_pct) : null,
    min_margin_pct:
      data.min_margin_pct != null ? Number(data.min_margin_pct) : null,
    rounding_rule: data.rounding_rule as RoundingRule,
    gst_rate: Number(data.gst_rate),
    gst_mode: data.gst_mode as GstMode,
    is_active: Boolean(data.is_active),
  };
}

export async function getBulkRuleForProductType(
  productType: string
): Promise<PrivateBulkRule | null> {
  const { data, error } = await supabaseServer
    .from("bulk_rules")
    .select(
      "id, product_type, min_qty, below_min_action, below_min_value, special_quote_qty, special_quote_action, scope, is_active"
    )
    .eq("product_type", productType)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    product_type: data.product_type as string,
    min_qty: Number(data.min_qty),
    below_min_action: data.below_min_action as
      | "SURCHARGE_PCT"
      | "QUOTE_REQUIRED"
      | "BLOCK",
    below_min_value:
      data.below_min_value != null ? Number(data.below_min_value) : null,
    special_quote_qty:
      data.special_quote_qty != null ? Number(data.special_quote_qty) : null,
    special_quote_action: data.special_quote_action as
      | "QUOTE_REQUIRED"
      | "NONE",
    scope: data.scope as "LINE" | "BASKET",
    is_active: Boolean(data.is_active),
  };
}

export async function getActivePricingTiers(
  scope: "PRODUCT_TYPE" | "PRODUCT" | "VARIANT",
  target: string
): Promise<PrivatePricingTier[]> {
  let query = supabaseServer
    .from("pricing_tiers")
    .select(
      "id, scope, product_type, product_id, variant_id, min_qty, max_qty, model, value, priority, is_active"
    )
    .eq("scope", scope)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (scope === "PRODUCT_TYPE") query = query.eq("product_type", target);
  if (scope === "PRODUCT") query = query.eq("product_id", target);
  if (scope === "VARIANT") query = query.eq("variant_id", target);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    scope: row.scope as "PRODUCT_TYPE" | "PRODUCT" | "VARIANT",
    product_type: (row.product_type as string | null) ?? null,
    product_id: (row.product_id as string | null) ?? null,
    variant_id: (row.variant_id as string | null) ?? null,
    min_qty: Number(row.min_qty),
    max_qty: row.max_qty != null ? Number(row.max_qty) : null,
    model: row.model as
      | "DISCOUNT_PCT"
      | "FIXED_UNIT_PRICE"
      | "MARGIN_PCT"
      | "QUOTE_REQUIRED",
    value: row.value != null ? Number(row.value) : null,
    priority: Number(row.priority ?? 100),
    is_active: Boolean(row.is_active),
  }));
}
