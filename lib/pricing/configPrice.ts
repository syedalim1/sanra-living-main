import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import {
  ConfigPriceInputSchema,
  ConfigEnvelopeSchema,
  NonTableConfigSchema,
  type ConfigPriceInput,
  type NonTableConfigInput,
} from "@/lib/schemas";
import {
  FALLBACK_OPTIONS,
  type ConfigOption,
} from "@/lib/configuratorOptions";
import {
  getTypeGroupRows,
  isProductType,
  type ProductType,
} from "@/lib/productTypeConfig";
import { calculateConfigPriceRaw } from "./pricingCore";
import { calculatePackPrice, calculateTypePrice } from "./typePricing";

export { ConfigPriceInputSchema };
export type { ConfigPriceInput };

export interface ConfigPriceOutput {
  unit_price?: number;
  total_price?: number;
  discount_pct?: number;
  bumper_included?: boolean;
  requires_quote?: boolean;
}

interface FallbackRule {
  product_type: ProductType;
  base_pipe_weight_18g_kg: number;
  base_length_ft: number;
  base_width_ft: number;
  top_area_sqft: number;
  consumables_cost: number;
  labor_cost: number;
  overhead_pct: number;
  retail_margin_pct: number;
  allowed_top_categories: string[];
}

const FALLBACK_RULES: Record<string, FallbackRule> = {
  "IMS-CF-42": {
    product_type: "TABLE",
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
    product_type: "TABLE",
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
    product_type: "TABLE",
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
  "IMS-CH-01": {
    product_type: "CHAIR",
    base_pipe_weight_18g_kg: 4.5,
    base_length_ft: 1.5,
    base_width_ft: 1.5,
    top_area_sqft: 2.25,
    consumables_cost: 120.0,
    labor_cost: 180.0,
    overhead_pct: 12.0,
    retail_margin_pct: 35.0,
    allowed_top_categories: [],
  },
  "IMS-CH-BS": {
    product_type: "CHAIR",
    base_pipe_weight_18g_kg: 5.2,
    base_length_ft: 1.4,
    base_width_ft: 1.4,
    top_area_sqft: 2.0,
    consumables_cost: 140.0,
    labor_cost: 210.0,
    overhead_pct: 12.0,
    retail_margin_pct: 35.0,
    allowed_top_categories: [],
  },
  "IMS-ST-12": {
    product_type: "STAND",
    base_pipe_weight_18g_kg: 2.5,
    base_length_ft: 1.0,
    base_width_ft: 1.0,
    top_area_sqft: 0,
    consumables_cost: 60.0,
    labor_cost: 100.0,
    overhead_pct: 12.0,
    retail_margin_pct: 38.0,
    allowed_top_categories: [],
  },
  "IMS-ST-INV": {
    product_type: "STAND",
    base_pipe_weight_18g_kg: 4.0,
    base_length_ft: 1.5,
    base_width_ft: 1.0,
    top_area_sqft: 0,
    consumables_cost: 90.0,
    labor_cost: 140.0,
    overhead_pct: 12.0,
    retail_margin_pct: 38.0,
    allowed_top_categories: [],
  },
  "IMS-ST-KD": {
    product_type: "STAND",
    base_pipe_weight_18g_kg: 3.2,
    base_length_ft: 1.2,
    base_width_ft: 1.2,
    top_area_sqft: 0,
    consumables_cost: 80.0,
    labor_cost: 120.0,
    overhead_pct: 12.0,
    retail_margin_pct: 38.0,
    allowed_top_categories: [],
  },
  "IMS-RK-01": {
    product_type: "RACK",
    base_pipe_weight_18g_kg: 8.5,
    base_length_ft: 4.0,
    base_width_ft: 1.5,
    top_area_sqft: 6.0,
    consumables_cost: 180.0,
    labor_cost: 300.0,
    overhead_pct: 12.0,
    retail_margin_pct: 35.0,
    allowed_top_categories: [],
  },
  "IMS-SS-CT": {
    product_type: "SS_UNIT",
    base_pipe_weight_18g_kg: 14.0,
    base_length_ft: 4.0,
    base_width_ft: 2.0,
    top_area_sqft: 0,
    consumables_cost: 300.0,
    labor_cost: 450.0,
    overhead_pct: 12.0,
    retail_margin_pct: 32.0,
    allowed_top_categories: [],
  },
};

const FALLBACK_MATERIAL_RATES: Record<string, number> = {
  MS_CR: 78.5,
  SS_202: 185.0,
  SS_304: 260.0,
  WOOD_RUBBER_18: 165.0,
  PRELAM_18: 68.0,
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
  PACK2_SAVING: 150.0,
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

const SIZE_DIMENSIONS: Record<string, [number, number]> = {
  "2x2": [2.0, 2.0],
  "3x2": [3.0, 2.0],
  "4x2": [4.0, 2.0],
  "4x2.5": [4.0, 2.5],
  "6x3": [6.0, 3.0],
};

interface FallbackOptionPrice {
  material_code?: string | null;
  multiplier?: number;
  flat?: number;
  perSqft?: number;
  appliesTo?: "FLAT" | "METAL_WEIGHT" | "TOP_AREA" | "PER_UNIT";
}

const FALLBACK_OPTION_PRICING: Record<string, FallbackOptionPrice> = {
  MS_COATED: { material_code: "MS_CR" },
  SS202: { material_code: "SS_202" },
  SS304: { material_code: "SS_304" },
  SEAT_RUBBER: { material_code: "WOOD_RUBBER_18" },
  SEAT_REXINE: { material_code: null },
  SEAT_PERFORATED: { material_code: "SHEET_PERFORATED" },
  REXINE_BLACK: { flat: 0 },
  REXINE_TAN: { flat: 0 },
  REXINE_CHERRY: { flat: 0 },
  MATTE_BLACK: { flat: 0 },
  WHITE: { flat: 0 },
  GREY: { flat: 0 },
  GOLD: { flat: 150 },
  WELDED: { flat: 0 },
  KNOCKDOWN: { flat: 0 },
  ST_MS: { material_code: "MS_CR" },
  ST_SS304: { material_code: "SS_304" },
  PACK_1: { flat: 0 },
  PACK_2: { flat: 0 },
  BASE_BUSH: { flat: 0 },
  BASE_CASTOR: { flat: 350 },
  RF_BLACK: { flat: 0 },
  RF_GOLD_PAINT: { flat: 450 },
  RF_GOLD_PVD: { flat: 900 },
  SH_NONE: { material_code: null },
  SH_RUBBER: { material_code: "WOOD_RUBBER_18" },
  SH_PRELAM_WHITE: { material_code: "PRELAM_18" },
  SH_PRELAM_BLACK: { material_code: "PRELAM_18" },
  R4: { multiplier: 1.0 },
  R5: { multiplier: 1.25 },
  R6: { multiplier: 1.5 },
  SSG_202: { material_code: "SS_202" },
  SSG_304: { material_code: "SS_304" },
  TH_18G: { multiplier: 1.0 },
  TH_16G: { multiplier: 1.28 },
  SSF_HAIRLINE: { flat: 0 },
  SSF_MIRROR: { flat: 350 },
};

const FALLBACK_MATERIAL_CODES: Record<string, string | null> = {
  MS_COATED: "MS_CR",
  SS202: "SS_202",
  SS304: "SS_304",
  ST_MS: "MS_CR",
  ST_SS304: "SS_304",
  SEAT_RUBBER: "WOOD_RUBBER_18",
  SEAT_REXINE: null,
  SEAT_PERFORATED: "SHEET_PERFORATED",
  SH_NONE: null,
  SH_RUBBER: "WOOD_RUBBER_18",
  SH_PRELAM_WHITE: "PRELAM_18",
  SH_PRELAM_BLACK: "PRELAM_18",
  SSG_202: "SS_202",
  SSG_304: "SS_304",
};

interface NonTableData {
  rule: FallbackRule;
  groups: ReturnType<typeof getTypeGroupRows>;
  options: Map<string, ConfigOption>;
  optionPrices: Map<string, FallbackOptionPrice>;
  materials: Record<string, number>;
  globals: Record<string, number>;
}

function safeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getProductTypeForSku(sku: string): Promise<ProductType> {
  const normalized = sku.trim().toUpperCase();

  try {
    const { data } = await supabaseServer
      .from("products")
      .select("product_type")
      .eq("sku", normalized)
      .maybeSingle();

    if (data?.product_type && isProductType(data.product_type)) {
      return data.product_type;
    }
  } catch {
    // Fall through to static fallback metadata.
  }

  return FALLBACK_RULES[normalized]?.product_type ?? "TABLE";
}

export async function parseNonTableConfig(rawInput: unknown): Promise<NonTableConfigInput> {
  const envelope = ConfigEnvelopeSchema.safeParse(rawInput);
  if (!envelope.success || !envelope.data.selections) {
    throw new Error("Invalid configuration.");
  }

  const productType = await getProductTypeForSku(envelope.data.sku);
  if (productType === "TABLE") {
    throw new Error("Invalid configuration.");
  }

  const sku = envelope.data.sku.trim().toUpperCase();
  const selections = envelope.data.selections;

  try {
    const { data: product } = await supabaseServer
      .from("products")
      .select("id, product_type")
      .eq("sku", sku)
      .maybeSingle();

    const [groupResult, optionResult] = await Promise.all([
      supabaseServer
        .from("product_type_option_groups")
        .select("*")
        .eq("product_type", productType)
        .order("sort_order"),
      supabaseServer
        .from("configurator_options")
        .select("option_group, option_code, is_active")
        .eq("is_active", true),
    ]);

    const groups = (groupResult.data ?? []).filter(
      (group) => group.is_active !== false
    );
    const options = optionResult.data ?? [];

    if (groups.length > 0 && options.length > 0) {
      const disabled = new Set<string>();
      if (product?.id) {
        const { data: availability } = await supabaseServer
          .from("product_option_availability")
          .select("option_code, is_enabled")
          .eq("product_id", product.id);

        for (const row of availability ?? []) {
          if (!row.is_enabled) disabled.add(row.option_code);
        }
      }

      const groupCodes = new Set(groups.map((group) => group.option_group));
      const allowed = new Set<string>();

      for (const option of options) {
        if (!groupCodes.has(option.option_group)) continue;
        if (disabled.has(option.option_code)) continue;
        allowed.add(`${option.option_group}:${option.option_code}`);
      }

      for (const [group, code] of Object.entries(selections)) {
        if (!groupCodes.has(group)) throw new Error("Invalid configuration.");
        if (!allowed.has(`${group}:${code}`)) throw new Error("Invalid configuration.");
      }

      for (const group of groups) {
        if (
          group.is_required &&
          group.option_group !== "QTY_TIER" &&
          !selections[group.option_group]
        ) {
          throw new Error("Invalid configuration.");
        }
      }

      return {
        product_type: productType,
        sku,
        quantity: envelope.data.quantity,
        selections,
      } as NonTableConfigInput;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid configuration.") {
      throw error;
    }
  }

  const parsed = NonTableConfigSchema.safeParse({
    product_type: productType,
    sku,
    quantity: envelope.data.quantity,
    selections,
  });

  if (!parsed.success) {
    throw new Error("Invalid configuration.");
  }

  return parsed.data;
}

async function loadNonTableData(input: NonTableConfigInput): Promise<NonTableData> {
  const fallback = FALLBACK_RULES[input.sku];
  let rule: FallbackRule | null = fallback ?? null;
  let productTypeMismatch = false;
  const disabledOptionCodes = new Set<string>();

  try {
    const { data: product } = await supabaseServer
      .from("products")
      .select("id, product_type, name")
      .eq("sku", input.sku)
      .maybeSingle();

    if (product) {
      if (product.product_type !== input.product_type) {
        productTypeMismatch = true;
      } else {
        const { data: availability } = await supabaseServer
          .from("product_option_availability")
          .select("option_code, is_enabled")
          .eq("product_id", product.id);

        for (const row of availability ?? []) {
          if (!row.is_enabled) disabledOptionCodes.add(row.option_code);
        }
        const { data: ruleData } = await supabaseServer
          .from("product_pricing_rules")
          .select("*")
          .eq("product_id", product.id)
          .maybeSingle();

        if (ruleData) {
          rule = {
            product_type: input.product_type,
            base_pipe_weight_18g_kg: Number(ruleData.base_pipe_weight_18g_kg),
            base_length_ft: 0,
            base_width_ft: 0,
            top_area_sqft: Number(ruleData.top_area_sqft),
            consumables_cost: Number(ruleData.consumables_cost),
            labor_cost: Number(ruleData.labor_cost),
            overhead_pct: Number(ruleData.overhead_pct),
            retail_margin_pct: Number(ruleData.retail_margin_pct),
            allowed_top_categories: [],
          };
        }
      }
    }
  } catch {
    // Keep fallback rule on any read failure.
  }

  if (productTypeMismatch) {
    throw new Error("Invalid configuration.");
  }

  if (!rule) {
    throw new Error("Pricing data unavailable.");
  }

  let groups = getTypeGroupRows(input.product_type);

  try {
    const { data } = await supabaseServer
      .from("product_type_option_groups")
      .select("*")
      .eq("product_type", input.product_type)
      .order("sort_order");

    if (data && data.length > 0) {
      groups = getTypeGroupRows(input.product_type, data);
    }
  } catch {
    // Keep static group mapping.
  }

  const dbOptions: ConfigOption[] = [];

  try {
    const { data } = await supabaseServer
      .from("configurator_options")
      .select(
        "option_group, option_code, parent_code, label_en, swatch_color_hex, warranty_text, badge_text, spec_note, sort_order"
      )
      .eq("is_active", true);

    if (data) {
      dbOptions.push(...(data as ConfigOption[]));
    }
  } catch {
    // Keep static option metadata.
  }

  const optionMap = new Map<string, ConfigOption>();
  for (const option of [...FALLBACK_OPTIONS, ...dbOptions]) {
    if (disabledOptionCodes.has(option.option_code)) continue;
    optionMap.set(`${option.option_group}:${option.option_code}`, option);
  }

  const optionPrices = new Map<string, FallbackOptionPrice>();
  for (const [code, price] of Object.entries(FALLBACK_OPTION_PRICING)) {
    optionPrices.set(code, price);
  }

  try {
    const { data } = await supabaseServer
      .from("option_pricing")
      .select(
        "option_code, material_code, metal_cost_multiplier, flat_addon, per_sqft_addon, applies_to"
      );

    if (data) {
      for (const row of data) {
        optionPrices.set(row.option_code, {
          material_code: row.material_code ?? null,
          multiplier: Number(row.metal_cost_multiplier),
          flat: Number(row.flat_addon),
          perSqft: Number(row.per_sqft_addon ?? 0),
          appliesTo: row.applies_to ?? "FLAT",
        });
      }
    }
  } catch {
    // Keep static option prices.
  }

  const materials: Record<string, number> = { ...FALLBACK_MATERIAL_RATES };

  try {
    const { data } = await supabaseServer
      .from("material_rates")
      .select("material_code, cost_per_unit");

    if (data) {
      for (const row of data) {
        materials[row.material_code] = Number(row.cost_per_unit);
      }
    }
  } catch {
    // Keep static material rates.
  }

  const globals: Record<string, number> = { ...FALLBACK_GLOBALS };

  try {
    const { data } = await supabaseServer
      .from("pricing_globals")
      .select("key, numeric_value");

    if (data) {
      for (const row of data) {
        globals[row.key] = Number(row.numeric_value);
      }
    }
  } catch {
    // Keep static globals.
  }

  return { rule, groups, options: optionMap, optionPrices, materials, globals };
}

function materialCodeFor(
  code: string,
  optionPrices: Map<string, FallbackOptionPrice>
): string | null {
  const price = optionPrices.get(code);
  if (price && price.material_code !== undefined) {
    return price.material_code;
  }
  return FALLBACK_MATERIAL_CODES[code] ?? null;
}

function materialRateFor(code: string | null, materials: Record<string, number>): number {
  if (!code) return 0;
  const rate = Number(materials[code]);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Pricing data unavailable.");
  }
  return rate;
}

function optionAdjustments(
  selections: Record<string, string | undefined>,
  optionPrices: Map<string, FallbackOptionPrice>,
  areaSqft: number
): { flat: number; metalMultiplier: number } {
  let flat = 0;
  let metalMultiplier = 1;

  for (const code of Object.values(selections)) {
    if (!code) continue;
    const price = optionPrices.get(code);
    if (!price) continue;

    switch (price.appliesTo ?? "FLAT") {
      case "METAL_WEIGHT": {
        const multiplier = Number(price.multiplier ?? 1);
        if (Number.isFinite(multiplier) && multiplier > 0) {
          metalMultiplier *= multiplier;
        }
        break;
      }
      case "TOP_AREA": {
        const perSqft = Number(price.perSqft ?? 0);
        if (Number.isFinite(perSqft)) flat += perSqft * areaSqft;
        break;
      }
      default: {
        const amount = Number(price.flat ?? 0);
        if (Number.isFinite(amount)) flat += amount;
      }
    }
  }

  return { flat, metalMultiplier };
}

async function calculateNonTableConfigPrice(
  input: NonTableConfigInput
): Promise<ConfigPriceOutput> {
  const { rule, groups, options, optionPrices, materials, globals } =
    await loadNonTableData(input);

  const allowedGroups = new Set(groups.map((group) => group.option_group));

  for (const group of Object.keys(input.selections)) {
    if (!allowedGroups.has(group)) {
      throw new Error("Invalid configuration.");
    }
  }

  const selectionMap = input.selections as Record<string, string | undefined>;

  for (const group of groups) {
    if (
      group.is_required &&
      group.option_group !== "QTY_TIER" &&
      !selectionMap[group.option_group]
    ) {
      throw new Error("Invalid configuration.");
    }
  }

  for (const [group, code] of Object.entries(input.selections)) {
    if (!options.has(`${group}:${code}`)) {
      throw new Error("Invalid configuration.");
    }
  }

  const baseWeight = Number(rule.base_pipe_weight_18g_kg);
  const consumables = Number(rule.consumables_cost);
  const labor = Number(rule.labor_cost);
  const overheadPct = Number(rule.overhead_pct);
  const retailMarginPct = Number(rule.retail_margin_pct);
  const topArea = Number(rule.top_area_sqft);

  if (
    !Number.isFinite(baseWeight) ||
    !Number.isFinite(consumables) ||
    !Number.isFinite(labor) ||
    !Number.isFinite(overheadPct) ||
    !Number.isFinite(retailMarginPct) ||
    !Number.isFinite(topArea)
  ) {
    throw new Error("Pricing data unavailable.");
  }

  const common = {
    baseWeight,
    consumables,
    labor,
    overheadPct,
    retailMarginPct,
    quantity: input.quantity,
    qtyDiscount4to9Pct: safeNumber(globals.QTY_DISCOUNT_4_9_PCT, 5),
    qtyDiscount10PlusPct: safeNumber(globals.QTY_DISCOUNT_10_PLUS_PCT, 12),
    ssWeightFactor: safeNumber(globals.SS_WEIGHT_FACTOR, 1.05),
  };

  const selectionMapAll = input.selections as Record<string, string | undefined>;
  const adjustments = optionAdjustments(selectionMapAll, optionPrices, topArea);

  if (input.product_type === "CHAIR") {
    const metalCode = input.selections.METAL_TYPE;
    const metalRate = materialRateFor(materialCodeFor(metalCode, optionPrices), materials);
    const seatMaterial = materialCodeFor(input.selections.SEAT, optionPrices);
    const seatRate = seatMaterial ? materialRateFor(seatMaterial, materials) : 0;

    const result = calculateTypePrice({
      ...common,
      metalRate,
      metalMultiplier: adjustments.metalMultiplier,
      isSS: metalCode !== "MS_COATED",
      seatArea: topArea,
      seatRate,
      flatAddons: adjustments.flat,
      isKnockdown: input.selections.BUILD_TYPE === "KNOCKDOWN",
      knockdownPct: safeNumber(globals.KNOCKDOWN_PRICE_PCT, 0),
    });

    return { ...result, requires_quote: false };
  }

  if (input.product_type === "STAND") {
    const metalRate = materialRateFor(
      materialCodeFor(input.selections.STAND_MATERIAL, optionPrices),
      materials
    );

    const result = calculatePackPrice(
      {
        ...common,
        metalRate,
        metalMultiplier: adjustments.metalMultiplier,
        isSS: input.selections.STAND_MATERIAL === "ST_SS304",
        flatAddons: adjustments.flat,
      },
      input.selections.PACK,
      safeNumber(globals.PACK2_SAVING, 150)
    );

    return { ...result, requires_quote: false };
  }

  if (input.product_type === "RACK") {
    const shelfMaterial = materialCodeFor(input.selections.SHELF, optionPrices);
    const shelfRate = shelfMaterial ? materialRateFor(shelfMaterial, materials) : 0;

    const result = calculateTypePrice({
      ...common,
      metalRate: materialRateFor("MS_CR", materials),
      metalMultiplier: adjustments.metalMultiplier,
      seatArea: topArea,
      seatRate: shelfRate,
      flatAddons: adjustments.flat,
    });

    return { ...result, requires_quote: false };
  }

  const metalRate = materialRateFor(
    materialCodeFor(input.selections.GRADE, optionPrices),
    materials
  );

  const result = calculateTypePrice({
    ...common,
    metalRate,
    metalMultiplier: adjustments.metalMultiplier,
    isSS: true,
    flatAddons: adjustments.flat,
  });

  return { ...result, requires_quote: false };
}

export async function calculateConfigPrice(rawInput: unknown): Promise<ConfigPriceOutput> {
  const envelope = ConfigEnvelopeSchema.safeParse(rawInput);
  if (!envelope.success) {
    throw new Error("Invalid configuration.");
  }

  const productType = await getProductTypeForSku(envelope.data.sku);

  if (productType === "TABLE") {
    return await calculateTableConfigPrice(rawInput);
  }

  const parsed = await parseNonTableConfig(rawInput);
  return await calculateNonTableConfigPrice(parsed);
}

async function calculateTableConfigPrice(rawInput: unknown): Promise<ConfigPriceOutput> {
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
          product_type: "TABLE",
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

  if (!productPricing) {
    throw new Error("Pricing data unavailable.");
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
