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
import ProductLifecycleActions from "@/app/admin/(dashboard)/products/[id]/ProductLifecycleActions";
import ProductOptionsAvailability from "@/app/admin/(dashboard)/products/[id]/ProductOptionsAvailability";
import { FALLBACK_OPTIONS } from "@/lib/configuratorOptions";
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
}

export const instant = false;

export default async function AdminProductPage({ params }: ProductPageProps) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const { id } = await params;
  const isNew = id === "new";

  if (!isNew && !UUID_RE.test(id)) {
    notFound();
  }

  let product: AdminProduct | null = null;
  let pricing: AdminPricingRule | null = null;
  let variants: AdminVariant[] = [];

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

    if (productResult.error || !productResult.data) {
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

  const [optionResult, materialResult] = await Promise.all([
    db
      .from("configurator_options")
      .select("option_group, option_code, parent_code, label_en, swatch_texture_img")
      .eq("is_active", true)
      .order("sort_order"),
    db
      .from("material_rates")
      .select("material_code, display_name, category, cost_per_unit")
      .order("category")
      .order("display_name"),
  ]);

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

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-3">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to products
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight">
              {product ? product.name : "New Product"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {product && (
                <>
                  <span className="px-2 py-0.5 rounded bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-widest">
                    {product.sku}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-neutral-200 text-[9px] font-bold uppercase tracking-widest text-neutral-600">
                    {product.product_type}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                      product.is_active
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                    }`}
                  >
                    {product.is_active ? "Active" : "Archived"}
                  </span>
                </>
              )}
              {!product && (
                <span className="text-[11px] text-neutral-500">
                  Add details and images now. Variants and swatches unlock after the first save.
                </span>
              )}
            </div>
          </div>

          {product && <ProductLifecycleActions product={product} />}
        </div>
      </div>

      <ProductForm product={product} pricing={pricing} />

      {product && (
        <>
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
        </>
      )}
    </div>
  );
}
