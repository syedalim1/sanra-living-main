import { z } from "zod";
import { STAGES } from "@/lib/tracking/types";

function atMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

const MoneySchema = z
  .number()
  .finite()
  .min(0)
  .max(100000000)
  .refine(atMostTwoDecimals, { message: "Use at most 2 decimal places." });

export const OrderLineItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  size: z.string().trim().max(80).default("Standard"),
  configuration: z.string().trim().max(600).default(""),
  quantity: z.number().int().min(1).max(999),
});

export type OrderFormValues = z.infer<typeof OrderLineItemSchema>;

const PhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: "Enter a valid 10-digit Indian mobile number." });

const OrderFieldsSchema = z.object({
  customer_name_full: z.string().trim().min(2).max(160),
  customer_phone_full: PhoneSchema,
  notes_internal: z.string().trim().max(2000).nullable().optional(),
  items: z.array(OrderLineItemSchema).min(1).max(30),
  total_amount: MoneySchema,
  advance_paid: MoneySchema,
  warranty_years: z.number().int().min(0).max(50).default(10),
});

function orderRefinement(
  value: { advance_paid: number; total_amount: number },
  ctx: z.RefinementCtx
): void {
  if (value.advance_paid > value.total_amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["advance_paid"],
      message: "Advance cannot exceed the order total.",
    });
  }
}

export const OrderCreateSchema = OrderFieldsSchema.superRefine(orderRefinement);

export const OrderUpdateSchema = OrderFieldsSchema.extend({
  delivered_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
}).superRefine(orderRefinement);

export const OrderStageSchema = z.object({
  order_id: z.string().uuid(),
  next_stage: z.enum(STAGES),
  note: z.string().trim().max(300).nullable().optional(),
  delivered_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const OrderUndoSchema = z.object({
  order_id: z.string().uuid(),
});

export const AdvanceAmountSchema = z.object({
  order_id: z.string().uuid(),
  amount: z
    .number()
    .finite()
    .positive()
    .max(100000000)
    .refine(atMostTwoDecimals, { message: "Use at most 2 decimal places." }),
});

export const OrderArchiveSchema = z.object({
  order_id: z.string().uuid(),
  archived: z.boolean(),
});

export const OrderPhotoSchema = z.object({
  order_id: z.string().uuid(),
  caption: z.string().trim().max(200).nullable().optional(),
  is_visible_to_customer: z.boolean(),
});

export const OrderPhotoVisibilitySchema = z.object({
  photo_id: z.string().uuid(),
  is_visible_to_customer: z.boolean(),
});

export const OrderPhotoDeleteSchema = z.object({
  photo_id: z.string().uuid(),
});

export function getNextStage(current: (typeof STAGES)[number]) {
  const index = STAGES.indexOf(current);
  return index >= 0 && index < STAGES.length - 1 ? STAGES[index + 1] : null;
}

export function calculateBalance(total: number, advance: number): number {
  return Math.max(0, Math.round((total - advance) * 100) / 100);
}

export function calculateWarrantyExpiry(
  deliveredOn: string | null | undefined,
  warrantyYears: number
): string | null {
  if (!deliveredOn) return null;
  const date = new Date(`${deliveredOn}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCFullYear(date.getUTCFullYear() + warrantyYears);
  return date.toISOString().slice(0, 10);
}

export function parseItemsJson(value: string): unknown {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
