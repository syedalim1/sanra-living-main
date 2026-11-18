import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import { calculateSetPrice } from "@/lib/pricing/setPrice";

export interface SetSummaryItem {
  name: string;
  sku: string;
  quantity: number;
  selections: Array<{ group: string; option: string }>;
}

export interface SetSummary {
  name: string;
  sku: string;
  items: SetSummaryItem[];
  total_price: number;
  requires_quote: boolean;
}

export async function buildSetSummary(
  rawSku: string,
  itemSelections: Record<string, Record<string, string>>,
  quantity: number
): Promise<SetSummary> {
  const sku = rawSku.trim().toUpperCase();

  const { data: set } = await supabaseServer
    .from("product_sets")
    .select("id, sku, name")
    .eq("sku", sku)
    .eq("is_active", true)
    .maybeSingle();

  if (!set) throw new Error("Set not found.");

  const [{ data: items }, { data: groups }, { data: options }] = await Promise.all([
    supabaseServer
      .from("product_set_items")
      .select("id, product_id, quantity, default_selection, allow_customize, sort_order")
      .eq("set_id", set.id)
      .order("sort_order"),
    supabaseServer
      .from("product_type_option_groups")
      .select("product_type, option_group, group_title, sort_order, is_active")
      .order("sort_order"),
    supabaseServer
      .from("configurator_options")
      .select("option_group, option_code, label_en")
      .eq("is_active", true),
  ]);

  const productIds = [...new Set((items ?? []).map((item) => item.product_id))];
  const { data: products } =
    productIds.length > 0
      ? await supabaseServer
          .from("products")
          .select("id, sku, name, product_type")
          .in("id", productIds)
      : { data: [] as Array<{ id: string; sku: string; name: string; product_type: string }> };

  const productMap = new Map(
    (
      (products ?? []) as Array<{
        id: string;
        sku: string;
        name: string;
        product_type: string;
      }>
    ).map((product) => [product.id, product])
  );
  const labelMap = new Map(
    (options ?? []).map((option) => [
      `${option.option_group}:${option.option_code}`,
      option.label_en as string,
    ])
  );

  const summaryItems: SetSummaryItem[] = [];
  for (const item of items ?? []) {
    const product = productMap.get(item.product_id);
    if (!product) continue;

    const defaults = (item.default_selection ?? {}) as Record<string, string>;
    const overrides = item.allow_customize
      ? itemSelections[item.id] ?? itemSelections[item.product_id] ?? {}
      : {};
    const merged = { ...defaults, ...overrides };

    const typeGroups = (groups ?? []).filter(
      (group) =>
        group.product_type === product.product_type && group.is_active !== false
    );

    const selections: Array<{ group: string; option: string }> = [];
    for (const group of typeGroups) {
      const code = merged[group.option_group];
      if (!code) continue;
      const option = labelMap.get(`${group.option_group}:${code}`);
      if (!option) continue;
      selections.push({ group: group.group_title, option });
    }

    summaryItems.push({
      name: product.name,
      sku: product.sku,
      quantity: Math.max(1, item.quantity),
      selections,
    });
  }

  const price = await calculateSetPrice({
    sku: set.sku,
    quantity,
    item_selections: itemSelections,
  });

  return {
    name: set.name,
    sku: set.sku,
    items: summaryItems,
    total_price: price.total_price,
    requires_quote: price.requires_quote,
  };
}
