"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { catalogWriteError, refreshCatalogProduct, setCatalogPublication } from "@/lib/admin/productWorkflow";
import { NonNegativeMoney, parseBoolean } from "@/lib/admin/validation";
import { suggestPricingProfile, surfaceAppliesToModel } from "@/lib/admin/variantSetup";
import { createServerClient } from "@/lib/supabase/server";

export interface VariantAdminActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const uuid = z.string().uuid();
const availability = z.enum(["IN_STOCK", "MADE_TO_ORDER", "QUOTE_ONLY", "UNAVAILABLE"]);
const leadTime = z.coerce.number().int().min(0).max(365);
const money = z.coerce.number().pipe(NonNegativeMoney.max(10_000_000));
const size = z.string().trim().toUpperCase().regex(/^(STANDARD|CUSTOM|\d{1,3}(?:\.\d{1,2})?X\d{1,3}(?:\.\d{1,2})?)$/);
const GenerateVariantsSchema = z.object({
  product_id: uuid,
  materials: z.array(z.enum(["SS", "MS"])).min(1).max(2),
  levels: z.array(z.enum(["ECONOMY", "STANDARD", "HEAVY_DUTY"])).min(1).max(3),
  surface_ids: z.array(uuid).max(15),
  sizes: z.array(size).min(1).max(15),
});

function textOrNull(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() || null : null;
}

function variantSize(code: string, product: { base_length_ft: number; base_width_ft: number }) {
  if (code === "CUSTOM") return { size_code: code, size_label: "Custom", length_ft: null, width_ft: null };
  const [length, width] = code === "STANDARD"
    ? [Number(product.base_length_ft), Number(product.base_width_ft)]
    : code.split("X").map(Number);
  return {
    size_code: code === "STANDARD" ? code : `${length}x${width}`,
    size_label: `${length} × ${width} ft`,
    length_ft: length,
    width_ft: width,
  };
}

export async function generateProductVariantsAction(
  _prev: VariantAdminActionState,
  formData: FormData,
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const parsed = GenerateVariantsSchema.safeParse({
    product_id: formData.get("product_id"),
    materials: [...new Set(formData.getAll("materials"))],
    levels: [...new Set(formData.getAll("levels"))],
    surface_ids: [...new Set(formData.getAll("surface_ids"))],
    sizes: [...new Set([...formData.getAll("sizes"), ...String(formData.get("additional_sizes") ?? "").split(",")].filter((value) => String(value).trim()))],
  });
  if (!parsed.success) return { ok: false, error: "Select a material, build category and size. Enter extra sizes as length × width, for example 3.5x2." };
  const d = parsed.data;

  try {
    const db = createServerClient();
    const [product, cats, surfaces, profiles] = await Promise.all([
      db.from("products").select("sku, product_type, base_length_ft, base_width_ft, allowed_top_categories")
        .eq("id", d.product_id).maybeSingle(),
      db.from("build_categories").select("id, frame_material, level").eq("is_active", true).order("sort_order"),
      db.from("surface_options").select("id, code, kind, material_family, applicable_product_types").eq("is_active", true),
      db.from("pricing_profiles").select("id, code, name, channel, default_margin_pct, is_active").eq("is_active", true),
    ]);
    if (product.error || cats.error || surfaces.error || profiles.error) {
      return { ok: false, error: "Unable to load the model or variant settings." };
    }
    const model = product.data;
    if (!model) return { ok: false, error: "Product not found." };

    const surfaceById = new Map(surfaces.data.map((surface) => [surface.id, surface]));
    const selectedSurfaces = d.surface_ids.map((id) => surfaceById.get(id));
    if (selectedSurfaces.some((surface) => !surface ||
        !surfaceAppliesToModel(surface, model.product_type, model.allowed_top_categories ?? []))) {
      return { ok: false, error: "Choose surfaces that are available for this model." };
    }

    const sizes = [...new Map(d.sizes.map((code) => {
      const dims = variantSize(code, model);
      return [dims.size_code, dims];
    })).values()];
    if (sizes.some(({ length_ft, width_ft }) => length_ft != null && width_ft != null &&
        (length_ft <= 0 || width_ft <= 0 || length_ft > 200 || width_ft > 200))) {
      return { ok: false, error: "Enter size dimensions between 0.01 and 200 ft." };
    }

    const surfacesToGenerate = selectedSurfaces.length ? selectedSurfaces : [null];
    if (d.materials.length * d.levels.length * sizes.length * surfacesToGenerate.length > 300) {
      return { ok: false, error: "Generate up to 300 combinations at a time." };
    }

    const rows = [];
    for (const material of d.materials) {
      const profile = suggestPricingProfile(profiles.data, material, model.product_type);
      for (const level of d.levels) {
        const category = cats.data.find((row) => row.frame_material === material && row.level === level);
        if (!category) return { ok: false, error: `The ${material} ${level.toLowerCase().replace("_", " ")} build category is unavailable.` };

        const levelCode = { HEAVY_DUTY: "HD", ECONOMY: "EC", STANDARD: "ST" }[level];
        for (const surface of surfacesToGenerate) {
          for (const dimensions of sizes) {
            rows.push({
              variant_code: `${model.sku}-${material}-${levelCode}-${surface?.code ?? "STD"}-${dimensions.size_code.toUpperCase()}`,
              frame_material: material,
              build_category_id: category.id,
              surface_option_id: surface?.id ?? null,
              pricing_profile_id: profile,
              ...dimensions,
            });
          }
        }
      }
    }

    const { data, error } = await db.rpc("admin_generate_catalog_variants", {
      p_id: d.product_id,
      p_rows: rows,
      p_replace: parseBoolean(formData.get("replace_variants")),
      p_actor: session.email,
    });

    if (error || !data) {
      return { ok: false, error: catalogWriteError(error, "Unable to generate variants. No changes were saved.") };
    }

    refreshCatalogProduct(d.product_id);
    return { ok: true, message: `${data.created} added, ${data.reactivated} reactivated, ${data.disabled} disabled.` };
  } catch {
    return { ok: false, error: "Unable to generate variants." };
  }
}

const RowCostSchema = z.object({
  variant_id: uuid,
  product_id: uuid,
  manufacturing_cost: money.nullable(),
  pricing_profile_id: uuid.nullable(),
  price_override_ex_gst: money.nullable(),
  min_selling_price: money.nullable(),
  lead_time_days: leadTime.nullable(),
  availability,
  status: z.enum(["DRAFT", "PUBLISHED"]),
  variant_revision: z.iso.datetime({ offset: true }),
  pricing_revision: z.iso.datetime({ offset: true }).nullable(),
});

export async function saveVariantCostingRowAction(
  _prev: VariantAdminActionState,
  formData: FormData,
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const parsed = RowCostSchema.safeParse({
    variant_id: formData.get("variant_id"),
    product_id: formData.get("product_id"),
    manufacturing_cost: textOrNull(formData.get("manufacturing_cost")),
    pricing_profile_id: textOrNull(formData.get("pricing_profile_id")),
    price_override_ex_gst: textOrNull(formData.get("price_override_ex_gst")),
    min_selling_price: textOrNull(formData.get("min_selling_price")),
    lead_time_days: textOrNull(formData.get("lead_time_days")),
    availability: formData.get("availability"),
    status: formData.get("status"),
    variant_revision: formData.get("variant_revision"),
    pricing_revision: textOrNull(formData.get("pricing_revision")),
  });
  if (!parsed.success) return { ok: false, error: "Check cost, profile and lead time values." };
  const d = parsed.data;

  try {
    const db = createServerClient();
    const { data, error } = await db.rpc("admin_save_catalog_variant_costs", {
      p_id: d.product_id,
      p_ids: [d.variant_id],
      p_details: { lead_time_days: d.lead_time_days, availability: d.availability, status: d.status },
      p_pricing: {
        manufacturing_cost: d.manufacturing_cost,
        pricing_profile_id: d.pricing_profile_id,
        price_override_ex_gst: d.price_override_ex_gst,
        min_selling_price: d.min_selling_price,
      },
      p_expected: { variant: d.variant_revision, pricing: d.pricing_revision },
      p_actor: session.email,
    });
    if (error || data !== 1) {
      return { ok: false, error: catalogWriteError(error, "Unable to save variant costing.") };
    }
    refreshCatalogProduct(d.product_id);
    return { ok: true, message: "Variant saved." };
  } catch {
    return { ok: false, error: "Unable to save variant costing." };
  }
}

const BulkSchema = z.object({
  product_id: uuid,
  variant_ids: z.array(uuid).min(1).max(300),
  pricing_profile_id: uuid.nullable(),
  lead_time_days: leadTime.nullable(),
  availability: availability.nullable(),
});

export async function bulkUpdateVariantsAction(
  _prev: VariantAdminActionState,
  formData: FormData,
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const parsed = BulkSchema.safeParse({
    product_id: formData.get("product_id"),
    variant_ids: [...new Set(formData.getAll("variant_ids"))],
    pricing_profile_id: textOrNull(formData.get("pricing_profile_id")),
    lead_time_days: textOrNull(formData.get("lead_time_days")),
    availability: textOrNull(formData.get("availability")),
  });
  if (!parsed.success) return { ok: false, error: "Select variants and check the bulk update values." };
  const d = parsed.data;
  if (!d.pricing_profile_id && d.lead_time_days == null && !d.availability) {
    return { ok: false, error: "Choose a field to update." };
  }

  try {
    const db = createServerClient();
    const { data, error } = await db.rpc("admin_save_catalog_variant_costs", {
      p_id: d.product_id,
      p_ids: d.variant_ids,
      p_details: {
        lead_time_days: d.lead_time_days ?? undefined,
        availability: d.availability ?? undefined,
      },
      p_pricing: d.pricing_profile_id ? { pricing_profile_id: d.pricing_profile_id } : {},
      p_expected: null,
      p_actor: session.email,
    });

    if (error || data !== d.variant_ids.length) {
      return { ok: false, error: catalogWriteError(error, "Unable to apply the bulk update.") };
    }
    refreshCatalogProduct(d.product_id);
    return { ok: true, message: `Updated ${data} variants.` };
  } catch {
    return { ok: false, error: "Unable to apply the bulk update." };
  }
}

const SeoSchema = z.object({
  product_id: uuid,
  seo_title: z.string().max(120).nullable(),
  meta_description: z.string().max(260).nullable(),
  product_h1: z.string().max(140).nullable(),
  image_alt_text: z.string().max(180).nullable(),
  og_image_url: z.string().max(500).nullable(),
});

export async function saveProductSeoAction(
  _prev: VariantAdminActionState,
  formData: FormData,
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const parsed = SeoSchema.safeParse({
    product_id: formData.get("product_id"),
    seo_title: textOrNull(formData.get("seo_title")),
    meta_description: textOrNull(formData.get("meta_description")),
    product_h1: textOrNull(formData.get("product_h1")),
    image_alt_text: textOrNull(formData.get("image_alt_text")),
    og_image_url: textOrNull(formData.get("og_image_url")),
  });
  if (!parsed.success) return { ok: false, error: "Check SEO field lengths." };

  try {
    const db = createServerClient();
    const { error } = await db.rpc("admin_save_catalog_seo", { p_seo: parsed.data, p_actor: session.email });
    if (error) return { ok: false, error: "Unable to save SEO fields." };

    refreshCatalogProduct(parsed.data.product_id);
    revalidatePath("/admin/seo");
    return { ok: true, message: "SEO metadata saved." };
  } catch {
    return { ok: false, error: "Unable to save SEO fields." };
  }
}

export async function toggleProductPublishAction(
  _prev: VariantAdminActionState,
  formData: FormData,
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  const active = z.enum(["true", "false"]).safeParse(formData.get("next_active"));
  if (!id.success || !active.success) return { ok: false, error: "Invalid publication request." };
  return setCatalogPublication(id.data, active.data === "true", session.email);
}
