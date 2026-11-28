import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type {
  GstMode,
  MarginType,
  PrivateBulkRule,
  PrivatePricingProfile,
  PrivatePricingTier,
  PrivateVariantPricing,
  RoundingRule,
  VariantAvailability,
} from "@/lib/variants/types";

export interface PublicVariantPriceResult {
  variant_id: string;
  variant_code: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  price_basis: "GST_INCLUSIVE" | "GST_EXCLUSIVE" | null;
  gst_rate: number | null;
  gst_amount: number | null;
  availability: VariantAvailability;
  lead_time_days: number | null;
  requires_quote: boolean;
  quote_reason: string | null;
}

export interface VariantPriceCalculationInput {
  variantId: string;
  quantity: number;
  productType?: string;
}

function toPaise(amount: number): number {
  return Math.round(amount * 100);
}

function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Decimal-safe selling price from manufacturing cost and margin/markup percentage.
 */
export function computeSellingExGstPaise(
  manufacturingCostPaise: number,
  marginType: MarginType,
  marginPct: number
): number | null {
  if (!Number.isFinite(manufacturingCostPaise) || manufacturingCostPaise <= 0) {
    return null;
  }
  if (!Number.isFinite(marginPct) || marginPct < 0) {
    return null;
  }

  if (marginType === "MARKUP") {
    return Math.round((manufacturingCostPaise * (100 + marginPct)) / 100);
  }

  // GROSS_MARGIN: cost / (1 - marginPct / 100)
  if (marginPct >= 100) return null;
  return Math.round((manufacturingCostPaise * 100) / (100 - marginPct));
}

export function applyRoundingRule(
  amountInr: number,
  rule: RoundingRule
): number {
  if (!Number.isFinite(amountInr) || amountInr <= 0) return 0;
  const ceil = Math.ceil(amountInr);

  switch (rule) {
    case "NONE":
      return Math.round(amountInr * 100) / 100;
    case "UP_9": {
      if (ceil <= 9) return 9;
      return Math.ceil((ceil - 9) / 10) * 10 + 9;
    }
    case "UP_99": {
      if (ceil <= 99) return 99;
      return Math.ceil((ceil - 99) / 100) * 100 + 99;
    }
    case "UP_10":
      return Math.ceil(ceil / 10) * 10;
    case "UP_50":
      return Math.ceil(ceil / 50) * 50;
    case "UP_100":
      return Math.ceil(ceil / 100) * 100;
    case "NEAREST_99": {
      if (amountInr <= 99) return 99;
      const lower = Math.floor((amountInr - 99) / 100) * 100 + 99;
      const upper = lower + 100;
      return upper - amountInr <= amountInr - lower ? upper : lower;
    }
    default:
      return Math.round(amountInr * 100) / 100;
  }
}

export function applyGstCalculation(
  roundedUnitInr: number,
  gstRate: number,
  gstMode: GstMode
): { unitPrice: number; gstAmount: number } {
  const unitPaise = toPaise(roundedUnitInr);
  if (gstMode === "INCLUSIVE") {
    const exGstPaise = Math.round((unitPaise * 100) / (100 + gstRate));
    return {
      unitPrice: fromPaise(unitPaise),
      gstAmount: fromPaise(unitPaise - exGstPaise),
    };
  }

  const gstPaise = Math.round((unitPaise * gstRate) / 100);
  return {
    unitPrice: fromPaise(unitPaise),
    gstAmount: fromPaise(gstPaise),
  };
}

function selectApplicableTier(
  tiers: PrivatePricingTier[],
  quantity: number
): PrivatePricingTier | null {
  const scopeRank: Record<PrivatePricingTier["scope"], number> = {
    VARIANT: 1,
    PRODUCT: 2,
    PRODUCT_TYPE: 3,
  };

  const matching = tiers
    .filter(
      (tier) =>
        tier.is_active &&
        quantity >= tier.min_qty &&
        (tier.max_qty == null || quantity <= tier.max_qty)
    )
    .sort((a, b) => {
      const rankDiff = scopeRank[a.scope] - scopeRank[b.scope];
      if (rankDiff !== 0) return rankDiff;
      return a.priority - b.priority;
    });

  return matching[0] ?? null;
}

export function evaluateVariantPricing(params: {
  variantId: string;
  variantCode: string;
  availability: VariantAvailability;
  leadTimeDays: number | null;
  sizeCode: string;
  quantity: number;
  pricing: PrivateVariantPricing | null;
  profile: PrivatePricingProfile | null;
  bulkRule: PrivateBulkRule | null;
  tiers: PrivatePricingTier[];
}): PublicVariantPriceResult {
  const {
    variantId,
    variantCode,
    availability,
    leadTimeDays,
    sizeCode,
    quantity,
    pricing,
    profile,
    bulkRule,
    tiers,
  } = params;

  const quoteOnly = (reason: string): PublicVariantPriceResult => ({
    variant_id: variantId,
    variant_code: variantCode,
    quantity,
    unit_price: null,
    total_price: null,
    price_basis: null,
    gst_rate: null,
    gst_amount: null,
    availability,
    lead_time_days: leadTimeDays,
    requires_quote: true,
    quote_reason: reason,
  });

  if (
    availability === "UNAVAILABLE" ||
    availability === "QUOTE_ONLY" ||
    sizeCode === "CUSTOM"
  ) {
    return quoteOnly(
      availability === "UNAVAILABLE" ? "UNAVAILABLE" : "CUSTOM_OR_QUOTE_ONLY"
    );
  }

  // Evaluate bulk MOQ & 50+ special quote rules
  let belowMinSurchargePct = 0;
  if (bulkRule && bulkRule.is_active) {
    if (
      bulkRule.special_quote_qty != null &&
      quantity >= bulkRule.special_quote_qty &&
      bulkRule.special_quote_action === "QUOTE_REQUIRED"
    ) {
      return quoteOnly("BULK_SPECIAL_QUOTE");
    }

    if (quantity < bulkRule.min_qty) {
      if (
        bulkRule.below_min_action === "QUOTE_REQUIRED" ||
        bulkRule.below_min_action === "BLOCK"
      ) {
        return quoteOnly("BELOW_MOQ");
      }
      if (
        bulkRule.below_min_action === "SURCHARGE_PCT" &&
        bulkRule.below_min_value != null &&
        bulkRule.below_min_value > 0
      ) {
        belowMinSurchargePct = bulkRule.below_min_value;
      }
    }
  }

  if (!pricing) {
    return quoteOnly("PRICING_NOT_CONFIGURED");
  }

  // Explicit manual override (non-legacy)
  const hasManualOverride =
    pricing.cost_source !== "LEGACY_OVERRIDE" &&
    (pricing.price_override_ex_gst != null ||
      pricing.price_override_inc_gst != null);

  const gstRate = profile?.gst_rate ?? 18;
  const gstMode: GstMode =
    pricing.price_override_inc_gst != null
      ? "INCLUSIVE"
      : profile?.gst_mode ?? "EXCLUSIVE";

  let unitExGstPaise: number | null = null;
  const costPaise =
    pricing.manufacturing_cost != null && pricing.manufacturing_cost > 0
      ? toPaise(pricing.manufacturing_cost)
      : null;

  const tier = selectApplicableTier(tiers, quantity);
  if (tier?.model === "QUOTE_REQUIRED") {
    return quoteOnly("TIER_QUOTE_REQUIRED");
  }

  if (hasManualOverride) {
    if (pricing.price_override_ex_gst != null) {
      unitExGstPaise = toPaise(pricing.price_override_ex_gst);
    } else if (pricing.price_override_inc_gst != null) {
      const incPaise = toPaise(pricing.price_override_inc_gst);
      unitExGstPaise = Math.round((incPaise * 100) / (100 + gstRate));
    }
  } else if (costPaise != null) {
    // Must have an approved pricing profile with margin percentage; never invent margins.
    if (!profile || profile.default_margin_pct == null) {
      return quoteOnly("MISSING_PRICING_PROFILE");
    }

    let effectiveMarginPct = profile.default_margin_pct;
    if (tier?.model === "MARGIN_PCT" && tier.value != null) {
      effectiveMarginPct =
        profile.min_margin_pct != null
          ? Math.max(tier.value, profile.min_margin_pct)
          : tier.value;
    }

    unitExGstPaise = computeSellingExGstPaise(
      costPaise,
      profile.margin_type,
      effectiveMarginPct
    );
  } else if (
    pricing.cost_source === "LEGACY_OVERRIDE" &&
    pricing.price_override_ex_gst != null &&
    pricing.price_override_ex_gst > 0
  ) {
    unitExGstPaise = toPaise(pricing.price_override_ex_gst);
  } else {
    return quoteOnly("MISSING_MANUFACTURING_COST");
  }

  if (unitExGstPaise == null || unitExGstPaise <= 0) {
    return quoteOnly("INVALID_PRICE_CONFIGURATION");
  }

  // Apply below-MOQ surcharge if configured
  if (belowMinSurchargePct > 0) {
    unitExGstPaise = Math.round(
      (unitExGstPaise * (100 + belowMinSurchargePct)) / 100
    );
  }

  // Apply quantity tier discounts or fixed prices
  if (tier) {
    if (tier.model === "DISCOUNT_PCT" && tier.value != null && tier.value > 0) {
      unitExGstPaise = Math.round((unitExGstPaise * (100 - tier.value)) / 100);
    } else if (
      tier.model === "FIXED_UNIT_PRICE" &&
      tier.value != null &&
      tier.value > 0
    ) {
      unitExGstPaise = toPaise(tier.value);
    }
  }

  // Minimum margin & minimum selling price protection
  const minMarginFloorPaise =
    costPaise != null && profile?.min_margin_pct != null
      ? computeSellingExGstPaise(
          costPaise,
          profile.margin_type,
          profile.min_margin_pct
        ) ?? 0
      : 0;
  const minSellingFloorPaise =
    pricing.min_selling_price != null ? toPaise(pricing.min_selling_price) : 0;
  const floorPaise = Math.max(minMarginFloorPaise, minSellingFloorPaise);

  if (floorPaise > 0 && unitExGstPaise < floorPaise) {
    unitExGstPaise = floorPaise;
  }

  const roundingRule: RoundingRule = profile?.rounding_rule ?? "UP_99";
  const preRoundInr =
    gstMode === "INCLUSIVE"
      ? fromPaise(Math.round((unitExGstPaise * (100 + gstRate)) / 100))
      : fromPaise(unitExGstPaise);

  const roundedUnit = applyRoundingRule(preRoundInr, roundingRule);
  const { unitPrice, gstAmount } = applyGstCalculation(
    roundedUnit,
    gstRate,
    gstMode
  );

  return {
    variant_id: variantId,
    variant_code: variantCode,
    quantity,
    unit_price: unitPrice,
    total_price: Math.round(unitPrice * quantity * 100) / 100,
    price_basis: gstMode === "INCLUSIVE" ? "GST_INCLUSIVE" : "GST_EXCLUSIVE",
    gst_rate: gstRate,
    gst_amount: Math.round(gstAmount * quantity * 100) / 100,
    availability,
    lead_time_days: leadTimeDays,
    requires_quote: false,
    quote_reason: null,
  };
}

/**
 * Authoritative server-side variant pricing entry point.
 */
export async function calculateVariantPrice(
  input: VariantPriceCalculationInput
): Promise<PublicVariantPriceResult> {
  const quantity = Math.max(1, Math.min(10_000, Math.trunc(input.quantity || 1)));

  const { data: variant, error: vErr } = await supabaseServer
    .from("product_variants")
    .select(
      "id, product_id, variant_code, size_code, availability, lead_time_days, status, is_active"
    )
    .eq("id", input.variantId)
    .maybeSingle();

  if (vErr || !variant || !variant.is_active || variant.status !== "PUBLISHED") {
    return {
      variant_id: input.variantId,
      variant_code: (variant?.variant_code as string) ?? "",
      quantity,
      unit_price: null,
      total_price: null,
      price_basis: null,
      gst_rate: null,
      gst_amount: null,
      availability: "UNAVAILABLE",
      lead_time_days: null,
      requires_quote: true,
      quote_reason: "VARIANT_NOT_PUBLISHED",
    };
  }

  let productType = input.productType;
  if (!productType) {
    const { data: product } = await supabaseServer
      .from("products")
      .select("product_type")
      .eq("id", variant.product_id)
      .maybeSingle();
    productType = (product?.product_type as string) ?? "TABLE";
  }

  const [pricingRes, bulkRes, tiersRes] = await Promise.all([
    supabaseServer
      .from("variant_pricing_private")
      .select(
        "variant_id, manufacturing_cost, cost_source, cost_effective_from, pricing_profile_id, price_override_ex_gst, price_override_inc_gst, min_selling_price, internal_notes, updated_by, updated_at"
      )
      .eq("variant_id", variant.id)
      .maybeSingle(),
    supabaseServer
      .from("bulk_rules")
      .select(
        "id, product_type, min_qty, below_min_action, below_min_value, special_quote_qty, special_quote_action, scope, is_active"
      )
      .eq("product_type", productType)
      .eq("is_active", true)
      .maybeSingle(),
    supabaseServer
      .from("pricing_tiers")
      .select(
        "id, scope, product_type, product_id, variant_id, min_qty, max_qty, model, value, priority, is_active"
      )
      .eq("is_active", true)
      .or(
        `variant_id.eq.${variant.id},product_id.eq.${variant.product_id},product_type.eq.${productType}`
      ),
  ]);

  const pricingRow = pricingRes.data
    ? ({
        variant_id: pricingRes.data.variant_id as string,
        manufacturing_cost:
          pricingRes.data.manufacturing_cost != null
            ? Number(pricingRes.data.manufacturing_cost)
            : null,
        cost_source: pricingRes.data.cost_source,
        cost_effective_from: pricingRes.data.cost_effective_from ?? null,
        pricing_profile_id: pricingRes.data.pricing_profile_id ?? null,
        price_override_ex_gst:
          pricingRes.data.price_override_ex_gst != null
            ? Number(pricingRes.data.price_override_ex_gst)
            : null,
        price_override_inc_gst:
          pricingRes.data.price_override_inc_gst != null
            ? Number(pricingRes.data.price_override_inc_gst)
            : null,
        min_selling_price:
          pricingRes.data.min_selling_price != null
            ? Number(pricingRes.data.min_selling_price)
            : null,
        internal_notes: pricingRes.data.internal_notes ?? null,
        updated_by: pricingRes.data.updated_by ?? null,
        updated_at: pricingRes.data.updated_at as string,
      } satisfies PrivateVariantPricing)
    : null;

  let profileRow: PrivatePricingProfile | null = null;
  if (pricingRow?.pricing_profile_id) {
    const { data: pData } = await supabaseServer
      .from("pricing_profiles")
      .select(
        "id, code, name, channel, margin_type, default_margin_pct, min_margin_pct, rounding_rule, gst_rate, gst_mode, is_active"
      )
      .eq("id", pricingRow.pricing_profile_id)
      .eq("is_active", true)
      .maybeSingle();

    if (pData) {
      profileRow = {
        id: pData.id as string,
        code: pData.code as string,
        name: pData.name as string,
        channel: pData.channel,
        margin_type: pData.margin_type,
        default_margin_pct:
          pData.default_margin_pct != null
            ? Number(pData.default_margin_pct)
            : null,
        min_margin_pct:
          pData.min_margin_pct != null ? Number(pData.min_margin_pct) : null,
        rounding_rule: pData.rounding_rule,
        gst_rate: Number(pData.gst_rate),
        gst_mode: pData.gst_mode,
        is_active: Boolean(pData.is_active),
      };
    }
  }

  const bulkRule: PrivateBulkRule | null = bulkRes.data
    ? {
        id: bulkRes.data.id as string,
        product_type: bulkRes.data.product_type as string,
        min_qty: Number(bulkRes.data.min_qty),
        below_min_action: bulkRes.data.below_min_action,
        below_min_value:
          bulkRes.data.below_min_value != null
            ? Number(bulkRes.data.below_min_value)
            : null,
        special_quote_qty:
          bulkRes.data.special_quote_qty != null
            ? Number(bulkRes.data.special_quote_qty)
            : null,
        special_quote_action: bulkRes.data.special_quote_action,
        scope: bulkRes.data.scope,
        is_active: Boolean(bulkRes.data.is_active),
      }
    : null;

  const tiers: PrivatePricingTier[] = (tiersRes.data ?? []).map((row) => ({
    id: row.id as string,
    scope: row.scope,
    product_type: row.product_type ?? null,
    product_id: row.product_id ?? null,
    variant_id: row.variant_id ?? null,
    min_qty: Number(row.min_qty),
    max_qty: row.max_qty != null ? Number(row.max_qty) : null,
    model: row.model,
    value: row.value != null ? Number(row.value) : null,
    priority: Number(row.priority ?? 100),
    is_active: Boolean(row.is_active),
  }));

  return evaluateVariantPricing({
    variantId: variant.id as string,
    variantCode: variant.variant_code as string,
    availability: variant.availability as VariantAvailability,
    leadTimeDays:
      variant.lead_time_days != null ? Number(variant.lead_time_days) : null,
    sizeCode: variant.size_code as string,
    quantity,
    pricing: pricingRow,
    profile: profileRow,
    bulkRule,
    tiers,
  });
}
