import { describe, expect, it } from "vitest";
import { calculatePackPrice, calculateTypePrice } from "../lib/pricing/typePricing";

const common = {
  baseWeight: 5,
  consumables: 100,
  labor: 150,
  overheadPct: 12,
  retailMarginPct: 30,
  quantity: 1,
  qtyDiscount4to9Pct: 5,
  qtyDiscount10PlusPct: 12,
  ssWeightFactor: 1.05,
};

describe("non-table pricing strategies", () => {
  it("orders SS 304 chair above SS 202 above MS", () => {
    const ms = calculateTypePrice({ ...common, metalRate: 78.5 });
    const ss202 = calculateTypePrice({ ...common, metalRate: 185, isSS: true });
    const ss304 = calculateTypePrice({ ...common, metalRate: 260, isSS: true });

    expect(ss304.unit_price).toBeGreaterThan(ss202.unit_price);
    expect(ss202.unit_price).toBeGreaterThan(ms.unit_price);
  });

  it("makes 16G SS units more expensive than 18G", () => {
    const base = {
      ...common,
      metalRate: 185,
      isSS: true,
      metalMultiplier: 1,
    };

    const thin = calculateTypePrice(base);
    const thick = calculateTypePrice({ ...base, metalMultiplier: 1.28 });

    expect(thick.unit_price).toBeGreaterThan(thin.unit_price);
  });

  it("prices a pack of two exactly PACK2_SAVING below two singles", () => {
    const single = calculateTypePrice({ ...common, metalRate: 78.5 });
    const pack = calculatePackPrice({ ...common, metalRate: 78.5 }, "PACK_2", 150);

    expect(pack.unit_price).toBe(single.unit_price * 2 - 150);
    expect(pack.total_price).toBe(pack.unit_price);
  });

  it("makes a 6 ft rack more expensive than a 4 ft rack", () => {
    const base = {
      ...common,
      metalRate: 78.5,
      seatArea: 6,
      seatRate: 0,
    };

    const short = calculateTypePrice({ ...base, metalMultiplier: 1 });
    const tall = calculateTypePrice({ ...base, metalMultiplier: 1.5 });

    expect(tall.unit_price).toBeGreaterThan(short.unit_price);
  });

  it("applies quantity discounts", () => {
    const one = calculateTypePrice({ ...common, metalRate: 78.5, quantity: 1 });
    const six = calculateTypePrice({ ...common, metalRate: 78.5, quantity: 6 });
    const twelve = calculateTypePrice({ ...common, metalRate: 78.5, quantity: 12 });

    expect(one.discount_pct).toBe(0);
    expect(six.discount_pct).toBe(5);
    expect(twelve.discount_pct).toBe(12);
  });
});
