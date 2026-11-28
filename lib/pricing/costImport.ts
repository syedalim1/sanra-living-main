import "server-only";
import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import type { VariantAvailability } from "@/lib/variants/types";

export interface CostImportCsvRow {
  model_number: string;
  frame_material: string;
  build_category: string;
  size: string;
  surface_material?: string;
  final_manufacturing_cost: string;
  lead_time_days?: string;
  availability?: string;
}

export interface StagedCostRowPreview {
  row_number: number;
  sku: string;
  variant_code: string | null;
  existing_cost: number | null;
  new_cost: number | null;
  delta: number | null;
  lead_time_days: number | null;
  availability: VariantAvailability | null;
  validation_error: string | null;
}

export interface CostImportPreviewResult {
  batch_id: string;
  filename: string;
  checksum: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  rows: StagedCostRowPreview[];
}

const VALID_AVAILABILITIES = new Set<VariantAvailability>([
  "IN_STOCK",
  "MADE_TO_ORDER",
  "QUOTE_ONLY",
  "UNAVAILABLE",
]);

function stripFormulaPrefix(value: string): string {
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return trimmed.replace(/^[=+\-@]+/, "").trim();
  }
  return trimmed;
}

export function generateCostImportTemplateCsv(): string {
  return [
    "model_number,frame_material,build_category,size,surface_material,final_manufacturing_cost,lead_time_days,availability",
    "IMS-CF-42,MS,Standard,4x2,Rubberwood,3250.00,7,MADE_TO_ORDER",
    "IMS-CH-01,SS,Heavy Duty,STANDARD,Cushion / Upholstery,1850.00,10,IN_STOCK",
  ].join("\n");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(stripFormulaPrefix(current));
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(stripFormulaPrefix(current));
  return cells;
}

export function parseCostImportCsv(csvText: string): CostImportCsvRow[] {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const required = [
    "model_number",
    "frame_material",
    "build_category",
    "size",
    "final_manufacturing_cost",
  ];
  for (const col of required) {
    if (idx(col) === -1) {
      throw new Error(`Missing required column: ${col}`);
    }
  }

  const rows: CostImportCsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const get = (name: string) => {
      const colIndex = idx(name);
      return colIndex >= 0 ? (cells[colIndex] ?? "").trim() : "";
    };
    rows.push({
      model_number: get("model_number"),
      frame_material: get("frame_material"),
      build_category: get("build_category"),
      size: get("size"),
      surface_material: get("surface_material"),
      final_manufacturing_cost: get("final_manufacturing_cost"),
      lead_time_days: get("lead_time_days"),
      availability: get("availability"),
    });
  }

  return rows;
}

/**
 * Stages and validates a simplified manufacturing cost CSV without modifying live prices.
 */
export async function stageCostImport(params: {
  filename: string;
  csvText: string;
  actorEmail: string;
}): Promise<CostImportPreviewResult> {
  const parsedRows = parseCostImportCsv(params.csvText);
  const checksum = createHash("sha256").update(params.csvText).digest("hex");

  const { data: batch, error: batchErr } = await supabaseServer
    .from("cost_import_batches")
    .insert({
      filename: params.filename,
      checksum,
      row_count: parsedRows.length,
      status: "STAGED",
      created_by: params.actorEmail,
    })
    .select("id")
    .single();

  if (batchErr || !batch) {
    throw new Error("Failed to create cost import batch.");
  }

  const [productsRes, buildCatsRes, surfacesRes, variantsRes, pricingRes] =
    await Promise.all([
      supabaseServer.from("products").select("id, sku"),
      supabaseServer
        .from("build_categories")
        .select("id, code, frame_material, public_label"),
      supabaseServer.from("surface_options").select("id, code, label"),
      supabaseServer
        .from("product_variants")
        .select(
          "id, product_id, variant_code, frame_material, build_category_id, surface_option_id, size_code, size_label"
        ),
      supabaseServer
        .from("variant_pricing_private")
        .select("variant_id, manufacturing_cost"),
    ]);

  if (productsRes.error || buildCatsRes.error || surfacesRes.error || variantsRes.error || pricingRes.error) {
    throw new Error("Unable to load the catalog needed to validate the CSV.");
  }

  const productBySku = new Map(
    (productsRes.data ?? []).map((p) => [
      String(p.sku).trim().toUpperCase(),
      p.id as string,
    ])
  );
  const buildCatByKey = new Map(
    (buildCatsRes.data ?? []).map((b) => [
      `${String(b.frame_material).toUpperCase()}:${String(b.public_label).toUpperCase()}`,
      b.id as string,
    ])
  );
  const surfaceByKey = new Map<string, string>();
  for (const s of surfacesRes.data ?? []) {
    surfaceByKey.set(String(s.code).toUpperCase(), s.id as string);
    surfaceByKey.set(String(s.label).toUpperCase(), s.id as string);
  }
  const existingCostByVariant = new Map(
    (pricingRes.data ?? []).map((p) => [
      p.variant_id as string,
      p.manufacturing_cost != null ? Number(p.manufacturing_cost) : null,
    ])
  );

  const seenVariantCodes = new Set<string>();
  const previews: StagedCostRowPreview[] = [];
  const dbRows: Array<Record<string, unknown>> = [];

  for (let i = 0; i < parsedRows.length; i += 1) {
    const raw = parsedRows[i];
    const rowNumber = i + 1;
    const sku = raw.model_number.toUpperCase();
    const frameMaterial = raw.frame_material.toUpperCase();
    const buildLabel = raw.build_category.toUpperCase();
    const sizeKey = raw.size.trim().toLowerCase();
    const surfaceKey = (raw.surface_material ?? "").trim().toUpperCase();
    const costNum = Number(raw.final_manufacturing_cost);

    let validationError: string | null = null;
    let matchedVariantCode: string | null = null;
    let existingCost: number | null = null;

    const productId = productBySku.get(sku);
    const buildCategoryId = buildCatByKey.get(`${frameMaterial}:${buildLabel}`);
    const surfaceId = surfaceKey ? surfaceByKey.get(surfaceKey) ?? null : null;

    if (!productId) {
      validationError = `Unknown model number: ${sku}`;
    } else if (!buildCategoryId) {
      validationError = `Invalid frame/build combination: ${raw.frame_material} / ${raw.build_category}`;
    } else if (surfaceKey && !surfaceId) {
      validationError = `Unknown surface material: ${raw.surface_material}`;
    } else if (!Number.isFinite(costNum) || costNum <= 0) {
      validationError = "Manufacturing cost must be greater than 0.";
    } else {
      const variant = (variantsRes.data ?? []).find(
        (v) =>
          v.product_id === productId &&
          v.frame_material === frameMaterial &&
          v.build_category_id === buildCategoryId &&
          (surfaceId ? v.surface_option_id === surfaceId : v.surface_option_id == null) &&
          (String(v.size_code).toLowerCase() === sizeKey ||
            String(v.size_label).toLowerCase() === sizeKey)
      );

      if (!variant) {
        validationError = "No matching product variant found.";
      } else if (seenVariantCodes.has(variant.variant_code as string)) {
        validationError = `Duplicate variant in import file: ${variant.variant_code}`;
      } else {
        matchedVariantCode = variant.variant_code as string;
        seenVariantCodes.add(matchedVariantCode);
        existingCost = existingCostByVariant.get(variant.id as string) ?? null;
      }
    }

    let leadTimeDays: number | null = null;
    if (!validationError && raw.lead_time_days) {
      const parsedLead = Number(raw.lead_time_days);
      if (!Number.isInteger(parsedLead) || parsedLead < 0) {
        validationError = "Lead time days must be a non-negative integer.";
      } else {
        leadTimeDays = parsedLead;
      }
    }

    let availability: VariantAvailability | null = null;
    if (!validationError && raw.availability) {
      const upperAvail = raw.availability.toUpperCase() as VariantAvailability;
      if (!VALID_AVAILABILITIES.has(upperAvail)) {
        validationError = `Invalid availability: ${raw.availability}`;
      } else {
        availability = upperAvail;
      }
    }

    const newCost = Number.isFinite(costNum) && costNum > 0 ? Math.round(costNum * 100) / 100 : null;
    const delta =
      existingCost != null && newCost != null
        ? Math.round((newCost - existingCost) * 100) / 100
        : null;

    previews.push({
      row_number: rowNumber,
      sku,
      variant_code: matchedVariantCode,
      existing_cost: existingCost,
      new_cost: newCost,
      delta,
      lead_time_days: leadTimeDays,
      availability,
      validation_error: validationError,
    });

    dbRows.push({
      batch_id: batch.id,
      row_number: rowNumber,
      sku,
      variant_code: matchedVariantCode ?? "",
      manufacturing_cost: newCost,
      lead_time_days: leadTimeDays,
      availability,
      validation_error: validationError,
    });
  }

  if (dbRows.length > 0) {
    const { error } = await supabaseServer.from("cost_import_rows").insert(dbRows);
    if (error) throw new Error("Unable to stage the CSV rows.");
  }

  const validCount = previews.filter((r) => !r.validation_error).length;
  const invalidCount = previews.length - validCount;

  const { error: statusError } = await supabaseServer
    .from("cost_import_batches")
    .update({
      status: validCount > 0 ? "VALIDATED" : "FAILED",
      mapping_json: {
        valid_rows: validCount,
        invalid_rows: invalidCount,
      },
    })
    .eq("id", batch.id)
    .select("id")
    .single();
  if (statusError) throw new Error("Unable to confirm the CSV validation status.");

  return {
    batch_id: batch.id as string,
    filename: params.filename,
    checksum,
    total_rows: previews.length,
    valid_rows: validCount,
    invalid_rows: invalidCount,
    rows: previews,
  };
}

export function invalidatePricingCaches(): void {
  try {
    revalidateTag("sanra-from-prices", { expire: 0 });
  } catch {
    // Ignore outside Next.js request context
  }
}
