import { z } from "zod";

export const ConfigPriceInputSchema = z.object({
  sku: z.string().min(1).max(50),
  top_tab: z.enum(["FRAME_ONLY", "WOOD", "STONE", "METAL"]),
  top_material: z.string().nullable().optional(),
  gauge: z.enum(["G18", "G16", "G14", "SS202", "SS304"]),
  frame_color: z.enum(["MATTE_BLACK", "WHITE", "GREY", "RAW", "GOLD"]),
  build_type: z.enum(["WELDED", "KNOCKDOWN"]),
  size: z.enum(["2x2", "3x2", "4x2", "4x2.5", "6x3", "CUSTOM"]),
  addons: z.array(z.enum(["GROMMET", "CPU_HOLDER", "CHAIRS4"])).default([]),
  quantity: z.number().int().min(1).max(500).default(1),
});

export type ConfigPriceInput = z.infer<typeof ConfigPriceInputSchema>;

const CustomDimensionSchema = z
  .number()
  .min(1)
  .max(12)
  .refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9, {
    message: "Dimensions must use at most one decimal place.",
  });

export const WhatsAppLinkInputSchema = ConfigPriceInputSchema.extend({
  custom_length_ft: CustomDimensionSchema.optional(),
  custom_width_ft: CustomDimensionSchema.optional(),
  pin: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
}).superRefine((value, ctx) => {
  if (value.size !== "CUSTOM") return;

  if (value.custom_length_ft === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["custom_length_ft"],
      message: "Length is required for a custom size.",
    });
  }

  if (value.custom_width_ft === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["custom_width_ft"],
      message: "Width is required for a custom size.",
    });
  }
});

export type WhatsAppLinkInput = z.infer<typeof WhatsAppLinkInputSchema>;
