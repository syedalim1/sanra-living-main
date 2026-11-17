import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { ConfigPriceInputSchema, type ConfigPriceInput } from "@/lib/schemas";
import { calculateConfigPriceRaw } from "./pricingCore";

export { ConfigPriceInputSchema };
export type { ConfigPriceInput };

export interface ConfigPriceOutput {
  unit_price?: number;
  total_price?: number;
  discount_pct?: number;
  bumper_included?: boolean;
  requires_quote?: boolean;
}

// Fallback pricing rules for sample SKUs (pre-DB or offline)
const FALLBACK_RULES: Record<string, {
  base_pipe_weight_18g_kg: number;
  base_length_ft: number;
  base_width_ft: number;
  top_area_sqft: number;
  consumables_cost: number;
  labor_cost: number;
  overhead_pct: number;
  retail_margin_pct: number;
  allowed_top_categories: string[];
}> = {
  "IMS-CF-42": {
    base_pipe_weight_18g_kg: 14.5,
    base_length_ft: 4.0,
    base_width_ft: 2.0,
    top_area_sqft: 8.0,
    consumables_cost: 350.0,
    labor_cost: 450.0,
    overhead_pct: 12.0,
    retail_margin_pct: 28.0,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"],
  },
  "IMS-WS-425": {
    base_pipe_weight_18g_kg: 18.2,
    base_length_ft: 4.0,
    base_width_ft: 2.5,
    top_area_sqft: 10.0,
    consumables_cost: 420.0,
    labor_cost: 550.0,
    overhead_pct: 12.0,
    retail_margin_pct: 30.0,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "METAL"],
  },
  "IMS-DN-63": {
    base_pipe_weight_18g_kg: 27.8,
    base_length_ft: 6.0,
    base_width_ft: 3.0,
    top_area_sqft: 18.0,
    consumables_cost: 650.0,
    labor_cost: 800.0,
    overhead_pct: 12.0,
    retail_margin_pct: 32.0,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"],
  },
};

const FALLBACK_MATERIAL_RATES: Record<string, number> = {
  MS_CR: 78.5,
  SS_202: 185.0,
  SS_304: 260.0,
  WOOD_RUBBER_18: 165.0,
  PRELAM_25: 95.0,
  BWR_PLY_MICA: 140.0,
  WPC_OUTDOOR: 220.0,
  GRANITE_JET_BLACK: 210.0,
  GRANITE_GALAXY: 245.0,
  GRANITE_KWHITE: 190.0,
  GRANITE_RED: 180.0,
  GRANITE_TAN_BROWN: 195.0,
  MARBLE_QUARTZ: 320.0,
  SHEET_PERFORATED: 145.0,
  SHEET_MESH: 130.0,
  SHEET_CR_16G: 180.0,
  SHEET_SS304: 380.0,
};

const FALLBACK_GLOBALS: Record<string, number> = {
  BUMPER_RATE_PER_FT: 65.0,
  CENTER_SUPPORT_FLAT: 280.0,
  KNOCKDOWN_PRICE_PCT: 0.0,
  QTY_DISCOUNT_4_9_PCT: 5.0,
  QTY_DISCOUNT_10_PLUS_PCT: 12.0,
  SS_WEIGHT_FACTOR: 1.05,
};

const GAUGE_MULTIPLIERS: Record<string, number> = {
  G18: 1.0,
  G16: 1.28,
  G14: 1.6,
  SS202: 1.0,
  SS304: 1.0,
};

const ADDON_PRICES: Record<string, number> = {
  GROMMET: 50,
  CPU_HOLDER: 150,
  CHAIRS4: 600,
};

// Size dimensions mapping: [length_ft, width_ft]
const SIZE_DIMENSIONS: Record<string, [number, number]> = {
  "2x2": [2.0, 2.0],
  "3x2": [3.0, 2.0],
  "4x2": [4.0, 2.0],
  "4x2.5": [4.0, 2.5],
  "6x3": [6.0, 3.0],
};

/**
 * Server-only engine resolving database parameters and computing price
 */
export async function calculateConfigPrice(rawInput: unknown): Promise<ConfigPriceOutput> {
  const input = ConfigPriceInputSchema.parse(rawInput);

  // Rule 8: CUSTOM size returns requires_quote: true with no price
  if (input.size === "CUSTOM") {
    return {
      requires_quote: true,
      bumper_included: input.top_tab === "STONE",
    };
  }

  const [length_ft, width_ft] = SIZE_DIMENSIONS[input.size] || [4.0, 2.0];

  // 1. Fetch Product & Pricing Rule
  let productPricing = FALLBACK_RULES[input.sku];
  let allowedTopCategories = productPricing?.allowed_top_categories || ["FRAME_ONLY", "WOOD", "STONE"];

  try {
    const { data: prodData } = await supabaseServer
      .from("products")
      .select("id, base_length_ft, base_width_ft, allowed_top_categories")
      .eq("sku", input.sku)
      .maybeSingle();

    if (prodData) {
      if (Array.isArray(prodData.allowed_top_categories)) {
        allowedTopCategories = prodData.allowed_top_categories as string[];
      }

      const { data: ruleData } = await supabaseServer
        .from("product_pricing_rules")
        .select("*")
        .eq("product_id", prodData.id)
        .maybeSingle();

      if (ruleData) {
        productPricing = {
          base_pipe_weight_18g_kg: Number(ruleData.base_pipe_weight_18g_kg),
          base_length_ft: Number(prodData.base_length_ft),
          base_width_ft: Number(prodData.base_width_ft),
          top_area_sqft: Number(ruleData.top_area_sqft),
          consumables_cost: Number(ruleData.consumables_cost),
          labor_cost: Number(ruleData.labor_cost),
          overhead_pct: Number(ruleData.overhead_pct),
          retail_margin_pct: Number(ruleData.retail_margin_pct),
          allowed_top_categories: allowedTopCategories,
        };
      }
    }
  } catch {
    // Fail silently to fallbacks
  }

  // Validity rule: reject combinations not allowed for product
  if (!allowedTopCategories.includes(input.top_tab)) {
    throw new Error("Invalid top category for this model.");
  }

  // 2. Fetch Material Rates and Globals
  const globals = { ...FALLBACK_GLOBALS };
  try {
    const { data: gData } = await supabaseServer.from("pricing_globals").select("key, numeric_value");
    if (gData) {
      for (const row of gData) {
        globals[row.key] = Number(row.numeric_value);
      }
    }
  } catch {
    // Fail silently to fallbacks
  }

  const isSS = input.gauge === "SS202" || input.gauge === "SS304";
  const metalCode = input.gauge === "SS304" ? "SS_304" : input.gauge === "SS202" ? "SS_202" : "MS_CR";
  const metalRate = FALLBACK_MATERIAL_RATES[metalCode] || 78.5;

  let topRate = 0;
  if (input.top_tab !== "FRAME_ONLY" && input.top_material) {
    let targetMatCode = "";
    try {
      const { data: optPriceData } = await supabaseServer
        .from("option_pricing")
        .select("material_code")
        .eq("option_code", input.top_material)
        .maybeSingle();
      if (optPriceData?.material_code) {
        targetMatCode = optPriceData.material_code;
      }
    } catch {
      // ignore
    }

    if (!targetMatCode) {
      if (input.top_material.startsWith("RUBBER_")) targetMatCode = "WOOD_RUBBER_18";
      else if (input.top_material.startsWith("PRELAM_")) targetMatCode = "PRELAM_25";
      else if (input.top_material.startsWith("BWR_")) targetMatCode = "BWR_PLY_MICA";
      else if (input.top_material.startsWith("WPC_")) targetMatCode = "WPC_OUTDOOR";
      else if (input.top_material === "GRANITE_JET_BLACK_OPT") targetMatCode = "GRANITE_JET_BLACK";
      else if (input.top_material === "GRANITE_GALAXY_OPT") targetMatCode = "GRANITE_GALAXY";
      else if (input.top_material === "GRANITE_KWHITE_OPT") targetMatCode = "GRANITE_KWHITE";
      else if (input.top_material === "GRANITE_RED_OPT") targetMatCode = "GRANITE_RED";
      else if (input.top_material === "GRANITE_TAN_BROWN_OPT") targetMatCode = "GRANITE_TAN_BROWN";
      else if (input.top_material.startsWith("QUARTZ_")) targetMatCode = "MARBLE_QUARTZ";
      else if (input.top_material === "SHEET_PERFORATED_OPT") targetMatCode = "SHEET_PERFORATED";
      else if (input.top_material === "SHEET_MESH_OPT") targetMatCode = "SHEET_MESH";
      else if (input.top_material === "SHEET_CR_16G_OPT") targetMatCode = "SHEET_CR_16G";
      else if (input.top_material === "SHEET_SS304_OPT") targetMatCode = "SHEET_SS304";
    }

    if (targetMatCode) {
      try {
        const { data: matData } = await supabaseServer
          .from("material_rates")
          .select("cost_per_unit")
          .eq("material_code", targetMatCode)
          .maybeSingle();
        if (matData?.cost_per_unit) {
          topRate = Number(matData.cost_per_unit);
        } else {
          topRate = FALLBACK_MATERIAL_RATES[targetMatCode] || 165.0;
        }
      } catch {
        topRate = FALLBACK_MATERIAL_RATES[targetMatCode] || 165.0;
      }
    }
  }

  // Add-ons total
  let addonsTotal = 0;
  for (const addon of input.addons) {
    addonsTotal += ADDON_PRICES[addon] || 0;
  }

  // Frame gold powder coat add-on
  if (input.frame_color === "GOLD" && !isSS) {
    addonsTotal += 150.0;
  }

  const result = calculateConfigPriceRaw({
    base_pipe_weight_18g_kg: productPricing.base_pipe_weight_18g_kg,
    base_length_ft: productPricing.base_length_ft,
    base_width_ft: productPricing.base_width_ft,
    consumables_cost: productPricing.consumables_cost,
    labor_cost: productPricing.labor_cost,
    overhead_pct: productPricing.overhead_pct,
    retail_margin_pct: productPricing.retail_margin_pct,
    metal_rate_per_kg: metalRate,
    top_rate_per_sqft: topRate,
    gauge_multiplier: GAUGE_MULTIPLIERS[input.gauge] || 1.0,
    length_ft,
    width_ft,
    is_stone: input.top_tab === "STONE",
    is_knockdown: input.build_type === "KNOCKDOWN",
    addons_flat_total: addonsTotal,
    quantity: input.quantity,
    bumper_rate_per_ft: globals.BUMPER_RATE_PER_FT,
    center_support_flat: globals.CENTER_SUPPORT_FLAT,
    knockdown_price_pct: globals.KNOCKDOWN_PRICE_PCT,
    qty_discount_4_9_pct: globals.QTY_DISCOUNT_4_9_PCT,
    qty_discount_10_plus_pct: globals.QTY_DISCOUNT_10_PLUS_PCT,
    ss_weight_factor: globals.SS_WEIGHT_FACTOR,
    is_ss: isSS,
  });

  return {
    unit_price: result.unit_price,
    total_price: result.total_price,
    discount_pct: result.discount_pct,
    bumper_included: result.bumper_included,
    requires_quote: false,
  };
}
