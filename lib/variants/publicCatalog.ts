import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { PublicBuildCategory } from "@/lib/buildCategory";
import type {
  BuildCategoryLevel,
  FrameMaterialCode,
  PublicBuildCategoryOption,
  PublicProductVariant,
  PublicSurfaceOption,
  SurfaceKind,
  VariantAvailability,
} from "./types";

/**
 * Fetches active public build categories (Economy, Standard, Heavy Duty).
 * Never queries build_category_specs_private.
 */
export async function getPublicBuildCategories(
  frameMaterial?: FrameMaterialCode
): Promise<PublicBuildCategoryOption[]> {
  try {
    let query = supabaseServer
      .from("build_categories")
      .select(
        "id, code, frame_material, level, public_label, public_description, public_spec_summary, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order");

    if (frameMaterial) {
      query = query.eq("frame_material", frameMaterial);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id as string,
      code: row.code as string,
      frame_material: row.frame_material as FrameMaterialCode,
      level: row.level as BuildCategoryLevel,
      public_label: row.public_label as PublicBuildCategory,
      public_description: (row.public_description as string | null) ?? null,
      public_spec_summary: (row.public_spec_summary as string | null) ?? null,
      sort_order: Number(row.sort_order ?? 100),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches active public surface options, optionally filtered by product type.
 */
export async function getPublicSurfaceOptions(
  productType?: string
): Promise<PublicSurfaceOption[]> {
  try {
    let query = supabaseServer
      .from("surface_options")
      .select(
        "id, code, kind, label, material_family, public_description, applicable_product_types, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order");

    if (productType) {
      query = query.contains("applicable_product_types", [productType]);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id as string,
      code: row.code as string,
      kind: row.kind as SurfaceKind,
      label: row.label as string,
      material_family: (row.material_family as string | null) ?? null,
      public_description: (row.public_description as string | null) ?? null,
      applicable_product_types: Array.isArray(row.applicable_product_types)
        ? (row.applicable_product_types as string[])
        : [],
      sort_order: Number(row.sort_order ?? 100),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetches published, active public-safe variants for a product model.
 * Explicitly maps only public fields; never touches private pricing or gauge tables.
 */
export async function getPublicVariantsForProduct(
  productId: string
): Promise<PublicProductVariant[]> {
  try {
    const [variantsRes, buildCats, surfaces] = await Promise.all([
      supabaseServer
        .from("product_variants")
        .select(
          "id, product_id, variant_code, frame_material, build_category_id, surface_option_id, size_code, size_label, length_ft, width_ft, height_ft, finish_label, variant_image_url, availability, lead_time_days, sort_order, products!inner()"
        )
        .eq("product_id", productId)
        .eq("products.is_active", true)
        .eq("is_active", true)
        .eq("status", "PUBLISHED")
        .order("sort_order"),
      getPublicBuildCategories(),
      getPublicSurfaceOptions(),
    ]);

    if (variantsRes.error || !variantsRes.data) return [];

    const buildCatMap = new Map(buildCats.map((c) => [c.id, c]));
    const surfaceMap = new Map(surfaces.map((s) => [s.id, s]));

    return variantsRes.data.map((row) => {
      const buildCat = buildCatMap.get(row.build_category_id as string);
      const surface = row.surface_option_id
        ? surfaceMap.get(row.surface_option_id as string)
        : undefined;

      return {
        id: row.id as string,
        product_id: row.product_id as string,
        variant_code: row.variant_code as string,
        frame_material: row.frame_material as FrameMaterialCode,
        build_category_id: row.build_category_id as string,
        build_category_label: buildCat?.public_label ?? "Standard",
        surface_option_id: (row.surface_option_id as string | null) ?? null,
        surface_label: surface?.label ?? null,
        size_code: row.size_code as string,
        size_label: row.size_label as string,
        length_ft: row.length_ft != null ? Number(row.length_ft) : null,
        width_ft: row.width_ft != null ? Number(row.width_ft) : null,
        height_ft: row.height_ft != null ? Number(row.height_ft) : null,
        finish_label: (row.finish_label as string | null) ?? null,
        variant_image_url: (row.variant_image_url as string | null) ?? null,
        availability: row.availability as VariantAvailability,
        lead_time_days:
          row.lead_time_days != null ? Number(row.lead_time_days) : null,
        sort_order: Number(row.sort_order ?? 100),
      };
    });
  } catch {
    return [];
  }
}
