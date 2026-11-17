import { z } from "zod";

export const LEAD_KINDS = ["SAMPLE_REQUEST", "CAD_DOWNLOAD", "BULK_QUOTE"] as const;
export const LEAD_STATUSES = ["NEW", "CONTACTED", "CLOSED"] as const;

export type LeadKind = (typeof LEAD_KINDS)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const SAMPLE_NEEDS = {
  MATERIAL_SWATCH: "Material swatch",
  FRAME_SAMPLE: "Frame / finish sample",
  FULL_PRODUCT: "Full product sample",
} as const;

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PhoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, { message: "Enter a valid 10-digit Indian mobile number." });

const EmailSchema = z
  .union([z.string().trim().email().max(200), z.literal("")])
  .optional();

export const SampleLeadSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: PhoneSchema,
    email: EmailSchema,
    company: z.string().trim().max(160).optional(),
    city: z.string().trim().min(2).max(120),
    product: z.string().trim().min(1).max(80),
    need: z.enum(["MATERIAL_SWATCH", "FRAME_SAMPLE", "FULL_PRODUCT"]),
    notes: z.string().trim().max(500).optional().default(""),
    website: z.string().max(200).optional().default(""),
  })
  .strict();

export const CadLeadSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: PhoneSchema,
    email: EmailSchema,
    company: z.string().trim().max(160).optional(),
    file_id: z.string().uuid(),
    website: z.string().max(200).optional().default(""),
  })
  .strict();

export const BulkQuoteLeadSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: PhoneSchema,
  })
  .strict();

export type SampleLeadInput = z.infer<typeof SampleLeadSchema>;
export type CadLeadInput = z.infer<typeof CadLeadSchema>;

export function hasHoneypot(value: string | null | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function sanitizeLeadText(value: string | null | undefined): string {
  return stripHtml(value ?? "");
}

export function nullableText(value: string | null | undefined): string | null {
  const clean = sanitizeLeadText(value);
  return clean.length > 0 ? clean : null;
}
