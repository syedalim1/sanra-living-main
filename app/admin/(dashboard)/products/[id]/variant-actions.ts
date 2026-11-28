"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { createServerClient } from "@/lib/supabase/server";
import { invalidatePricingCaches } from "@/lib/pricing/costImport";

export interface VariantAdminActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const GenerateVariantsSchema = z.object({
  product_id: z.string().uuid(),
  materials: z.array(z.enum(["SS", "MS"])).min(1),
  levels: z.array(z.enum(["ECONOMY", "STANDARD", "HEAVY_DUTY"])).min(1),
  surface_ids: z.array(z.string().uuid()).default([]),
  sizes: z.array(z.string().trim().min(1).max(30)).min(1),
});

function parseSizeDimensions(sizeCode: string): {
  length_ft: number | null;
  width_ft: number | null;
  size_label: string;
} {
  const match = sizeCode.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i);
  if (match) {
    return {
      length_ft: Number(match[1]),
      width_ft: Number(match[2]),
      size_label: `${match[1]} x ${match[2]} ft`,
    };
  }
  return {
    length_ft: null,
    width_ft: null,
    size_label: sizeCode === "STANDARD" ? "Standard" : sizeCode,
  };
}

export async function generateProductVariantsAction(
  _prev: VariantAdminActionState,
  formData: FormData
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const parsed = GenerateVariantsSchema.safeParse({
    product_id: formData.get("product_id"),
    materials: formData.getAll("materials"),
    levels: formData.getAll("levels"),
    surface_ids: formData.getAll("surface_ids").filter(Boolean),
    sizes: formData.getAll("sizes").filter(Boolean),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Select at least one material, build category, and size.",
    };
  }

  const d = parsed.data;

  const [{ data: product }, { data: buildCats }, { data: surfaces }, { data: existing }] =
    await Promise.all([
      db
        .from("products")
        .select("id, sku, base_height_ft, main_image_url")
        .eq("id", d.product_id)
        .single(),
      db.from("build_categories").select("id, code, frame_material, level"),
      db.from("surface_options").select("id, code"),
      db
        .from("product_variants")
        .select("id, variant_code, frame_material, build_category_id, surface_option_id, size_code, is_active")
        .eq("product_id", d.product_id),
    ]);

  if (!product) {
    return { ok: false, error: "Product not found." };
  }

  const buildCatByKey = new Map(
    (buildCats ?? []).map((b) => [`${b.frame_material}:${b.level}`, b])
  );
  const surfaceCodeById = new Map(
    (surfaces ?? []).map((s) => [s.id as string, s.code as string])
  );

  const surfaceTargets: Array<string | null> =
    d.surface_ids.length > 0 ? d.surface_ids : [null];

  const desiredKeys = new Set<string>();
  let createdCount = 0;
  let reactivatedCount = 0;

  for (const mat of d.materials) {
    for (const lvl of d.levels) {
      const bc = buildCatByKey.get(`${mat}:${lvl}`);
      if (!bc) continue;

      for (const surfId of surfaceTargets) {
        const surfCode = surfId ? surfaceCodeById.get(surfId) ?? "SURF" : "STD";
        for (const sizeCode of d.sizes) {
          const comboKey = `${mat}|${bc.id}|${surfId ?? "NONE"}|${sizeCode}`;
          desiredKeys.add(comboKey);

          const match = (existing ?? []).find(
            (v) =>
              v.frame_material === mat &&
              v.build_category_id === bc.id &&
              (v.surface_option_id ?? null) === surfId &&
              v.size_code === sizeCode
          );

          if (match) {
            if (!match.is_active) {
              await db
                .from("product_variants")
                .update({ is_active: true, updated_at: new Date().toISOString() })
                .eq("id", match.id);
              reactivatedCount += 1;
            }
            continue;
          }

          const lvlShort = lvl === "HEAVY_DUTY" ? "HD" : lvl === "ECONOMY" ? "EC" : "ST";
          const cleanSize = sizeCode.replace(/[^a-zA-Z0-9.]/g, "").toUpperCase();
          const variantCode = `${product.sku}-${mat}-${lvlShort}-${surfCode.slice(0, 4)}-${cleanSize}`;
          const dims = parseSizeDimensions(sizeCode);

          const { data: inserted, error: insErr } = await db
            .from("product_variants")
            .insert({
              product_id: product.id,
              variant_code: variantCode,
              frame_material: mat,
              build_category_id: bc.id,
              surface_option_id: surfId,
              size_code: sizeCode,
              size_label: dims.size_label,
              length_ft: dims.length_ft,
              width_ft: dims.width_ft,
              height_ft: product.base_height_ft ?? 2.5,
              variant_image_url: product.main_image_url,
              availability: "MADE_TO_ORDER",
              status: "DRAFT",
              is_active: true,
            })
            .select("id")
            .single();

          if (!insErr && inserted) {
            await db.from("variant_pricing_private").insert({
              variant_id: inserted.id,
              cost_source: "UNSET",
            });
            createdCount += 1;
          }
        }
      }
    }
  }

  // Safely disable removed combinations (excluding -DEFAULT legacy row) without deleting historical records
  let disabledCount = 0;
  for (const v of existing ?? []) {
    if (!v.is_active || String(v.variant_code).endsWith("-DEFAULT")) continue;
    const key = `${v.frame_material}|${v.build_category_id}|${v.surface_option_id ?? "NONE"}|${v.size_code}`;
    if (!desiredKeys.has(key)) {
      await db
        .from("product_variants")
        .update({ is_active: false, status: "DRAFT", updated_at: new Date().toISOString() })
        .eq("id", v.id);
      disabledCount += 1;
    }
  }

  await writeAudit(db, session.email, {
    action: "GENERATE_VARIANTS",
    target_table: "product_variants",
    target_id: product.id,
    summary: `Variants for ${product.sku}: +${createdCount} created, ${reactivatedCount} reactivated, ${disabledCount} disabled`,
  });

  invalidatePricingCaches();
  revalidatePath(`/admin/products/${product.id}`);
  return {
    ok: true,
    message: `Variants updated: ${createdCount} added, ${reactivatedCount} reactivated, ${disabledCount} disabled.`,
  };
}

const RowCostSchema = z.object({
  variant_id: z.string().uuid(),
  product_id: z.string().uuid(),
  manufacturing_cost: z.coerce.number().finite().min(0).max(10_000_000).nullable(),
  pricing_profile_id: z.string().uuid().nullable(),
  price_override_ex_gst: z.coerce.number().finite().min(0).max(10_000_000).nullable(),
  min_selling_price: z.coerce.number().finite().min(0).max(10_000_000).nullable(),
  lead_time_days: z.coerce.number().int().min(0).max(365).nullable(),
  availability: z.enum(["IN_STOCK", "MADE_TO_ORDER", "QUOTE_ONLY", "UNAVAILABLE"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export async function saveVariantCostingRowAction(
  _prev: VariantAdminActionState,
  formData: FormData
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const numOrNull = (val: FormDataEntryValue | null) => {
    const s = String(val ?? "").trim();
    return s === "" ? null : s;
  };

  const parsed = RowCostSchema.safeParse({
    variant_id: formData.get("variant_id"),
    product_id: formData.get("product_id"),
    manufacturing_cost: numOrNull(formData.get("manufacturing_cost")),
    pricing_profile_id: numOrNull(formData.get("pricing_profile_id")),
    price_override_ex_gst: numOrNull(formData.get("price_override_ex_gst")),
    min_selling_price: numOrNull(formData.get("min_selling_price")),
    lead_time_days: numOrNull(formData.get("lead_time_days")),
    availability: formData.get("availability"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid variant costing values." };
  }

  const d = parsed.data;

  // Never publish incomplete variants automatically or without cost/override (unless QUOTE_ONLY)
  if (
    d.status === "PUBLISHED" &&
    d.availability !== "QUOTE_ONLY" &&
    (d.manufacturing_cost == null || d.manufacturing_cost <= 0 || !d.pricing_profile_id) &&
    (d.price_override_ex_gst == null || d.price_override_ex_gst <= 0)
  ) {
    return {
      ok: false,
      error:
        "Cannot publish variant without manufacturing cost + pricing profile (or manual price override), unless marked QUOTE_ONLY.",
    };
  }

  const { data: oldPricing } = await db
    .from("variant_pricing_private")
    .select("manufacturing_cost, price_override_ex_gst")
    .eq("variant_id", d.variant_id)
    .maybeSingle();

  const now = new Date().toISOString();

  await db
    .from("product_variants")
    .update({
      lead_time_days: d.lead_time_days,
      availability: d.availability,
      status: d.status,
      updated_at: now,
    })
    .eq("id", d.variant_id);

  await db.from("variant_pricing_private").upsert(
    {
      variant_id: d.variant_id,
      manufacturing_cost: d.manufacturing_cost,
      cost_source:
        d.manufacturing_cost != null && d.manufacturing_cost > 0 ? "MANUAL" : "UNSET",
      pricing_profile_id: d.pricing_profile_id,
      price_override_ex_gst: d.price_override_ex_gst,
      min_selling_price: d.min_selling_price,
      updated_by: session.email,
      updated_at: now,
    },
    { onConflict: "variant_id" }
  );

  if (oldPricing?.manufacturing_cost !== d.manufacturing_cost) {
    await db.from("price_history").insert({
      entity_type: "VARIANT_PRICING",
      entity_id: d.variant_id,
      variant_id: d.variant_id,
      field: "manufacturing_cost",
      old_value: oldPricing?.manufacturing_cost != null ? String(oldPricing.manufacturing_cost) : null,
      new_value: d.manufacturing_cost != null ? String(d.manufacturing_cost) : null,
      reason: "Admin inline costing update",
      source: "MANUAL",
      actor_email: session.email,
    });
  }

  await writeAudit(db, session.email, {
    action: "UPDATE_VARIANT_COSTING",
    target_table: "variant_pricing_private",
    target_id: d.variant_id,
    summary: `Updated variant ${d.variant_id} (${d.status}, cost: ${d.manufacturing_cost ?? "unset"})`,
  });

  invalidatePricingCaches();
  revalidatePath(`/admin/products/${d.product_id}`);
  revalidatePath("/products");
  return { ok: true, message: "Variant saved." };
}

export async function bulkUpdateVariantsAction(
  _prev: VariantAdminActionState,
  formData: FormData
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const productId = String(formData.get("product_id") ?? "");
  const variantIds = formData.getAll("variant_ids").map(String).filter(Boolean);
  const profileId = String(formData.get("pricing_profile_id") ?? "").trim() || null;
  const leadTimeRaw = String(formData.get("lead_time_days") ?? "").trim();
  const availability = String(formData.get("availability") ?? "").trim() || null;

  if (!z.string().uuid().safeParse(productId).success || variantIds.length === 0) {
    return { ok: false, error: "Select at least one variant to bulk update." };
  }

  const now = new Date().toISOString();

  if (profileId && z.string().uuid().safeParse(profileId).success) {
    for (const vid of variantIds) {
      await db.from("variant_pricing_private").upsert(
        {
          variant_id: vid,
          pricing_profile_id: profileId,
          updated_by: session.email,
          updated_at: now,
        },
        { onConflict: "variant_id" }
      );
    }
  }

  const variantPatch: Record<string, unknown> = { updated_at: now };
  if (leadTimeRaw !== "" && Number.isInteger(Number(leadTimeRaw))) {
    variantPatch.lead_time_days = Number(leadTimeRaw);
  }
  if (availability) {
    variantPatch.availability = availability;
  }

  if (Object.keys(variantPatch).length > 1) {
    await db
      .from("product_variants")
      .update(variantPatch)
      .in("id", variantIds);
  }

  await writeAudit(db, session.email, {
    action: "BULK_UPDATE_VARIANTS",
    target_table: "product_variants",
    target_id: productId,
    summary: `Bulk updated ${variantIds.length} variants`,
  });

  invalidatePricingCaches();
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: `Updated ${variantIds.length} variants.` };
}

const SeoSchema = z.object({
  product_id: z.string().uuid(),
  seo_title: z.string().trim().max(120).optional(),
  meta_description: z.string().trim().max(260).optional(),
  product_h1: z.string().trim().max(140).optional(),
  image_alt_text: z.string().trim().max(180).optional(),
  og_image_url: z.string().trim().max(500).optional(),
});

export async function saveProductSeoAction(
  _prev: VariantAdminActionState,
  formData: FormData
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const parsed = SeoSchema.safeParse({
    product_id: formData.get("product_id"),
    seo_title: formData.get("seo_title") || undefined,
    meta_description: formData.get("meta_description") || undefined,
    product_h1: formData.get("product_h1") || undefined,
    image_alt_text: formData.get("image_alt_text") || undefined,
    og_image_url: formData.get("og_image_url") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Check SEO field lengths." };
  }

  const d = parsed.data;
  const { error } = await db.from("product_seo").upsert(
    {
      product_id: d.product_id,
      seo_title: d.seo_title ?? null,
      meta_description: d.meta_description ?? null,
      product_h1: d.product_h1 ?? null,
      image_alt_text: d.image_alt_text ?? null,
      og_image_url: d.og_image_url ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id" }
  );

  if (error) {
    return { ok: false, error: "Failed to save SEO fields." };
  }

  await writeAudit(db, session.email, {
    action: "SAVE_PRODUCT_SEO",
    target_table: "product_seo",
    target_id: d.product_id,
    summary: `Updated SEO metadata for product ${d.product_id}`,
  });

  revalidatePath(`/admin/products/${d.product_id}`);
  revalidatePath("/admin/seo");
  return { ok: true, message: "SEO metadata saved." };
}

export async function toggleProductPublishAction(
  _prev: VariantAdminActionState,
  formData: FormData
): Promise<VariantAdminActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("next_active") === "true";
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "Invalid product ID." };
  }

  const { error } = await db
    .from("products")
    .update({ is_active: nextActive })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Failed to update publish status." };
  }

  await writeAudit(db, session.email, {
    action: nextActive ? "PUBLISH_PRODUCT" : "UNPUBLISH_PRODUCT",
    target_table: "products",
    target_id: id,
    summary: `${nextActive ? "Published" : "Unpublished"} product ${id}`,
  });

  invalidatePricingCaches();
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return {
    ok: true,
    message: nextActive ? "Product published." : "Product moved to draft/unpublished.",
  };
}
