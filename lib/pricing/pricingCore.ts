// Pure formula calculation logic for unit testing and server computation
export function calculateConfigPriceRaw(params: {
  base_pipe_weight_18g_kg: number;
  base_length_ft: number;
  base_width_ft: number;
  consumables_cost: number;
  labor_cost: number;
  overhead_pct: number;
  retail_margin_pct: number;
  metal_rate_per_kg: number;
  top_rate_per_sqft: number;
  gauge_multiplier: number;
  length_ft: number;
  width_ft: number;
  is_stone: boolean;
  is_knockdown: boolean;
  addons_flat_total: number;
  quantity: number;
  bumper_rate_per_ft: number;
  center_support_flat: number;
  knockdown_price_pct: number;
  qty_discount_4_9_pct: number;
  qty_discount_10_plus_pct: number;
  ss_weight_factor: number;
  is_ss: boolean;
}): { unit_price: number; total_price: number; discount_pct: number; bumper_included: boolean } {
  const {
    base_pipe_weight_18g_kg,
    base_length_ft,
    base_width_ft,
    consumables_cost,
    labor_cost,
    overhead_pct,
    retail_margin_pct,
    metal_rate_per_kg,
    top_rate_per_sqft,
    gauge_multiplier,
    length_ft,
    width_ft,
    is_stone,
    is_knockdown,
    addons_flat_total,
    quantity,
    bumper_rate_per_ft,
    center_support_flat,
    knockdown_price_pct,
    qty_discount_4_9_pct,
    qty_discount_10_plus_pct,
    ss_weight_factor,
    is_ss,
  } = params;

  // 1. Metal scale by perimeter ratio: (L + W) / (base_L + base_W)
  const basePerimeterHalf = base_length_ft + base_width_ft;
  const currentPerimeterHalf = length_ft + width_ft;
  const metalScale = basePerimeterHalf > 0 ? currentPerimeterHalf / basePerimeterHalf : 1.0;

  // Metal weight factor for SS if applicable
  const metalWeightFactor = is_ss ? ss_weight_factor : 1.0;
  const metalCost =
    base_pipe_weight_18g_kg * metalScale * gauge_multiplier * metalWeightFactor * metal_rate_per_kg;

  // 2. Top cost: top_area x cost_per_unit
  const topArea = length_ft * width_ft;
  const topCost = topArea * top_rate_per_sqft;

  // 3. Stone protective bumper frame + center cross support
  let bumperCost = 0;
  if (is_stone) {
    const perimeterFt = 2 * (length_ft + width_ft);
    bumperCost = perimeterFt * bumper_rate_per_ft + center_support_flat;
  }

  // 4. Subtotal and overhead
  const subtotal = metalCost + topCost + bumperCost + consumables_cost + labor_cost;
  const withOverhead = subtotal * (1 + overhead_pct / 100);

  // 5. Margin and flat-pack adjustment
  let withMargin = withOverhead * (1 + retail_margin_pct / 100);
  if (is_knockdown && knockdown_price_pct !== 0) {
    withMargin = withMargin * (1 + knockdown_price_pct / 100);
  }

  // 6. Add add-ons flat prices (retail selling prices; no margin re-applied)
  const unitPriceRaw = withMargin + addons_flat_total;
  const unitPrice = roundUpToClean99(unitPriceRaw);

  // 7. Quantity tier discount
  const discountPct =
    quantity >= 10
      ? qty_discount_10_plus_pct
      : quantity >= 4
      ? qty_discount_4_9_pct
      : 0;
  const discountedUnitPrice = roundUpToClean99(
    unitPrice * (1 - discountPct / 100)
  );
  const totalPrice = Math.round(discountedUnitPrice * quantity);

  return {
    unit_price: discountedUnitPrice,
    total_price: totalPrice,
    discount_pct: discountPct,
    bumper_included: is_stone,
  };
}

export function roundUpToClean99(val: number): number {
  if (val <= 99) return 99;
  return Math.ceil((val - 99) / 100) * 100 + 99;
}

