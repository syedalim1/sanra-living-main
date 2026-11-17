import { z } from "zod";

export const ProductTypeSchema = z.enum(["TABLE", "CHAIR", "STAND", "RACK", "SS_UNIT"]);
export type ProductTypeValue = z.infer<typeof ProductTypeSchema>;

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

const QuantityInputSchema = z.number().int().min(1).max(500).default(1);

export const ChairSelectionsSchema = z
  .object({
    METAL_TYPE: z.enum(["MS_COATED", "SS202", "SS304"]),
    SEAT: z.enum(["SEAT_RUBBER", "SEAT_REXINE", "SEAT_PERFORATED"]),
    SEAT_COLOR: z.enum(["REXINE_BLACK", "REXINE_TAN", "REXINE_CHERRY"]).optional(),
    FRAME_COLOR: z.enum(["MATTE_BLACK", "WHITE", "GREY", "GOLD"]).optional(),
    BUILD_TYPE: z.enum(["WELDED", "KNOCKDOWN"]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.SEAT === "SEAT_REXINE" && !value.SEAT_COLOR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SEAT_COLOR"],
        message: "Choose a rexine seat color.",
      });
    }

    if (value.SEAT !== "SEAT_REXINE" && value.SEAT_COLOR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SEAT_COLOR"],
        message: "Seat color applies only to the rexine seat.",
      });
    }

    if (value.METAL_TYPE === "MS_COATED" && !value.FRAME_COLOR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FRAME_COLOR"],
        message: "Choose a frame color.",
      });
    }

    if (value.METAL_TYPE !== "MS_COATED" && value.FRAME_COLOR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FRAME_COLOR"],
        message: "Stainless steel uses its natural finish.",
      });
    }
  });

export const StandSelectionsSchema = z
  .object({
    STAND_MATERIAL: z.enum(["ST_MS", "ST_SS304"]),
    PACK: z.enum(["PACK_1", "PACK_2"]),
    BASE: z.enum(["BASE_BUSH", "BASE_CASTOR"]),
  })
  .strict();

export const RackSelectionsSchema = z
  .object({
    FINISH: z.enum(["RF_BLACK", "RF_GOLD_PAINT", "RF_GOLD_PVD"]),
    SHELF: z.enum(["SH_NONE", "SH_RUBBER", "SH_PRELAM_WHITE", "SH_PRELAM_BLACK"]),
    RACK_SIZE: z.enum(["R4", "R5", "R6"]),
  })
  .strict();

export const SSUnitSelectionsSchema = z
  .object({
    GRADE: z.enum(["SSG_202", "SSG_304"]),
    THICKNESS: z.enum(["TH_18G", "TH_16G"]),
    SS_FINISH: z.enum(["SSF_HAIRLINE", "SSF_MIRROR"]),
  })
  .strict();

export const NonTableConfigSchema = z.discriminatedUnion("product_type", [
  z.object({
    product_type: z.literal("CHAIR"),
    sku: z.string().min(1).max(50),
    quantity: QuantityInputSchema,
    selections: ChairSelectionsSchema,
  }),
  z.object({
    product_type: z.literal("STAND"),
    sku: z.string().min(1).max(50),
    quantity: QuantityInputSchema,
    selections: StandSelectionsSchema,
  }),
  z.object({
    product_type: z.literal("RACK"),
    sku: z.string().min(1).max(50),
    quantity: QuantityInputSchema,
    selections: RackSelectionsSchema,
  }),
  z.object({
    product_type: z.literal("SS_UNIT"),
    sku: z.string().min(1).max(50),
    quantity: QuantityInputSchema,
    selections: SSUnitSelectionsSchema,
  }),
]);

export type NonTableConfigInput = z.infer<typeof NonTableConfigSchema>;

export const ConfigEnvelopeSchema = z
  .object({
    sku: z.string().min(1).max(50),
    quantity: z.number().int().min(1).max(500).default(1),
    selections: z.record(z.string(), z.string()).optional(),
    pin: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .passthrough();

export type ConfigEnvelope = z.infer<typeof ConfigEnvelopeSchema>;

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
