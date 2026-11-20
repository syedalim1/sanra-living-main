import { z } from "zod";
import { USE_CASES } from "@/lib/useCases";

export { USE_CASES };

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_FORMATS = ["jpeg", "png", "webp"] as const;

export function validateImageSize(size: number): void {
  if (size <= 0) throw new Error("The image file is empty.");
  if (size > MAX_IMAGE_BYTES) throw new Error("Images must be 8 MB or smaller.");
}

function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

export const PositiveMoney = z
  .number()
  .positive()
  .refine(hasAtMostTwoDecimals, { message: "Use at most 2 decimal places." });

export const NonNegativeMoney = z
  .number()
  .min(0)
  .refine(hasAtMostTwoDecimals, { message: "Use at most 2 decimal places." });

export const MaterialRateChangeSchema = z.object({
  code: z.string().trim().min(1).max(80),
  value: PositiveMoney,
});

export const GlobalChangeSchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: NonNegativeMoney,
});

export const OptionChangeSchema = z
  .object({
    code: z.string().trim().min(1).max(80),
    field: z.enum(["metal_cost_multiplier", "flat_addon"]),
    value: NonNegativeMoney,
  })
  .refine((value) => value.field !== "metal_cost_multiplier" || value.value > 0, {
    message: "Gauge multipliers must be greater than 0.",
  });

export const RateSaveInputSchema = z.object({
  materialRates: z.array(MaterialRateChangeSchema).max(200).default([]),
  globals: z.array(GlobalChangeSchema).max(100).default([]),
  options: z.array(OptionChangeSchema).max(200).default([]),
  confirmLarge: z.boolean().default(false),
});

export type RateSaveInput = z.infer<typeof RateSaveInputSchema>;

export function isLargeRateChange(oldValue: number, newValue: number): boolean {
  if (oldValue === 0) return newValue !== 0;
  return Math.abs(newValue - oldValue) / oldValue > 0.4;
}

export function formatRateNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export const MATERIAL_TAGS = ["MS", "SS", "WOOD", "GRANITE", "PLYWOOD"] as const;
export const TOP_CATEGORIES = ["WOOD", "STONE"] as const;
export const FRAME_MATERIALS = ["MS", "SS"] as const;
export const WARRANTY_PRESETS = {
  MS: "3-Yr Welding Warranty",
  SS: "3-Yr SS Replacement Guarantee",
} as const;
export const PRODUCT_TYPES = [
  "TABLE",
  "CHAIR",
  "STAND",
  "RACK",
  "SS_UNIT",
  "CHAIR_TABLE_SET",
  "BENCH_DESK",
  "COT_BUNK",
  "TROLLEY",
  "CUSTOM",
] as const;
export const VARIANT_FRAME_COLORS = [
  "MATTE_BLACK",
  "GREY",
  "SS_FINISH",
  "SS",
] as const;

export const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

const DimensionSchema = z
  .number()
  .min(1, { message: "Enter at least 1 ft." })
  .max(200)
  .refine(hasAtMostTwoDecimals, { message: "Use at most 2 decimal places." });

export const ProductFormSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(3)
    .max(50)
    .regex(SKU_PATTERN, {
      message: "Use uppercase letters, numbers and hyphens, for example IMS-CF-42.",
    }),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(2).max(80),
  product_type: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(40)
    .regex(/^[A-Z0-9_]+$/, { message: "Product type must be uppercase letters, numbers or underscores." }),
  base_length_ft: DimensionSchema,
  base_width_ft: DimensionSchema,
  base_height_ft: z.number().min(0).max(200),
  short_description: z.string().trim().max(2000).optional().default(""),
  pipe_spec: z.string().trim().max(160).optional().default(""),
  frame_material: z.enum(FRAME_MATERIALS).default("MS"),
  use_cases: z.array(z.string().trim().min(1).max(40)).max(20),
  material_tags: z.array(z.string().trim().min(1).max(40)).max(20),
  sort_order: z.number().int().min(0).max(100000),
  warranty_text: z.string().trim().min(2).max(240),
  is_active: z.boolean(),
  is_knockdown_available: z.boolean(),
  allowed_top_categories: z.array(z.enum(TOP_CATEGORIES)).max(TOP_CATEGORIES.length),
  direct_price: NonNegativeMoney.max(100000000).nullable().optional(),
  granite_top_price: NonNegativeMoney.max(100000000).nullable().optional(),
  wood_top_price: NonNegativeMoney.max(100000000).nullable().optional(),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;

export const VariantFormSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid(),
  top_material_code: z.string().trim().min(1).max(100),
  frame_color: z.enum(VARIANT_FRAME_COLORS),
  size_option: z.string().trim().min(1).max(30),
  selection_key: z.string().trim().max(300).nullable().optional(),
});

export const SwatchUpdateSchema = z.object({
  option_code: z.string().trim().min(1).max(100),
  image_url: z.string().trim().min(1).max(1000),
});

export function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseNullableNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoolean(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

export function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export function formStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}
