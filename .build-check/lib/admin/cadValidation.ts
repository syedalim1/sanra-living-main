import { z } from "zod";

export const MAX_CAD_FILE_BYTES = 50 * 1024 * 1024;
export const CAD_FILE_TYPES = ["SKP", "DWG"] as const;

export const CadFileMetaSchema = z
  .object({
    file_id: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000).optional().default(""),
    file_type: z.enum(CAD_FILE_TYPES),
    product_sku: z.string().trim().max(50).optional().default(""),
    is_active: z.boolean(),
  })
  .strict();

export const CadFileDeleteSchema = z
  .object({ file_id: z.string().uuid() })
  .strict();

export function cadExtension(fileName: string): "skp" | "dwg" | null {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".skp")) return "skp";
  if (lower.endsWith(".dwg")) return "dwg";
  return null;
}
