import { describe, expect, it } from "vitest";
import { calculateConfigPriceRaw, roundUpToClean99 } from "../lib/pricing/pricingCore";

const baseParams = {
  base_pipe_weight_18g_kg: 14.5,
  base_length_ft: 4.0,
  base_width_ft: 2.0,
  consumables_cost: 350.0,
  labor_cost: 450.0,
  overhead_pct: 12.0,
  retail_margin_pct: 28.0,
  metal_rate_per_kg: 78.5,
  top_rate_per_sqft: 165.0,
  length_ft: 4.0,
  width_ft: 2.0,
  is_stone: false,
  is_knockdown: false,
  addons_flat_total: 0,
  quantity: 1,
  bumper_rate_per_ft: 65.0,
  center_support_flat: 280.0,
  knockdown_price_pct: 0.0,
  qty_discount_4_9_pct: 5.0,
  qty_discount_10_plus_pct: 12.0,
  ss_weight_factor: 1.05,
  is_ss: false,
};

describe("pricing engine", () => {
  it("keeps the 18G < 16G < 14G price hierarchy", () => {
    const res18G = calculateConfigPriceRaw({ ...baseParams, gauge_multiplier: 1.0 });
    const res16G = calculateConfigPriceRaw({ ...baseParams, gauge_multiplier: 1.28 });
    const res14G = calculateConfigPriceRaw({ ...baseParams, gauge_multiplier: 1.6 });

    expect(res18G.unit_price).toBeLessThan(res16G.unit_price);
    expect(res16G.unit_price).toBeLessThan(res14G.unit_price);
  });

  it("adds the protective bumper for stone tops", () => {
    const resWood = calculateConfigPriceRaw({
      ...baseParams,
      gauge_multiplier: 1.28,
      is_stone: false,
      top_rate_per_sqft: 165.0,
    });
    const resStone = calculateConfigPriceRaw({
      ...baseParams,
      gauge_multiplier: 1.28,
      is_stone: true,
      top_rate_per_sqft: 210.0,
    });

    expect(resStone.bumper_included).toBe(true);
    expect(resStone.unit_price).toBeGreaterThan(resWood.unit_price);
  });

  it("applies quantity discounts of 0%, 5% and 12%", () => {
    const resQty1 = calculateConfigPriceRaw({ ...baseParams, gauge_multiplier: 1.0, quantity: 1 });
    const resQty5 = calculateConfigPriceRaw({ ...baseParams, gauge_multiplier: 1.0, quantity: 5 });
    const resQty10 = calculateConfigPriceRaw({ ...baseParams, gauge_multiplier: 1.0, quantity: 10 });

    expect(resQty1.discount_pct).toBe(0);
    expect(resQty5.discount_pct).toBe(5);
    expect(resQty10.discount_pct).toBe(12);
  });

  it("rounds unit prices cleanly to ...99", () => {
    const prices = [1.0, 1.28, 1.6].map(
      (gauge_multiplier) => calculateConfigPriceRaw({ ...baseParams, gauge_multiplier }).unit_price
    );

    for (const price of prices) {
      expect(price % 100).toBe(99);
    }
  });

  it("rounds values below the threshold up to 99", () => {
    expect(roundUpToClean99(10)).toBe(99);
    expect(roundUpToClean99(100)).toBe(199);
    expect(roundUpToClean99(101)).toBe(199);
  });
});
