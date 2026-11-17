import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

interface RawProductData {
  id: string;
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
}

interface RawMaterialRate {
  material_code: string;
  category: string;
  cost_per_unit: number | string | null;
}

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
    // 1. Fetch active products
    const { data: products, error: pErr } = await supabaseServer
      .from("products")
      .select("id, allowed_top_categories")
      .eq("is_active", true);

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

    const rulesMap = new Map<string, RawPricingRule>();
    for (const r of rules) {
      rulesMap.set(r.product_id, r);
    }

    // Identify MS_CR rate
    const msCrRateObj = materials.find((m) => m.material_code === "MS_CR");
    const msCrRate = msCrRateObj ? Number(msCrRateObj.cost_per_unit) : null;

    if (msCrRate === null || isNaN(msCrRate) || msCrRate <= 0) {
      return {};
    }

    const results: Record<string, number | null> = {};

    for (const p of products) {
      const rule = rulesMap.get(p.id);
      if (!rule) {
        results[p.id] = null;
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

      // metal_cost = base_pipe_weight_18g_kg x MS_CR cost_per_unit
      const metalCost = baseWeight * msCrRate;

      // Determine cheapest allowed top material rate
      let allowedCats: string[] = [];
      if (Array.isArray(p.allowed_top_categories)) {
        allowedCats = p.allowed_top_categories as string[];
      }

      let cheapestTopRate = 0;
      const allowsFrameOnly =
        allowedCats.includes("NONE") ||
        allowedCats.includes("FRAME_ONLY") ||
        allowedCats.length === 0 ||
        topArea === 0;

      if (!allowsFrameOnly) {
        // Find materials whose category is in allowedCats
        const matchingTops = materials.filter(
          (m) =>
            allowedCats.includes(m.category) &&
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
