import { z } from "zod";
import {
  ConfigPriceInputSchema,
  NonTableConfigSchema,
  type ConfigPriceInput,
} from "@/lib/schemas";
import type { ProductType } from "@/lib/productTypeConfig";
import { stripCostFragments } from "@/lib/sanitize";

export const BULK_ADDON_CODES = ["GROMMET", "CPU_HOLDER", "CHAIRS4"] as const;

export const BulkRowSchema = z
  .object({
    sku: z.string().trim().min(1).max(50),
    quantity: z.number().int().min(1).max(500),
    selections: z.record(z.string(), z.string()),
    addons: z.array(z.enum(BULK_ADDON_CODES)).max(3).default([]),
  })
  .strict();

export const BulkPriceRequestSchema = z
  .object({
    rows: z.array(BulkRowSchema).min(1).max(25),
  })
  .strict();

export const BulkQuoteRequestSchema = z
  .object({
    rows: z.array(BulkRowSchema).min(1).max(25),
    lead: z
      .object({
        name: z.string().trim().min(2).max(120),
        phone: z
          .string()
          .trim()
          .regex(/^[6-9]\d{9}$/),
      })
      .strict(),
    reference: z.string().trim().max(20).optional(),
  })
  .strict();

export type BulkRowInput = z.infer<typeof BulkRowSchema>;
export type BulkQuoteRequest = z.infer<typeof BulkQuoteRequestSchema>;

export interface BulkRowPrice {
  unit_price: number | null;
  total_price: number | null;
  requires_quote: boolean;
}

export interface BulkPriceResponse {
  rows: BulkRowPrice[];
  grand_total: number;
}

export interface BulkPriceSource {
  unit_price?: number;
  total_price?: number;
  requires_quote?: boolean;
}

export async function priceBulkRows(
  rows: BulkRowInput[],
  priceRow: (row: BulkRowInput) => Promise<BulkPriceSource>
): Promise<BulkPriceResponse> {
  const results: BulkRowPrice[] = [];
  let grandTotal = 0;

  for (const row of rows) {
    let price: BulkPriceSource;
    try {
      price = await priceRow(row);
    } catch {
      price = { requires_quote: true };
    }
    const requiresQuote =
      Boolean(price.requires_quote) ||
      price.unit_price == null ||
      price.total_price == null;

    results.push({
      unit_price: requiresQuote ? null : price.unit_price ?? null,
      total_price: requiresQuote ? null : price.total_price ?? null,
      requires_quote: requiresQuote,
    });

    if (!requiresQuote) {
      grandTotal += price.total_price ?? 0;
    }
  }

  return {
    rows: results,
    grand_total: Math.round(grandTotal * 100) / 100,
  };
}

export function tableInputFromBulkRow(row: BulkRowInput): ConfigPriceInput {
  const topTab = row.selections.TOP_TAB;

  if (!topTab) {
    throw new Error("Select a top type.");
  }

  if (topTab !== "FRAME_ONLY" && !row.selections.TOP_MATERIAL) {
    throw new Error("Select a top material.");
  }

  return ConfigPriceInputSchema.parse({
    sku: row.sku,
    top_tab: topTab,
    top_material: topTab === "FRAME_ONLY" ? null : row.selections.TOP_MATERIAL,
    gauge: row.selections.GAUGE,
    frame_color: row.selections.FRAME_COLOR,
    build_type: row.selections.BUILD_TYPE,
    size: row.selections.SIZE,
    addons: row.addons,
    quantity: row.quantity,
  });
}

export function nonTableInputFromBulkRow(
  row: BulkRowInput,
  productType: Exclude<ProductType, "TABLE">
) {
  if (row.addons.length > 0) {
    throw new Error("Add-ons apply only to tables.");
  }

  return NonTableConfigSchema.parse({
    product_type: productType,
    sku: row.sku,
    quantity: row.quantity,
    selections: row.selections,
  });
}

export function describeBulkRow(
  row: BulkRowInput,
  labels: Map<string, string>,
  addonLabels: Map<string, string>
): string {
  const parts: string[] = [];

  for (const [group, code] of Object.entries(row.selections)) {
    if (group === "QTY_TIER") continue;
    const label = labels.get(`${group}:${code}`) ?? code;
    parts.push(stripCostFragments(label));
  }

  for (const addon of row.addons) {
    parts.push(stripCostFragments(addonLabels.get(addon) ?? addon));
  }

  return parts.join(" • ");
}
