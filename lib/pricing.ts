import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export interface PricingInput {
  productId: string;
  topMaterialCode?: string;
  frameMaterialCode?: string; // defaults to 'MS_CR' if not specified
  sizeMultiplier?: number;
  customerType?: "RETAIL" | "B2B";
}

export interface PricingResult {
  baseCost: number;
  finalPrice: number; // without GST
  gstAmount: number;  // 18% GST
  totalWithGst: number;
  customerType: "RETAIL" | "B2B";
  topMaterialName?: string;
  topMaterialCode?: string;
  frameMaterialName: string;
  isCustomQuoteRequired: boolean;
}

/**
 * Pure server-side pricing engine.
 * Never exposes raw internal margins, labor costs, overheads, or BOM rates to the client.
 */
export async function calculateProductPrice(input: PricingInput): Promise<PricingResult> {
  const {
    productId,
    topMaterialCode = "WOOD_RUBBER_18",
    frameMaterialCode = "MS_CR",
    sizeMultiplier = 1.0,
    customerType = "RETAIL",
  } = input;

  // 1. Fetch pricing rules for product
  const { data: pricingRule, error: ruleErr } = await supabaseServer
    .from("product_pricing_rules")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  // 2. Fetch rates for the chosen frame steel & top surface material
  const materialCodesToFetch = [frameMaterialCode];
  if (topMaterialCode) {
    materialCodesToFetch.push(topMaterialCode);
  }

  const { data: materials, error: matErr } = await supabaseServer
    .from("material_rates")
    .select("material_code, display_name, cost_per_unit, unit")
    .in("material_code", materialCodesToFetch);

  // Fallback defaults if database isn't populated or rules are pending
  const frameRateItem = materials?.find((m) => m.material_code === frameMaterialCode);
  const topRateItem = materials?.find((m) => m.material_code === topMaterialCode);

  const steelCostPerKg = Number(frameRateItem?.cost_per_unit ?? 78.5);
  const topCostPerSqft = Number(topRateItem?.cost_per_unit ?? (topMaterialCode.includes("GRANITE") ? 210.0 : 165.0));

  const basePipeWeight = Number(pricingRule?.base_pipe_weight_18g_kg ?? 15.0) * sizeMultiplier;
  const topAreaSqft = Number(pricingRule?.top_area_sqft ?? 8.0) * sizeMultiplier;
  const consumables = Number(pricingRule?.consumables_cost ?? 350.0);
  const labor = Number(pricingRule?.labor_cost ?? 450.0);
  const overheadPct = Number(pricingRule?.overhead_pct ?? 12.0);
  const retailMarginPct = Number(pricingRule?.retail_margin_pct ?? 28.0);
  const b2bMarginPct = Number(pricingRule?.b2b_margin_pct ?? 16.0);

  // Raw Manufacturing Cost
  const steelCost = basePipeWeight * steelCostPerKg;
  const topCost = topAreaSqft * topCostPerSqft;
  const primeCost = steelCost + topCost + consumables + labor;

  // Add Overhead
  const costWithOverhead = primeCost * (1 + overheadPct / 100);

  // Apply margin based on customer type
  const marginPct = customerType === "B2B" ? b2bMarginPct : retailMarginPct;
  const finalPrice = Math.round(costWithOverhead * (1 + marginPct / 100));

  // 18% GST (Harmonized Furniture Steel Code)
  const gstAmount = Math.round(finalPrice * 0.18);
  const totalWithGst = finalPrice + gstAmount;

  return {
    baseCost: Math.round(costWithOverhead),
    finalPrice,
    gstAmount,
    totalWithGst,
    customerType,
    topMaterialName: topRateItem?.display_name ?? "100% Seasoned Grade-A Hardwood",
    topMaterialCode,
    frameMaterialName: frameRateItem?.display_name ?? "Heavy Structural MS Pipe",
    isCustomQuoteRequired: false,
  };
}
