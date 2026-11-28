import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  applyGstCalculation,
  applyRoundingRule,
  computeSellingExGstPaise,
  evaluateVariantPricing,
} from "../lib/pricing/variantPricingEngine";
import {
  buildCategoryForCode,
  sanitizePublicConfigOptions,
} from "../lib/buildCategory";
import { FALLBACK_OPTIONS } from "../lib/configuratorOptions";
import type {
  PrivateBulkRule,
  PrivatePricingProfile,
  PrivatePricingTier,
  PrivateVariantPricing,
} from "../lib/variants/types";

const BASE_PROFILE: PrivatePricingProfile = {
  id: "prof-1",
  code: "MS_RETAIL",
  name: "MS Retail",
  channel: "RETAIL",
  margin_type: "GROSS_MARGIN",
  default_margin_pct: 25,
  min_margin_pct: 15,
  rounding_rule: "UP_99",
  gst_rate: 18,
  gst_mode: "EXCLUSIVE",
  is_active: true,
};

const BASE_PRICING: PrivateVariantPricing = {
  variant_id: "var-1",
  manufacturing_cost: 1500,
  cost_source: "EXCEL_IMPORT",
  cost_effective_from: "2026-11-28",
  pricing_profile_id: "prof-1",
  price_override_ex_gst: null,
  price_override_inc_gst: null,
  min_selling_price: null,
  internal_notes: null,
  updated_by: "admin@example.com",
  updated_at: "2026-11-28T00:00:00Z",
};

const CHAIR_BULK: PrivateBulkRule = {
  id: "br-chair",
  product_type: "CHAIR",
  min_qty: 20,
  below_min_action: "QUOTE_REQUIRED",
  below_min_value: null,
  special_quote_qty: 50,
  special_quote_action: "QUOTE_REQUIRED",
  scope: "LINE",
  is_active: true,
};

const TABLE_BULK: PrivateBulkRule = {
  id: "br-table",
  product_type: "TABLE",
  min_qty: 10,
  below_min_action: "QUOTE_REQUIRED",
  below_min_value: null,
  special_quote_qty: 50,
  special_quote_action: "QUOTE_REQUIRED",
  scope: "LINE",
  is_active: true,
};

describe("Variant pricing formulas & protections", () => {
  it("computes cost-based markup and gross profit margin accurately", () => {
    expect(computeSellingExGstPaise(100000, "MARKUP", 25)).toBe(125000);
    expect(computeSellingExGstPaise(100000, "GROSS_MARGIN", 25)).toBe(133333);
  });

  it("applies rounding and GST inclusive/exclusive modes", () => {
    expect(applyRoundingRule(1999, "UP_99")).toBe(1999);
    expect(applyRoundingRule(2000, "UP_99")).toBe(2099);
    expect(applyGstCalculation(2000, 18, "EXCLUSIVE")).toEqual({
      unitPrice: 2000,
      gstAmount: 360,
    });
    expect(applyGstCalculation(2360, 18, "INCLUSIVE")).toEqual({
      unitPrice: 2360,
      gstAmount: 360,
    });
  });

  it("enforces minimum margin and minimum selling price floor after discounts", () => {
    const discountTier: PrivatePricingTier = {
      id: "t-1",
      scope: "PRODUCT_TYPE",
      product_type: "TABLE",
      product_id: null,
      variant_id: null,
      min_qty: 10,
      max_qty: 49,
      model: "DISCOUNT_PCT",
      value: 60, // Aggressive discount that would breach min_margin_pct (15%) & min_selling_price (2200)
      priority: 1,
      is_active: true,
    };

    const res = evaluateVariantPricing({
      variantId: "var-1",
      variantCode: "IMS-CF-42-MS-ST",
      availability: "MADE_TO_ORDER",
      leadTimeDays: 7,
      sizeCode: "4x2",
      quantity: 10,
      pricing: { ...BASE_PRICING, min_selling_price: 2200 },
      profile: { ...BASE_PROFILE, rounding_rule: "NONE" },
      bulkRule: TABLE_BULK,
      tiers: [discountTier],
    });

    expect(res.requires_quote).toBe(false);
    expect(res.unit_price).toBeGreaterThanOrEqual(2200);
  });

  it("returns quotation-required when manufacturing cost or pricing profile is missing", () => {
    const noCost = evaluateVariantPricing({
      variantId: "var-1",
      variantCode: "V1",
      availability: "MADE_TO_ORDER",
      leadTimeDays: 7,
      sizeCode: "4x2",
      quantity: 10,
      pricing: { ...BASE_PRICING, manufacturing_cost: null },
      profile: BASE_PROFILE,
      bulkRule: TABLE_BULK,
      tiers: [],
    });
    expect(noCost.requires_quote).toBe(true);
    expect(noCost.unit_price).toBeNull();

    const noProfile = evaluateVariantPricing({
      variantId: "var-1",
      variantCode: "V1",
      availability: "MADE_TO_ORDER",
      leadTimeDays: 7,
      sizeCode: "4x2",
      quantity: 10,
      pricing: BASE_PRICING,
      profile: null,
      bulkRule: TABLE_BULK,
      tiers: [],
    });
    expect(noProfile.requires_quote).toBe(true);
    expect(noProfile.unit_price).toBeNull();
  });
});

describe("Quantity boundary rules", () => {
  it("validates chair boundaries: 1, 19, 20, 21, 49, 50, 100", () => {
    for (const qty of [1, 19]) {
      const r = evaluateVariantPricing({
        variantId: "v-c",
        variantCode: "CH-1",
        availability: "MADE_TO_ORDER",
        leadTimeDays: 7,
        sizeCode: "STANDARD",
        quantity: qty,
        pricing: BASE_PRICING,
        profile: BASE_PROFILE,
        bulkRule: CHAIR_BULK,
        tiers: [],
      });
      expect(r.requires_quote).toBe(true);
      expect(r.quote_reason).toBe("BELOW_MOQ");
    }

    for (const qty of [20, 21, 49]) {
      const r = evaluateVariantPricing({
        variantId: "v-c",
        variantCode: "CH-1",
        availability: "MADE_TO_ORDER",
        leadTimeDays: 7,
        sizeCode: "STANDARD",
        quantity: qty,
        pricing: BASE_PRICING,
        profile: BASE_PROFILE,
        bulkRule: CHAIR_BULK,
        tiers: [],
      });
      expect(r.requires_quote).toBe(false);
      expect(r.total_price).toBe((r.unit_price ?? 0) * qty);
    }

    for (const qty of [50, 100]) {
      const r = evaluateVariantPricing({
        variantId: "v-c",
        variantCode: "CH-1",
        availability: "MADE_TO_ORDER",
        leadTimeDays: 7,
        sizeCode: "STANDARD",
        quantity: qty,
        pricing: BASE_PRICING,
        profile: BASE_PROFILE,
        bulkRule: CHAIR_BULK,
        tiers: [],
      });
      expect(r.requires_quote).toBe(true);
      expect(r.quote_reason).toBe("BULK_SPECIAL_QUOTE");
    }
  });

  it("validates table boundaries: 1, 9, 10, 11, 49, 50, 100", () => {
    for (const qty of [1, 9]) {
      const r = evaluateVariantPricing({
        variantId: "v-t",
        variantCode: "TB-1",
        availability: "MADE_TO_ORDER",
        leadTimeDays: 7,
        sizeCode: "4x2",
        quantity: qty,
        pricing: BASE_PRICING,
        profile: BASE_PROFILE,
        bulkRule: TABLE_BULK,
        tiers: [],
      });
      expect(r.requires_quote).toBe(true);
      expect(r.quote_reason).toBe("BELOW_MOQ");
    }

    for (const qty of [10, 11, 49]) {
      const r = evaluateVariantPricing({
        variantId: "v-t",
        variantCode: "TB-1",
        availability: "MADE_TO_ORDER",
        leadTimeDays: 7,
        sizeCode: "4x2",
        quantity: qty,
        pricing: BASE_PRICING,
        profile: BASE_PROFILE,
        bulkRule: TABLE_BULK,
        tiers: [],
      });
      expect(r.requires_quote).toBe(false);
    }

    for (const qty of [50, 100]) {
      const r = evaluateVariantPricing({
        variantId: "v-t",
        variantCode: "TB-1",
        availability: "MADE_TO_ORDER",
        leadTimeDays: 7,
        sizeCode: "4x2",
        quantity: qty,
        pricing: BASE_PRICING,
        profile: BASE_PROFILE,
        bulkRule: TABLE_BULK,
        tiers: [],
      });
      expect(r.requires_quote).toBe(true);
      expect(r.quote_reason).toBe("BULK_SPECIAL_QUOTE");
    }
  });
});

describe("Public build category & security sanitization", () => {
  it("maps internal codes to Economy, Standard, Heavy Duty and strips gauge/thickness from public options", () => {
    expect(buildCategoryForCode("G18")).toBe("Economy");
    expect(buildCategoryForCode("G16")).toBe("Standard");
    expect(buildCategoryForCode("G14")).toBe("Heavy Duty");

    const sanitized = sanitizePublicConfigOptions(FALLBACK_OPTIONS);
    const gaugeAndThickness = sanitized.filter((o) =>
      ["GAUGE", "THICKNESS", "GRADE"].includes(o.option_group)
    );
    for (const opt of gaugeAndThickness) {
      expect(["Economy", "Standard", "Heavy Duty"]).toContain(opt.label_en);
      expect(opt.label_en).not.toMatch(/gauge|18g|16g|14g|202|304|mm/i);
    }
  });
});
