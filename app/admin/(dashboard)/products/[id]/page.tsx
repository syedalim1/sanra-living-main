import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import ProductForm from "@/app/admin/(dashboard)/products/[id]/ProductForm";
import ImageManager from "@/app/admin/(dashboard)/products/[id]/ImageManager";
import VariantManager from "@/app/admin/(dashboard)/products/[id]/VariantManager";
import SwatchManager from "@/app/admin/(dashboard)/products/[id]/SwatchManager";
import ProductLifecycleActions from "@/app/admin/(dashboard)/products/[id]/ProductLifecycleActions";
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
      allowed_top_categories: Array.isArray(row.allowed_top_categories)
        ? (row.allowed_top_categories as string[])
        : [],
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
      .select("material_code, display_name, category")
      .order("category")
      .order("display_name"),
  ]);

  const allOptions: AdminOption[] = (optionResult.data ?? []).map((option) => ({
    option_group: option.option_group,
    option_code: option.option_code,
    parent_code: option.parent_code ?? null,
    label_en: option.label_en,
    swatch_texture_img: option.swatch_texture_img ?? null,
  }));

  const materialOptions: AdminMaterialOption[] = (materialResult.data ?? []).map((material) => ({
    material_code: material.material_code,
    display_name: material.display_name,
    category: material.category,
  }));

  const topOptions = allOptions;
  const sizeOptions =
    product?.product_type === "TABLE"
      ? allOptions.filter(
          (option) => option.option_group === "SIZE" && option.option_code !== "CUSTOM"
        )
      : product?.product_type === "RACK"
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

  const frameOptions = allOptions
    .filter((option) => option.option_group === "FRAME_COLOR")
    .map((option) => ({ ...option }));

  if (!frameOptions.some((option) => option.option_code === "SS")) {
    frameOptions.push({
      option_group: "FRAME_COLOR",
      option_code: "SS",
      parent_code: null,
      label_en: "Natural Stainless Steel",
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
                  Create the product first, then upload images and variants.
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
          <ImageManager
            productId={product.id}
            mainImageUrl={product.main_image_url}
            hoverImageUrl={product.hover_blueprint_img}
          />

          <VariantManager
            productId={product.id}
            variants={variants}
            topOptions={topOptions}
            materialOptions={materialOptions}
            frameOptions={frameOptions}
            sizeOptions={sizeOptions}
          />

          <SwatchManager options={swatchOptions} />
        </>
      )}
    </div>
  );
}
