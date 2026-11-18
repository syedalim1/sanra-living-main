import "server-only";

import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { calculateConfigPrice } from "@/lib/pricing/configPrice";
import { getTypeGroupRows, isProductType, type ProductType } from "@/lib/productTypeConfig";

export const SetPriceInputSchema = z.object({
  sku: z.string().min(1).max(60),
  quantity: z.number().int().min(1).max(50).default(1),
  item_selections: z
    .record(z.string(), z.record(z.string(), z.string()))
    .optional()
    .default({}),
});

export type SetPriceInput = z.infer<typeof SetPriceInputSchema>;

export interface SetPriceOutput {
  unit_price: number;
  total_price: number;
  requires_quote: boolean;
}

function roundUpTo99(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 99;
  return Math.ceil((value + 1) / 100) * 100 - 1;
}

interface SetItemRow {
  id: string;
  product_id: string;
  quantity: number;
  default_selection: Record<string, unknown> | null;
  allow_customize: boolean;
  sort_order: number;
}

interface ProductRow {
  id: string;
  sku: string;
  product_type: string;
}

interface GroupRow {
  product_type: string;
  option_group: string;
  group_title: string;
  sort_order: number;
  is_required: boolean;
  default_code: string | null;
  is_active?: boolean;
}

interface OptionRow {
  option_code: string;
  option_group: string;
  parent_code: string | null;
  sort_order: number;
}

function pickDefaults(
  productType: ProductType,
  groups: GroupRow[],
  options: OptionRow[],
  defaults: Record<string, unknown>,
  overrides: Record<string, string>
): Record<string, string> {
  const selections: Record<string, string> = {};
  const disabled = new Set<string>();

  for (const group of groups) {
    const groupOptions = options
      .filter((option) => option.option_group === group.option_group)
      .sort((a, b) => Number(a.sort_order ?? 100) - Number(b.sort_order ?? 100))
      .filter((option) => !disabled.has(option.option_code));

    if (groupOptions.length === 0) continue;

    const saved = defaults[group.option_group];
    const override = overrides[group.option_group];
    const preferred =
      (typeof override === "string" && override) ||
      (typeof saved === "string" && saved) ||
      group.default_code ||
      groupOptions[0].option_code;

    const match = groupOptions.find((option) => option.option_code === preferred);
    selections[group.option_group] = match?.option_code ?? groupOptions[0].option_code;
  }

  // Extra overrides for groups that may not be visible in defaults.
  for (const [group, code] of Object.entries(overrides)) {
    if (code) selections[group] = code;
  }

  void productType;
  return selections;
}

async function buildEnvelope(
  product: ProductRow,
  defaults: Record<string, unknown>,
  overrides: Record<string, string>
): Promise<unknown> {
  if (!isProductType(product.product_type)) {
    throw new Error("Invalid product type.");
  }

  const [groupResult, optionResult] = await Promise.all([
    supabaseServer
      .from("product_type_option_groups")
      .select("*")
      .eq("product_type", product.product_type)
      .order("sort_order"),
    supabaseServer
      .from("configurator_options")
      .select("option_code, option_group, parent_code, sort_order")
      .eq("is_active", true),
  ]);

  const groups = (groupResult.data && groupResult.data.length > 0
    ? getTypeGroupRows(product.product_type, groupResult.data)
    : getTypeGroupRows(product.product_type)) as GroupRow[];
  const options = (optionResult.data ?? []) as OptionRow[];

  const selections = pickDefaults(
    product.product_type,
    groups.filter((group) => group.is_active !== false),
    options,
    defaults,
    overrides
  );

  if (product.product_type === "TABLE") {
    const topTab = selections.TOP_TAB || "FRAME_ONLY";
    const addons = selections.ADDON
      ? [selections.ADDON]
      : Array.isArray(defaults.addons)
      ? defaults.addons.filter((value): value is string => typeof value === "string")
      : [];

    return {
      sku: product.sku,
      top_tab: topTab,
      top_material: topTab === "FRAME_ONLY" ? null : selections.TOP_MATERIAL ?? null,
      gauge: selections.GAUGE || "G16",
      frame_color: selections.FRAME_COLOR || "MATTE_BLACK",
      build_type: selections.BUILD_TYPE || "WELDED",
      size: selections.SIZE || "4x2",
      addons,
      quantity: 1,
    };
  }

  return {
    sku: product.sku,
    quantity: 1,
    selections,
  };
}

export async function calculateSetPrice(rawInput: unknown): Promise<SetPriceOutput> {
  const parsed = SetPriceInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error("Invalid set configuration.");

  const sku = parsed.data.sku.trim().toUpperCase();

  const { data: set } = await supabaseServer
    .from("product_sets")
    .select("id, sku, is_active")
    .eq("sku", sku)
    .eq("is_active", true)
    .maybeSingle();

  if (!set) throw new Error("Set not found.");

  const [{ data: items }, { data: pricing }] = await Promise.all([
    supabaseServer
      .from("product_set_items")
      .select("id, product_id, quantity, default_selection, allow_customize, sort_order")
      .eq("set_id", set.id)
      .order("sort_order"),
    supabaseServer
      .from("set_pricing")
      .select("adjustment_type, adjustment_value")
      .eq("set_id", set.id)
      .maybeSingle(),
  ]);

  const setItems = (items ?? []) as SetItemRow[];
  if (setItems.length === 0) throw new Error("Set has no items.");

  const productIds = [...new Set(setItems.map((item) => item.product_id))];
  const { data: productRows } = await supabaseServer
    .from("products")
    .select("id, sku, product_type")
    .in("id", productIds)
    .eq("is_active", true);

  const productMap = new Map(
    ((productRows ?? []) as ProductRow[]).map((product) => [product.id, product])
  );

  let itemsTotal = 0;
  let requiresQuote = false;

  for (const item of setItems) {
    const product = productMap.get(item.product_id);
    if (!product) {
      requiresQuote = true;
      continue;
    }

    const overrides =
      parsed.data.item_selections[item.id] ??
      parsed.data.item_selections[item.product_id] ??
      {};

    try {
      const envelope = await buildEnvelope(
        product,
        (item.default_selection ?? {}) as Record<string, unknown>,
        item.allow_customize ? overrides : {}
      );
      const price = await calculateConfigPrice(envelope);

      if (price.requires_quote || price.unit_price == null) {
        requiresQuote = true;
        continue;
      }

      itemsTotal += Number(price.unit_price) * Math.max(1, item.quantity);
    } catch {
      requiresQuote = true;
    }
  }

  if (requiresQuote) {
    return { unit_price: 0, total_price: 0, requires_quote: true };
  }

  let adjusted = itemsTotal;
  if (pricing) {
    const value = Number(pricing.adjustment_value);
    if (Number.isFinite(value)) {
      adjusted =
        pricing.adjustment_type === "PERCENT"
          ? itemsTotal * (1 + value / 100)
          : itemsTotal + value;
    }
  }

  const unitPrice = roundUpTo99(adjusted);
  const totalPrice = unitPrice * parsed.data.quantity;

  return { unit_price: unitPrice, total_price: totalPrice, requires_quote: false };
}
