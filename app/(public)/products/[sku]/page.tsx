import "server-only";

import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publicImageUrl } from "@/lib/media/paths";
import Link from "next/link";
import ProductConfiguratorLoader from "@/components/ProductConfiguratorLoader";
import { supabaseServer } from "@/lib/supabase/server";
import {
  FALLBACK_OPTIONS,
  mergeConfigOptions,
  type ConfigOption,
} from "@/lib/configuratorOptions";
import {
  getTypeGroupRows,
  isProductType,
  type OptionGroupRow,
} from "@/lib/productTypeConfig";
import { getFromPriceForProduct, getCachedFromPrices } from "@/lib/pricing/fromPrice";
import {
  sanitizePublicConfigOptions,
  sanitizePublicOptionGroups,
} from "@/lib/buildCategory";
import { getPublicVariantsForProduct } from "@/lib/variants/publicCatalog";
import { company } from "@/lib/company";
import {
  buildBreadcrumbJsonLd,
  buildProductStructuredData,
} from "@/lib/seo/structuredData";
import {
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  productPath,
  productUrl,
} from "@/lib/site";

// Product data is fetched live from Supabase (metadata + configurator), so this
// route is allowed to block instead of being validated for instant navigation.
export const instant = false;

interface SkuPageProps {
  params: Promise<{ sku: string }>;
}

type PublicProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  product_type: string;
  base_length_ft: number;
  base_width_ft: number;
  base_height_ft?: number;
  allowed_top_categories: string[];
  frame_material?: string | null;
  short_description?: string | null;
  is_knockdown_available: boolean;
  warranty_text: string;
  main_image_url: string;
  hover_blueprint_img?: string | null;
  top_category_images?: Record<string, string>;
  gallery_images?: string[];
  use_cases?: string[];
  material_tags?: string[];
  sort_order?: number;
  top_overlay_note?: string | null;
};

type PublicVariant = {
  top_material_code?: string | null;
  frame_color?: string | null;
  preview_image_url: string;
  size_option?: string | null;
  selection_key?: string | null;
};

// Fallback known products for offline / pre-seed verification
const KNOWN_PRODUCTS: Record<
  string,
  {
    id: string;
    sku: string;
    name: string;
    category: string;
    product_type: string;
    base_length_ft: number;
    base_width_ft: number;
    main_image_url: string;
    hover_blueprint_img?: string | null;
    warranty_text: string;
    is_knockdown_available: boolean;
    allowed_top_categories: string[];
    top_overlay_note?: string | null;
  }
> = {
  "IMS-CF-42": {
    id: "fb-cafe-42",
    sku: "IMS-CF-42",
    name: "Commercial Heavy-Gauge Cafe Table (4x2 ft)",
    category: "SS & MS Tables",
    product_type: "TABLE",
    base_length_ft: 4.0,
    base_width_ft: 2.0,
    main_image_url: "/images/cat-dining-tables.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "3-Yr Welding Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["WOOD", "STONE"],
    top_overlay_note: "Paired with 100% Seasoned Grade-A Hardwood or 18mm Export-Grade Natural Granite",
  },
  "IMS-WS-425": {
    id: "fb-ws-425",
    sku: "IMS-WS-425",
    name: "Zero-Shake Modular Office Workstation (4x2.5 ft)",
    category: "SS & MS Tables",
    product_type: "TABLE",
    base_length_ft: 4.0,
    base_width_ft: 2.5,
    main_image_url: "/images/cat-workstations.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "3-Yr Welding Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["WOOD", "STONE"],
    top_overlay_note: "Engineered for dual-monitor setups with cable management channel",
  },
  "IMS-DN-63": {
    id: "fb-dn-63",
    sku: "IMS-DN-63",
    name: "Industrial Grade 6-Seater Dining Table (6x3 ft)",
    category: "SS & MS Tables",
    product_type: "TABLE",
    base_length_ft: 6.0,
    base_width_ft: 3.0,
    main_image_url: "/images/hero-workstation.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "3-Yr Welding Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["WOOD", "STONE"],
    top_overlay_note: "Heavy-duty cross-braced frame supporting up to 200 Kg load",
  },
  "IMS-CH-01": {
    id: "fb-chair-01",
    sku: "IMS-CH-01",
    name: "Cafe Chair",
    category: "SS & MS Chairs",
    product_type: "CHAIR",
    base_length_ft: 1.5,
    base_width_ft: 1.5,
    main_image_url: "/images/placeholder-chair.svg",
    hover_blueprint_img: null,
    warranty_text: "7-Year Weld Warranty",
    is_knockdown_available: true,
    allowed_top_categories: [],
    top_overlay_note: null,
  },
  "IMS-CH-BS": {
    id: "fb-chair-bs",
    sku: "IMS-CH-BS",
    name: "Bar Stool",
    category: "SS & MS Chairs",
    product_type: "CHAIR",
    base_length_ft: 1.4,
    base_width_ft: 1.4,
    main_image_url: "/images/placeholder-chair.svg",
    hover_blueprint_img: null,
    warranty_text: "7-Year Weld Warranty",
    is_knockdown_available: true,
    allowed_top_categories: [],
    top_overlay_note: null,
  },
  "IMS-ST-12": {
    id: "fb-stand-12",
    sku: "IMS-ST-12",
    name: "12-inch Stool",
    category: "SS & MS Tables",
    product_type: "STAND",
    base_length_ft: 1.0,
    base_width_ft: 1.0,
    main_image_url: "/images/placeholder-stand.svg",
    hover_blueprint_img: null,
    warranty_text: "7-Year Weld Warranty",
    is_knockdown_available: false,
    allowed_top_categories: [],
    top_overlay_note: null,
  },
  "IMS-ST-INV": {
    id: "fb-stand-inv",
    sku: "IMS-ST-INV",
    name: "Inverter Stand",
    category: "SS & MS Tables",
    product_type: "STAND",
    base_length_ft: 1.5,
    base_width_ft: 1.0,
    main_image_url: "/images/placeholder-stand.svg",
    hover_blueprint_img: null,
    warranty_text: "7-Year Weld Warranty",
    is_knockdown_available: false,
    allowed_top_categories: [],
    top_overlay_note: null,
  },
  "IMS-ST-KD": {
    id: "fb-stand-kd",
    sku: "IMS-ST-KD",
    name: "Kadai Stand",
    category: "SS & MS Tables",
    product_type: "STAND",
    base_length_ft: 1.2,
    base_width_ft: 1.2,
    main_image_url: "/images/placeholder-stand.svg",
    hover_blueprint_img: null,
    warranty_text: "7-Year Weld Warranty",
    is_knockdown_available: false,
    allowed_top_categories: [],
    top_overlay_note: null,
  },
  "IMS-RK-01": {
    id: "fb-rack-01",
    sku: "IMS-RK-01",
    name: "Boutique Garment Rack",
    category: "SS & MS Tables",
    product_type: "RACK",
    base_length_ft: 4.0,
    base_width_ft: 1.5,
    main_image_url: "/images/placeholder-rack.svg",
    hover_blueprint_img: null,
    warranty_text: "10-Year Structural Warranty",
    is_knockdown_available: false,
    allowed_top_categories: [],
    top_overlay_note: null,
  },
  "IMS-SS-CT": {
    id: "fb-ss-ct",
    sku: "IMS-SS-CT",
    name: "SS Canteen Table",
    category: "SS & MS Tables",
    product_type: "SS_UNIT",
    base_length_ft: 4.0,
    base_width_ft: 2.0,
    main_image_url: "/images/placeholder-ss.svg",
    hover_blueprint_img: null,
    warranty_text: "15-Year Rust-Free Warranty",
    is_knockdown_available: false,
    allowed_top_categories: [],
    top_overlay_note: null,
  },
};

const HAS_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function generateMetadata({ params }: SkuPageProps): Promise<Metadata> {
  const { sku } = await params;
  const upperSku = sku.toUpperCase();
  const fallback = KNOWN_PRODUCTS[upperSku];

  let name = fallback?.name ?? upperSku;
  let category = fallback?.category ?? "Factory steel furniture";
  let image = fallback?.main_image_url ?? "/og-default.png";
  let useCases: string[] = [];
  let seoTitle: string | null = null;
  let seoDescription: string | null = null;
  let seoAlt: string | null = null;

  if (HAS_SUPABASE) {
    try {
      const { data } = await supabaseServer
        .from("products")
        .select("id, name, category, main_image_url, use_cases, short_description")
        .eq("sku", upperSku)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        name = data.name;
        category = data.category;
        image = publicImageUrl(data.main_image_url) ?? "/og-default.png";
        useCases = Array.isArray(data.use_cases) ? data.use_cases : [];

        const { data: seoRow } = await supabaseServer
          .from("product_seo")
          .select("seo_title, meta_description, image_alt_text, og_image_url")
          .eq("product_id", data.id)
          .maybeSingle();

        if (seoRow) {
          seoTitle = seoRow.seo_title ?? null;
          seoDescription = seoRow.meta_description ?? null;
          seoAlt = seoRow.image_alt_text ?? null;
          if (seoRow.og_image_url) {
            image = publicImageUrl(seoRow.og_image_url) ?? image;
          }
        }
      }
    } catch {
      // Keep static fallback metadata.
    }
  }

  const useCaseText =
    useCases.length > 0
      ? useCases
          .map(
            (useCase) =>
              useCase.charAt(0) + useCase.slice(1).toLowerCase().replace(/_/g, " ")
          )
          .join(", ")
      : category;

  const title = seoTitle || `${name} | ${SITE_NAME} Factory Direct`;
  const description =
    seoDescription ||
    `${name} — ${useCaseText}. Configure live factory pricing, material options and direct SIDCO Coimbatore dispatch.`;
  const canonical = productPath(upperSku);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [
        {
          url: absoluteUrl(image),
          alt: seoAlt || name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | ${SITE_NAME}`,
      description,
      images: [absoluteUrl(image)],
    },
  };
}

function safeOverlayNote(note: string | null | undefined): string | null {
  if (!note) return null;
  if (/discount|combo\s*discount|\boff\b|%/i.test(note)) return null;
  return note;
}

export default async function SkuPage({ params }: SkuPageProps) {
  const { sku } = await params;
  const upperSku = sku.toUpperCase();

  let product: PublicProduct | null = null;
  let visualVariants: PublicVariant[] = [];
  let configuratorOptions: ConfigOption[] = FALLBACK_OPTIONS;
  let typeGroups: OptionGroupRow[] = [];

  try {
    const { data: prodData } = await supabaseServer
      .from("products")
      .select(
        "id, sku, name, category, product_type, base_length_ft, base_width_ft, base_height_ft, allowed_top_categories, frame_material, short_description, is_knockdown_available, warranty_text, main_image_url, hover_blueprint_img, is_active, use_cases, material_tags, sort_order, top_overlay_note, top_category_images, gallery_images"
      )
      .eq("sku", upperSku)
      .eq("is_active", true)
      .maybeSingle();

    if (prodData) {
      product = {
        id: prodData.id,
        sku: prodData.sku,
        name: prodData.name,
        category: prodData.category,
        product_type: prodData.product_type,
        base_length_ft: Number(prodData.base_length_ft),
        base_width_ft: Number(prodData.base_width_ft),
        base_height_ft: Number(prodData.base_height_ft ?? 2.5),
        top_category_images:
          prodData.top_category_images &&
          typeof prodData.top_category_images === "object"
            ? Object.fromEntries(Object.entries(prodData.top_category_images as Record<string, string>)
                .flatMap(([key, value]) => {
                  const url = publicImageUrl(value);
                  return url ? [[key, url]] : [];
                }))
            : {},
        gallery_images: Array.isArray(prodData.gallery_images)
          ? (prodData.gallery_images as string[]).flatMap((value) => publicImageUrl(value) ?? [])
          : [],
        main_image_url: publicImageUrl(prodData.main_image_url) ?? "/images/product-placeholder.svg",
        hover_blueprint_img: publicImageUrl(prodData.hover_blueprint_img),
        warranty_text: prodData.warranty_text,
        is_knockdown_available: prodData.is_knockdown_available,
        allowed_top_categories: Array.isArray(prodData.allowed_top_categories)
          ? prodData.allowed_top_categories.filter((c: string) => c !== "FRAME_ONLY")
          : ["WOOD", "STONE"],
        frame_material: prodData.frame_material ?? null,
        short_description: prodData.short_description ?? null,
        top_overlay_note: safeOverlayNote(prodData.top_overlay_note),
      };

      const { data: vData } = await supabaseServer
        .from("product_visual_variants")
        .select(
          "top_material_code, frame_color, preview_image_url, size_option, selection_key"
        )
        .eq("product_id", prodData.id);

      if (vData) {
        visualVariants = vData.map((row) => ({ ...row, preview_image_url: publicImageUrl(row.preview_image_url) ?? "" }));
      }

      const { data: oData } = await supabaseServer
        .from("configurator_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (oData && oData.length > 0) {
        configuratorOptions = mergeConfigOptions(FALLBACK_OPTIONS, (oData as ConfigOption[]).map((row) => ({
          ...row, swatch_texture_img: publicImageUrl(row.swatch_texture_img),
        })));
      }
    }
  } catch {
    // Fail silently to fallbacks
  }

  // Pre-seed fallback
  if (!product && KNOWN_PRODUCTS[upperSku]) {
    product = KNOWN_PRODUCTS[upperSku];
  }

  // Unknown SKU -> 404
  if (!product) {
    notFound();
  }

  const engineProductType = isProductType(product.product_type)
    ? product.product_type
    : "TABLE";

  typeGroups = getTypeGroupRows(engineProductType);

  if (engineProductType !== "TABLE") {
    try {
      const { data: groupData } = await supabaseServer
        .from("product_type_option_groups")
        .select("*")
        .eq("product_type", engineProductType)
        .order("sort_order");

      if (groupData && groupData.length > 0) {
        typeGroups = getTypeGroupRows(engineProductType, groupData);
      }
    } catch {
      // Keep static group mapping.
    }
  }

  let fromPrice: number | null = null;

  if (product.id && !String(product.id).startsWith("fb-")) {
    try {
      fromPrice = await getFromPriceForProduct(product.id);
    } catch {
      fromPrice = null;
    }
  }

  const typeGroupSet = new Set(typeGroups.map((group) => group.option_group));
  let typeOptions = configuratorOptions.filter((option) =>
    typeGroupSet.has(option.option_group)
  );

  try {
    const { data: availability } = await supabaseServer
      .from("product_option_availability")
      .select("option_code, is_enabled")
      .eq("product_id", product.id);

    if (availability && availability.length > 0) {
      const tracked = new Set(
        availability.map((row) => row.option_code)
      );
      const disabled = new Set(
        availability.filter((row) => !row.is_enabled).map((row) => row.option_code)
      );

      // Options without a row (including newly added options) stay available;
      // only options explicitly recorded as disabled are hidden.
      typeOptions = typeOptions.filter(
        (option) => !tracked.has(option.option_code) || !disabled.has(option.option_code)
      );
    }
    // No availability rows means every option is available by default;
    // the admin only writes rows after an option is explicitly toggled.
  } catch {
    // Keep all active options when availability cannot be loaded.
  }

  let relatedSets: Array<{ sku: string; name: string }> = [];
  let publishedVariants: Awaited<ReturnType<typeof getPublicVariantsForProduct>> = [];
  let moqQty: number | null = null;
  let specialQuoteQty: number | null = null;
  let seoH1: string | null = null;
  let imageAltText: string | null = null;
  let relatedProducts: Array<{
    sku: string;
    name: string;
    category: string;
    from_price: number | null;
  }> = [];

  if (product.id && !String(product.id).startsWith("fb-")) {
    try {
      const [pv, bulkRes, seoRes, relRes, priceMap] = await Promise.all([
        getPublicVariantsForProduct(product.id),
        supabaseServer
          .from("bulk_rules")
          .select("min_qty, special_quote_qty")
          .eq("product_type", engineProductType)
          .eq("is_active", true)
          .maybeSingle(),
        supabaseServer
          .from("product_seo")
          .select("product_h1, image_alt_text")
          .eq("product_id", product.id)
          .maybeSingle(),
        supabaseServer
          .from("products")
          .select("id, sku, name, category")
          .eq("category", product.category)
          .eq("is_active", true)
          .neq("id", product.id)
          .limit(3),
        getCachedFromPrices(),
      ]);

      publishedVariants = pv;
      moqQty = bulkRes.data?.min_qty != null ? Number(bulkRes.data.min_qty) : null;
      specialQuoteQty =
        bulkRes.data?.special_quote_qty != null
          ? Number(bulkRes.data.special_quote_qty)
          : null;
      seoH1 = seoRes.data?.product_h1 ?? null;
      imageAltText = seoRes.data?.image_alt_text ?? null;
      relatedProducts = (relRes.data ?? []).map((r) => ({
        sku: r.sku as string,
        name: r.name as string,
        category: r.category as string,
        from_price: priceMap[r.id as string] ?? null,
      }));
    } catch {
      // Keep defaults
    }
  }

  if (product.product_type === "TABLE") {
    try {
      const { data: links } = await supabaseServer
        .from("product_set_items")
        .select("set_id")
        .eq("product_id", product.id);

      const setIds = [...new Set((links ?? []).map((link) => link.set_id))];
      if (setIds.length > 0) {
        const { data: setRows } = await supabaseServer
          .from("product_sets")
          .select("sku, name")
          .in("id", setIds)
          .eq("is_active", true)
          .order("sort_order");

        relatedSets = setRows ?? [];
      }
    } catch {
      relatedSets = [];
    }
  }

  const canonicalUrl = productUrl(product.sku);
  const productJsonLd = buildProductStructuredData({
    sku: product.sku,
    name: seoH1 || product.name,
    description: product.short_description ?? null,
    category: product.category,
    canonicalUrl,
    mainImageUrl: product.main_image_url,
    fromPrice,
    variants: publishedVariants.map((v) => ({
      variant_code: v.variant_code,
      frame_material: v.frame_material,
      build_category_label: v.build_category_label,
      surface_label: v.surface_label,
      size_label: v.size_label,
      availability: v.availability,
      unit_price: fromPrice,
      image_url: v.variant_image_url,
    })),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Catalog", url: `${SITE_URL}/products` },
    { name: product.sku, url: canonicalUrl },
  ]);

  return (
    <div className="sanra-subpage min-h-[70vh] py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="sanra-container">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-8 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-black transition-colors">
            Catalog
          </Link>
          <span>/</span>
          <span className="text-neutral-800">{product.sku}</span>
        </div>

        <ProductConfiguratorLoader
          product={product}
          typeOptions={sanitizePublicConfigOptions(typeOptions)}
          groups={sanitizePublicOptionGroups(typeGroups)}
          visualVariants={visualVariants}
          fromPrice={fromPrice}
          engineProductType={engineProductType}
          topCategoryImages={
            (product.top_category_images as Record<string, string> | undefined) ?? null
          }
          publishedVariants={publishedVariants}
          moqQty={moqQty}
          specialQuoteQty={specialQuoteQty}
          whatsappNumber={company.whatsappNumber}
          relatedProducts={relatedProducts}
          seoH1={seoH1}
          imageAltText={imageAltText}
        />

        {relatedSets.length > 0 && (
          <section className="mt-12 border-t border-neutral-200 pt-8">
            <h2 className="text-lg font-extrabold text-[#111111] tracking-tight">
              Complete the Set
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              This table is part of these factory sets.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedSets.map((set) => (
                <Link
                  key={set.sku}
                  href={`/sets/${encodeURIComponent(set.sku)}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-neutral-300 text-xs font-semibold text-neutral-800 hover:border-neutral-500"
                >
                  {set.name}
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
