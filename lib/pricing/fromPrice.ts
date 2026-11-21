import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { calculateTypePrice } from "./typePricing";

interface RawProductData {
  id: string;
  product_type: string;
  allowed_top_categories: string[] | unknown;
}

interface RawPricingRule {
  product_id: string;
  base_pipe_weight_18g_kg: number | string | null;
  top_area_sqft: number | string | null;
  consumables_cost: number | string | null;
  labor_cost: number | string | null;
  overhead_pct: number | string | null;
  retail_margin_pct: number | string | null;
  direct_price: number | string | null;
  granite_top_price: number | string | null;
  wood_top_price: number | string | null;
}

function positiveNumberOrNull(value: number | string | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const TOP_CATEGORY_PRODUCT_TYPES = new Set(["TABLE", "CHAIR_TABLE_SET"]);

function allowedTopTabs(product: RawProductData): string[] {
  const raw = Array.isArray(product.allowed_top_categories)
    ? (product.allowed_top_categories as string[])
    : [];
  const allowed = [
    ...new Set(
      raw
        .map((code) => (code === "GRANITE" ? "STONE" : code))
        .filter((code) => code === "WOOD" || code === "STONE")
    ),
  ];

  // The public configurator shows both top families when none are restricted.
  return allowed.length > 0 ? allowed : ["WOOD", "STONE"];
}

function simplePriceFor(
  rule: RawPricingRule,
  product: RawProductData
): number | null {
  const direct = positiveNumberOrNull(rule.direct_price);

  // Non-table products use direct_price only; top overrides never apply.
  if (!TOP_CATEGORY_PRODUCT_TYPES.has(product.product_type)) {
    return direct;
  }

  // Mirror priceOverrideFor(): a top-specific price wins for that top,
  // otherwise direct_price is the fallback. Only allowed tops count.
  const prices: number[] = [];
  for (const tab of allowedTopTabs(product)) {
    const specific =
      tab === "STONE"
        ? positiveNumberOrNull(rule.granite_top_price)
        : positiveNumberOrNull(rule.wood_top_price);
    const price = specific ?? direct;
    if (price !== null) prices.push(price);
  }

  return prices.length > 0 ? Math.min(...prices) : null;
}

interface RawMaterialRate {
  material_code: string;
  category: string;
  cost_per_unit: number | string | null;
}

const CORE_TOP_MATERIALS = new Set([
  "WOOD_RUBBER_18",
  "BWR_PLY_MICA",
  "GRANITE_JET_BLACK",
  "GRANITE_GALAXY",
  "GRANITE_TAN_BROWN",
]);

/**
 * Helper to round final price UP to clean retail price ending in 99.
 * Example: 3142 becomes 3199; 3199 remains 3199; 3200 becomes 3299.
 */
function roundUpToClean99(val: number): number {
  if (val <= 99) return 99;
  return Math.ceil((val - 99) / 100) * 100 + 99;
}

/**
 * Internal calculation of from_price for all products.
 * Never leaks intermediate factors (pipe weight, labor, overhead, margin, rates).
 * Returns a map of productId -> from_price (or null if rates/rules are missing).
 */
async function computeAllFromPricesInternal(): Promise<Record<string, number | null>> {
  try {
    // 1. Fetch products. Archived products are included so the admin product
    // list can still show their price; public pages only render active rows.
    const { data: products, error: pErr } = await supabaseServer
      .from("products")
      .select("id, product_type, allowed_top_categories");

    if (pErr || !products || products.length === 0) {
      return {};
    }

    // 2. Fetch pricing rules
    const { data: rules, error: rErr } = await supabaseServer
      .from("product_pricing_rules")
      .select("*");

    if (rErr || !rules) {
      return {};
    }

    // 3. Fetch material rates
    const { data: materials, error: mErr } = await supabaseServer
      .from("material_rates")
      .select("material_code, category, cost_per_unit");

    if (mErr || !materials) {
      return {};
    }

    const globalRows = await supabaseServer
      .from("pricing_globals")
      .select("key, numeric_value");

    const globals = new Map<string, number>();
    for (const row of globalRows.data ?? []) {
      globals.set(row.key, Number(row.numeric_value));
    }

    const optionPriceRows = await supabaseServer
      .from("option_pricing")
      .select("option_code, metal_cost_multiplier, flat_addon");

    const optionPriceMap = new Map<
      string,
      { multiplier: number; flat: number }
    >();
    for (const row of optionPriceRows.data ?? []) {
      optionPriceMap.set(row.option_code, {
        multiplier: Number(row.metal_cost_multiplier),
        flat: Number(row.flat_addon),
      });
    }

    const optionMultiplier = (code: string, fallback = 1): number => {
      const value = optionPriceMap.get(code)?.multiplier;
      return value != null && Number.isFinite(value) && value > 0 ? value : fallback;
    };

    const optionFlat = (code: string): number => {
      const value = optionPriceMap.get(code)?.flat;
      return value != null && Number.isFinite(value) ? value : 0;
    };

    const rulesMap = new Map<string, RawPricingRule>();
    for (const r of rules) {
      rulesMap.set(r.product_id, r);
    }

    const materialMap = new Map<string, number>();
    for (const m of materials as RawMaterialRate[]) {
      materialMap.set(m.material_code, Number(m.cost_per_unit));
    }

    // Identify MS_CR rate. A missing rate only blocks formula-priced products;
    // products with direct_price overrides (handled above) still get a price.
    const msCrRateObj = materials.find((m) => m.material_code === "MS_CR");
    const rawMsCrRate = msCrRateObj ? Number(msCrRateObj.cost_per_unit) : NaN;
    const msCrRate =
      Number.isFinite(rawMsCrRate) && rawMsCrRate > 0 ? rawMsCrRate : null;

    const qtyDiscount4 = globals.get("QTY_DISCOUNT_4_9_PCT") ?? 5;
    const qtyDiscount10 = globals.get("QTY_DISCOUNT_10_PLUS_PCT") ?? 12;
    const ssWeightFactor = globals.get("SS_WEIGHT_FACTOR") ?? 1.05;
    const powderCoatingCost = globals.get("POWDER_COATING_COST") ?? 350;
    const ssPolishingCost = globals.get("SS_POLISHING_COST") ?? 500;

    const results: Record<string, number | null> = {};

    for (const p of products as RawProductData[]) {
      const rule = rulesMap.get(p.id);
      if (!rule) {
        results[p.id] = null;
        continue;
      }

      const simplePrice = simplePriceFor(rule, p);
      if (simplePrice !== null) {
        results[p.id] = simplePrice;
        continue;
      }

      const baseWeight = Number(rule.base_pipe_weight_18g_kg);
      const topArea = Number(rule.top_area_sqft);
      const consumables = Number(rule.consumables_cost);
      const labor = Number(rule.labor_cost);
      const overheadPct = Number(rule.overhead_pct);
      const retailMarginPct = Number(rule.retail_margin_pct);

      if (
        isNaN(baseWeight) ||
        isNaN(topArea) ||
        isNaN(consumables) ||
        isNaN(labor) ||
        isNaN(overheadPct) ||
        isNaN(retailMarginPct)
      ) {
        results[p.id] = null;
        continue;
      }

      if (p.product_type === "CHAIR") {
        if (msCrRate === null) {
          results[p.id] = null;
          continue;
        }
        const cheapestRexineFlat = Math.min(
          ...[ 
            optionFlat("REXINE_BLACK"),
            optionFlat("REXINE_TAN"),
            optionFlat("REXINE_CHERRY"),
          ]
        );
        const cheapestFrameFlat = Math.min(
          optionFlat("MATTE_BLACK"),
          optionFlat("GREY")
        );

        const price = calculateTypePrice({
          baseWeight,
          metalRate: msCrRate,
          seatArea: topArea,
          seatRate: 0,
          frameFinishingCost: powderCoatingCost,
          flatAddons: cheapestRexineFlat + cheapestFrameFlat,
          consumables,
          labor,
          overheadPct,
          retailMarginPct,
          quantity: 1,
          qtyDiscount4to9Pct: qtyDiscount4,
          qtyDiscount10PlusPct: qtyDiscount10,
          ssWeightFactor,
        });
        results[p.id] = price.unit_price;
        continue;
      }

      if (p.product_type === "STAND") {
        if (msCrRate === null) {
          results[p.id] = null;
          continue;
        }
        const price = calculateTypePrice({
          baseWeight,
          metalRate: msCrRate,
          frameFinishingCost: powderCoatingCost,
          flatAddons: Math.min(optionFlat("BASE_BUSH"), optionFlat("BASE_CASTOR")),
          consumables,
          labor,
          overheadPct,
          retailMarginPct,
          quantity: 1,
          qtyDiscount4to9Pct: qtyDiscount4,
          qtyDiscount10PlusPct: qtyDiscount10,
          ssWeightFactor,
        });
        results[p.id] = price.unit_price;
        continue;
      }

      if (p.product_type === "RACK") {
        if (msCrRate === null) {
          results[p.id] = null;
          continue;
        }
        const price = calculateTypePrice({
          baseWeight,
          metalRate: msCrRate,
          metalMultiplier: optionMultiplier("R4"),
          seatArea: topArea,
          seatRate: 0,
          frameFinishingCost: powderCoatingCost,
          flatAddons: Math.min(
            optionFlat("RF_BLACK"),
            optionFlat("RF_GOLD_PAINT"),
            optionFlat("RF_GOLD_PVD")
          ),
          consumables,
          labor,
          overheadPct,
          retailMarginPct,
          quantity: 1,
          qtyDiscount4to9Pct: qtyDiscount4,
          qtyDiscount10PlusPct: qtyDiscount10,
          ssWeightFactor,
        });
        results[p.id] = price.unit_price;
        continue;
      }

      if (p.product_type === "SS_UNIT") {
        const ssRate = materialMap.get("SS_202");
        if (!ssRate || !Number.isFinite(ssRate) || ssRate <= 0) {
          results[p.id] = null;
          continue;
        }

        const price = calculateTypePrice({
          baseWeight,
          metalRate: ssRate,
          isSS: true,
          metalMultiplier: optionMultiplier("TH_18G"),
          frameFinishingCost: ssPolishingCost,
          flatAddons: Math.min(
            optionFlat("SSF_HAIRLINE"),
            optionFlat("SSF_MIRROR")
          ),
          ssWeightFactor,
          consumables,
          labor,
          overheadPct,
          retailMarginPct,
          quantity: 1,
          qtyDiscount4to9Pct: qtyDiscount4,
          qtyDiscount10PlusPct: qtyDiscount10,
        });
        results[p.id] = price.unit_price;
        continue;
      }

      if (msCrRate === null) {
        results[p.id] = null;
        continue;
      }

      // Frame cost = metal weight x MS rate + powder-coating finishing cost
      const metalCost = baseWeight * msCrRate + powderCoatingCost;

      // Determine cheapest allowed top material rate
      let allowedCats: string[] = [];
      if (Array.isArray(p.allowed_top_categories)) {
        allowedCats = (p.allowed_top_categories as string[])
          .map((code) => (code === "GRANITE" ? "STONE" : code))
          .filter((code) => code !== "METAL");
      }

      let cheapestTopRate = 0;
      const allowsFrameOnly =
        allowedCats.includes("NONE") ||
        allowedCats.includes("FRAME_ONLY") ||
        allowedCats.length === 0 ||
        topArea === 0;

      if (!allowsFrameOnly) {
        // Find materials whose category is in allowedCats
        const matchingTops = (materials as RawMaterialRate[]).filter(
          (m) =>
            allowedCats.includes(m.category) &&
            CORE_TOP_MATERIALS.has(m.material_code) &&
            m.cost_per_unit !== null &&
            Number(m.cost_per_unit) > 0
        );

        if (matchingTops.length > 0) {
          cheapestTopRate = Math.min(...matchingTops.map((m) => Number(m.cost_per_unit)));
        } else {
          // If top category specified but no rates found, cannot safely compute
          results[p.id] = null;
          continue;
        }
      }

      // top_cost = top_area_sqft x the cheapest allowed top material's cost_per_unit
      const topCost = allowsFrameOnly ? 0 : topArea * cheapestTopRate;

      // subtotal = metal_cost + top_cost + consumables_cost + labor_cost
      const subtotal = metalCost + topCost + consumables + labor;

      // with_overhead = subtotal x (1 + overhead_pct/100)
      const withOverhead = subtotal * (1 + overheadPct / 100);

      // final = with_overhead x (1 + retail_margin_pct/100)
      const finalRaw = withOverhead * (1 + retailMarginPct / 100);

      if (isNaN(finalRaw) || finalRaw <= 0) {
        results[p.id] = null;
      } else {
        results[p.id] = roundUpToClean99(finalRaw);
      }
    }

    return results;
  } catch {
    // Fail safe, never crash
    return {};
  }
}

/**
 * Cached from-price provider (revalidates every 5 minutes / 300 seconds).
 * Ensures DB is not hit on every user visit.
 */
export const getCachedFromPrices = unstable_cache(
  async () => {
    return await computeAllFromPricesInternal();
  },
  ["sanra-products-from-prices"],
  { revalidate: 300, tags: ["sanra-from-prices"] }
);

/**
 * Public accessor returning ONLY a single number (from_price in rupees) or null.
 * Strictly guarantees no sensitive cost fields ever leak.
 */
export async function getFromPriceForProduct(productId: string): Promise<number | null> {
  const priceMap = await getCachedFromPrices();
  return priceMap[productId] ?? null;
}
