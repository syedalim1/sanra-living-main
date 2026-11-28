import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import ProductForm from "@/app/admin/(dashboard)/products/[id]/ProductForm";
import VariantManager from "@/app/admin/(dashboard)/products/[id]/VariantManager";
import SwatchManager from "@/app/admin/(dashboard)/products/[id]/SwatchManager";
import ProductLifecycleActions, {
  type PublicationChecklist,
} from "@/app/admin/(dashboard)/products/[id]/ProductLifecycleActions";
import ProductOptionsAvailability from "@/app/admin/(dashboard)/products/[id]/ProductOptionsAvailability";
import VariantCostingPanel, {
  type AdminVariantRowView,
} from "@/app/admin/(dashboard)/products/[id]/VariantCostingPanel";
import ProductSeoPanel from "@/app/admin/(dashboard)/products/[id]/ProductSeoPanel";
import { evaluateVariantPricing } from "@/lib/pricing/variantPricingEngine";
import type {
  PrivatePricingProfile,
  PrivateVariantPricing,
  PublicSurfaceOption,
} from "@/lib/variants/types";
import { FALLBACK_OPTIONS } from "@/lib/configuratorOptions";
import { PRODUCT_PLACEHOLDER } from "@/lib/admin/product-types";
import { suggestPricingProfile, surfaceAppliesToModel } from "@/lib/admin/variantSetup";
import { EditorSection } from "./EditorSection";
import { isProductType } from "@/lib/productTypeConfig";
import type {
  AdminMaterialOption,
  AdminOption,
  AdminPricingRule,
  AdminProduct,
  AdminVariant,
} from "@/lib/admin/product-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string | string[] }>;
}

export const instant = false;

export default async function AdminProductPage({ params, searchParams }: ProductPageProps) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const { id } = await params;
  const isNew = id === "new";
  const created = isNew ? (await searchParams).created : undefined;

  if (!isNew && !UUID_RE.test(id)) {
    notFound();
  }

  let product: AdminProduct | null = null;
  let pricing: AdminPricingRule | null = null;
  let variants: AdminVariant[] = [];
  let adminEconomicVariants: AdminVariantRowView[] = [];
  let adminSurfaces: PublicSurfaceOption[] = [];
  let adminProfiles: PrivatePricingProfile[] = [];
  let productSeo: {
    seo_title: string | null;
    meta_description: string | null;
    product_h1: string | null;
    image_alt_text: string | null;
    og_image_url: string | null;
  } | null = null;
  let checklist: PublicationChecklist | undefined = undefined;

  if (!isNew) {
    const [productResult, pricingResult, variantResult] = await Promise.all([
      db.from("products").select("*").eq("id", id).maybeSingle(),
      db.from("product_pricing_rules").select("*").eq("product_id", id).maybeSingle(),
      db
        .from("product_visual_variants")
        .select(
          "id, product_id, top_material_code, frame_color, preview_image_url, size_option, size_multiplier, selection_key"
        )
        .eq("product_id", id)
        .order("created_at"),
    ]);

    if (productResult.error || pricingResult.error || variantResult.error) {
      throw new Error("Unable to load product details.");
    }
    if (!productResult.data) {
      notFound();
    }

    const row = productResult.data;
    product = {
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      product_type: row.product_type,
      base_length_ft: Number(row.base_length_ft),
      base_width_ft: Number(row.base_width_ft),
      base_height_ft: Number(row.base_height_ft ?? 2.5),
      top_category_images:
        row.top_category_images && typeof row.top_category_images === "object"
          ? (row.top_category_images as Record<string, string>)
          : {},
      gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images : [],
      allowed_top_categories: Array.isArray(row.allowed_top_categories)
        ? (row.allowed_top_categories as string[])
        : [],
      frame_material: row.frame_material ?? "MS",
      short_description: row.short_description ?? null,
      is_knockdown_available: Boolean(row.is_knockdown_available),
      warranty_text: row.warranty_text,
      main_image_url: row.main_image_url,
      hover_blueprint_img: row.hover_blueprint_img,
      is_active: Boolean(row.is_active),
      use_cases: Array.isArray(row.use_cases) ? (row.use_cases as string[]) : [],
      material_tags: Array.isArray(row.material_tags) ? (row.material_tags as string[]) : [],
      sort_order: Number(row.sort_order ?? 100),
    };

    if (pricingResult.data) {
      pricing = {
        base_pipe_weight_18g_kg: Number(pricingResult.data.base_pipe_weight_18g_kg),
        top_area_sqft: Number(pricingResult.data.top_area_sqft),
        consumables_cost: Number(pricingResult.data.consumables_cost),
        labor_cost: Number(pricingResult.data.labor_cost),
        overhead_pct: Number(pricingResult.data.overhead_pct),
        retail_margin_pct: Number(pricingResult.data.retail_margin_pct),
        b2b_margin_pct: Number(pricingResult.data.b2b_margin_pct ?? 0),
        finishing_cost: Number(pricingResult.data.finishing_cost ?? 0),
        b2b_moq: Number(pricingResult.data.b2b_moq ?? 1),
        direct_price:
          pricingResult.data.direct_price == null
            ? null
            : Number(pricingResult.data.direct_price),
        granite_top_price:
          pricingResult.data.granite_top_price == null
            ? null
            : Number(pricingResult.data.granite_top_price),
        wood_top_price:
          pricingResult.data.wood_top_price == null
            ? null
            : Number(pricingResult.data.wood_top_price),
        combo_config:
          pricingResult.data.combo_config &&
          typeof pricingResult.data.combo_config === "object"
            ? (pricingResult.data.combo_config as Record<string, unknown>)
            : {},
        pipe_spec: pricingResult.data.pipe_spec ?? null,
      };
    }

    variants = (variantResult.data ?? []).map((variant) => ({
      id: variant.id,
      product_id: variant.product_id,
      top_material_code: variant.top_material_code,
      frame_color: variant.frame_color,
      preview_image_url: variant.preview_image_url,
      size_option: variant.size_option,
      size_multiplier: Number(variant.size_multiplier),
      selection_key: variant.selection_key ?? null,
    }));
  }

  const [optionResult, materialResult] = product ? await Promise.all([
    db
      .from("configurator_options")
      .select("option_group, option_code, parent_code, label_en, swatch_texture_img")
      .eq("is_active", true)
      .order("sort_order"),
    db
      .from("material_rates")
      .select("material_code, display_name, category")
      .order("category")
      .order("display_name"),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (optionResult.error || materialResult.error) throw new Error("Unable to load catalog options.");

  const dbOptions: AdminOption[] = (optionResult.data ?? []).map((option) => ({
    option_group: option.option_group,
    option_code: option.option_code,
    parent_code: option.parent_code ?? null,
    label_en: option.label_en,
    swatch_texture_img: option.swatch_texture_img ?? null,
  }));
  // Start from the built-in option catalogue so the admin screens stay in sync
  // with the customer configurator even when a DB group/code pair is missing
  // (option_code is unique per table, so some groups share codes like SS202).
  const optionMap = new Map<string, AdminOption>();
  for (const option of FALLBACK_OPTIONS) {
    optionMap.set(`${option.option_group}:${option.option_code}`, {
      option_group: option.option_group,
      option_code: option.option_code,
      parent_code: option.parent_code ?? null,
      label_en: option.label_en,
      swatch_texture_img: option.swatch_texture_img ?? null,
    });
  }
  for (const option of dbOptions) {
    optionMap.set(`${option.option_group}:${option.option_code}`, option);
  }
  const allOptions: AdminOption[] = [...optionMap.values()];

  const materialOptions: AdminMaterialOption[] = (materialResult.data ?? []).map((material) => ({
    material_code: material.material_code,
    display_name: material.display_name,
    category: material.category,
  }));

  // CHAIR_TABLE_SET products are rendered and priced with the TABLE engine,
  // so their variants and option availability must use the TABLE groups.
  const engineProductType =
    product?.product_type === "CHAIR_TABLE_SET"
      ? "TABLE"
      : product?.product_type ?? null;

  const topOptions = allOptions.filter(
    (option) =>
      (option.option_group === "TOP_TAB" &&
        (option.option_code === "WOOD" || option.option_code === "STONE")) ||
      (option.option_group === "TOP_MATERIAL" && option.parent_code !== "METAL")
  );
  const sizeOptions =
    engineProductType === "TABLE"
      ? allOptions.filter(
          (option) => option.option_group === "SIZE" && option.option_code !== "CUSTOM"
        )
      : engineProductType === "RACK"
      ? allOptions.filter((option) => option.option_group === "RACK_SIZE")
      : [
          {
            option_group: "SIZE",
            option_code: "STD",
            parent_code: null,
            label_en: "Standard",
            swatch_texture_img: null,
          },
        ];

  let availabilityGroups: Array<{ option_group: string; group_title: string }> = [];
  let disabledOptionCodes: string[] = [];

  if (product && engineProductType && isProductType(engineProductType)) {
    const [typeGroupResult, availabilityResult] = await Promise.all([
      db
        .from("product_type_option_groups")
        .select("option_group, group_title, is_active, sort_order")
        .eq("product_type", engineProductType)
        .order("sort_order"),
      db
        .from("product_option_availability")
        .select("option_code, is_enabled")
        .eq("product_id", product.id),
    ]);

    if (typeGroupResult.error || availabilityResult.error) throw new Error("Unable to load product availability.");
    availabilityGroups = (typeGroupResult.data ?? [])
      .filter((group) => group.is_active !== false)
      .map((group) => ({
        option_group: group.option_group,
        group_title: group.group_title,
      }));

    if (engineProductType === "TABLE" && !availabilityGroups.some((g) => g.option_group === "FRAME_MATERIAL")) {
      availabilityGroups.unshift({
        option_group: "FRAME_MATERIAL",
        group_title: "Frame material",
      });
    }

    disabledOptionCodes = (availabilityResult.data ?? [])
      .filter((row) => !row.is_enabled)
      .map((row) => row.option_code);
  }

  const swatchGroups = new Set([
    "TOP_MATERIAL",
    "FRAME_COLOR",
    "SEAT_COLOR",
    "FINISH",
    "SS_FINISH",
  ]);

  const swatchOptions = allOptions.filter((option) =>
    swatchGroups.has(option.option_group)
  );

  const coreFrameCodes = new Set(["MATTE_BLACK", "GREY", "SS_FINISH", "SS"]);
  const frameOptions = allOptions
    .filter(
      (option) =>
        option.option_group === "FRAME_COLOR" &&
        coreFrameCodes.has(option.option_code)
    )
    .map((option) => ({ ...option }));

  if (!frameOptions.some((option) => option.option_code === "SS_FINISH")) {
    frameOptions.push({
      option_group: "FRAME_COLOR",
      option_code: "SS_FINISH",
      parent_code: null,
      label_en: "SS Mirror / Matte Finish",
      swatch_texture_img: null,
    });
  }

  if (!isNew && product) {
    const [
      econRes,
      buildCatsRes,
      surfacesRes,
      profilesRes,
      seoRes,
    ] = await Promise.all([
      db
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("sort_order"),
      db.from("build_categories").select("id, public_label, level, is_active, frame_material"),
      db
        .from("surface_options")
        .select("id, code, kind, label, material_family, public_description, applicable_product_types, sort_order")
        .eq("is_active", true)
        .order("sort_order"),
      db
        .from("pricing_profiles")
        .select("*")
        .eq("is_active", true)
        .order("code"),
      db
        .from("product_seo")
        .select("seo_title, meta_description, product_h1, image_alt_text, og_image_url")
        .eq("product_id", product.id)
        .maybeSingle(),
    ]);

    if (econRes.error || buildCatsRes.error || surfacesRes.error || profilesRes.error || seoRes.error) {
      throw new Error("Unable to load variant costing or SEO settings.");
    }
    adminSurfaces = (surfacesRes.data as PublicSurfaceOption[]) ?? [];
    adminProfiles = (profilesRes.data as PrivatePricingProfile[]) ?? [];
    productSeo = seoRes.data ?? null;

    const econRows = econRes.data ?? [];
    const econIds = econRows.map((r) => r.id as string);
    const { data: vpRows, error: vpError } =
      econIds.length > 0
        ? await db
            .from("variant_pricing_private")
            .select("variant_id, manufacturing_cost, pricing_profile_id, cost_source, price_override_ex_gst, price_override_inc_gst, min_selling_price, updated_at")
            .in("variant_id", econIds)
        : { data: [], error: null };
    if (vpError) throw new Error("Unable to load variant prices.");

    const vpMap = new Map((vpRows ?? []).map((row) => [row.variant_id as string, row]));
    const buildById = new Map(buildCatsRes.data.map((build) => [build.id, build]));
    const surfaceById = new Map(adminSurfaces.map((surface) => [surface.id, surface]));
    const profileMap = new Map(adminProfiles.map((profile) => [profile.id, profile]));
    const publishedReadiness: boolean[] = [];
    const hasDimensions = product.base_length_ft > 0 && product.base_width_ft > 0 && Number(product.base_height_ft) > 0;

    adminEconomicVariants = econRows.map((variant) => {
      const row = vpMap.get(variant.id);
      const pricing = row ? {
        variant_id: variant.id,
        manufacturing_cost: row.manufacturing_cost == null ? null : Number(row.manufacturing_cost),
        cost_source: row.cost_source,
        cost_effective_from: null,
        pricing_profile_id: row.pricing_profile_id,
        price_override_ex_gst: row.price_override_ex_gst == null ? null : Number(row.price_override_ex_gst),
        price_override_inc_gst: row.price_override_inc_gst == null ? null : Number(row.price_override_inc_gst),
        min_selling_price: row.min_selling_price == null ? null : Number(row.min_selling_price),
        internal_notes: null,
        updated_by: null,
        updated_at: row.updated_at,
      } satisfies PrivateVariantPricing : null;
      const assignedProfile = pricing?.pricing_profile_id ?? null;
      const suggestion = assignedProfile ? null
        : suggestPricingProfile(adminProfiles, variant.frame_material, product.product_type);
      const build = buildById.get(variant.build_category_id);
      const result = evaluateVariantPricing({
        variantId: variant.id,
        variantCode: variant.variant_code,
        availability: variant.availability,
        leadTimeDays: variant.lead_time_days,
        sizeCode: variant.size_code,
        quantity: 1,
        pricing,
        profile: assignedProfile ? profileMap.get(assignedProfile) ?? null : null,
        bulkRule: null,
        tiers: [],
      });
      if (variant.status === "PUBLISHED") {
        const variantDimensions = variant.size_code === "CUSTOM"
          || (variant.size_code === "STANDARD" && hasDimensions)
          || (Number(variant.length_ft) > 0 && Number(variant.width_ft) > 0 && Number(variant.height_ft) > 0);
        publishedReadiness.push(Boolean(build?.is_active && build.frame_material === variant.frame_material
          && variant.size_label.trim() && variantDimensions
          && (!variant.surface_option_id || surfaceById.has(variant.surface_option_id))
          && (variant.availability === "QUOTE_ONLY" || (result.unit_price != null && result.unit_price > 0))));
      }
      return {
        id: variant.id,
        variant_code: variant.variant_code,
        frame_material: variant.frame_material,
        build_level: build?.level ?? "STANDARD",
        build_category_label: build?.public_label ?? "Standard",
        size_code: variant.size_code,
        size_label: variant.size_label,
        surface_label: surfaceById.get(variant.surface_option_id)?.label ?? null,
        surface_option_id: variant.surface_option_id,
        manufacturing_cost: pricing?.manufacturing_cost ?? null,
        pricing_profile_id: assignedProfile,
        suggested_profile_id: suggestion,
        calculated_selling_price: result.unit_price,
        price_basis: result.price_basis,
        price_override_ex_gst: pricing?.price_override_ex_gst ?? null,
        min_selling_price: pricing?.min_selling_price ?? null,
        lead_time_days: variant.lead_time_days,
        availability: variant.availability,
        status: variant.status,
        variant_revision: variant.updated_at,
        pricing_revision: pricing?.updated_at ?? null,
      };
    });

    checklist = {
      hasPhoto: Boolean(product.main_image_url?.trim() && product.main_image_url !== PRODUCT_PLACEHOLDER),
      hasDescription: Boolean(product.short_description?.trim()),
      hasDimensions,
      hasPublishedVariants: publishedReadiness.length > 0 && publishedReadiness.every(Boolean),
    };
  }

  const sections = [
    ["information", "Information"],
    ["photos", "Photos"],
    ["dimensions", "Dimensions and materials"],
    ...(product ? [["variants", "Variants"], ["costing", "Costing"], ["publication", "SEO and publication"]] : []),
  ];
  const dimensions = product ? `${product.base_length_ft} × ${product.base_width_ft} ft` : "";

  return (
    <div className="min-w-0 space-y-4 pb-12 text-neutral-900">
      <header className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-xs sm:px-6 sm:py-5">
        <Link href="/admin/products" className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-950">
          <ArrowLeft className="size-4" /> Products
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{product ? "Edit product" : "Add product"}</h1>
            {product && <p className="mt-1 break-words text-sm text-neutral-600">{product.name} · {product.sku}</p>}
          </div>
          <span className={`rounded-full border px-3 py-1 text-sm font-medium ${product?.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-stone-100 text-stone-700"}`}>
            {product?.is_active ? "Published" : "Draft"}
          </span>
        </div>
        <nav aria-label="Product editor sections" className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
          {sections.map(([anchor, label]) => (
            <a key={anchor} href={`#${anchor}`} className="inline-flex min-h-9 items-center rounded-lg bg-neutral-100 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-200">{label}</a>
          ))}
        </nav>
      </header>

      <ProductForm key={typeof created === "string" ? created : id} product={product} pricing={pricing} />

      {product && checklist && (
        <>
          <VariantCostingPanel
            productId={product.id}
            productType={product.product_type}
            primaryMaterial={product.frame_material === "SS" ? "SS" : "MS"}
            materialTags={product.material_tags}
            dimensions={dimensions}
            variants={adminEconomicVariants}
            surfaces={adminSurfaces
              .filter((surface) => surfaceAppliesToModel(surface, product.product_type, product.allowed_top_categories))
              .map(({ id, label }) => ({ id, label }))}
            profiles={adminProfiles.map(({ id, name }) => ({ id, name }))}
          />

          <EditorSection id="publication" title="SEO and publication">
            <ProductLifecycleActions product={product} checklist={checklist} />
            <details className="mt-4 rounded-xl border border-neutral-200 p-3 sm:p-4">
              <summary className="cursor-pointer py-1 text-sm font-semibold">Search and social metadata</summary>
              <ProductSeoPanel
                productId={product.id}
                productName={product.name}
                category={product.category}
                dimensionsLabel={dimensions}
                seo={productSeo}
              />
            </details>
          </EditorSection>

          <details className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:px-5">
            <summary className="cursor-pointer py-1 text-sm font-semibold">Advanced catalog tools</summary>
            <div className="mt-3 space-y-4">
          <VariantManager
            productId={product.id}
            variants={variants}
            topOptions={topOptions}
            materialOptions={materialOptions}
            frameOptions={frameOptions}
            sizeOptions={sizeOptions}
          />

          <SwatchManager options={swatchOptions} />

          <ProductOptionsAvailability
            productId={product.id}
            productType={engineProductType ?? product.product_type}
            groups={availabilityGroups}
            options={allOptions
              .filter(
                (option) =>
                  option.option_code !== "FRAME_ONLY" &&
                  !option.option_code.startsWith("SHEET_")
              )
              .map((option) => ({
                option_group: option.option_group,
                option_code: option.option_code,
                label_en: option.label_en,
              }))}
            disabledCodes={disabledOptionCodes}
          />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
