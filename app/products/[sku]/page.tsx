import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ProductConfiguratorLoader from "@/components/ProductConfiguratorLoader";
import { supabaseServer } from "@/lib/supabase/server";
import { FALLBACK_OPTIONS, ConfigOption } from "@/lib/configuratorOptions";
import {
  getTypeGroupRows,
  isProductType,
  type OptionGroupRow,
} from "@/lib/productTypeConfig";
import { getFromPriceForProduct } from "@/lib/pricing/fromPrice";
import {
  SITE_NAME,
  absoluteUrl,
  productPath,
  productUrl,
} from "@/lib/site";

interface SkuPageProps {
  params: Promise<{ sku: string }>;
}

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
    category: "Cafe & Dining Tables",
    product_type: "TABLE",
    base_length_ft: 4.0,
    base_width_ft: 2.0,
    main_image_url: "/images/cat-dining-tables.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"],
    top_overlay_note: "Paired with 18mm Kerala Rubberwood or 18mm Export Krishnagiri Granite",
  },
  "IMS-WS-425": {
    id: "fb-ws-425",
    sku: "IMS-WS-425",
    name: "Zero-Shake Modular Office Workstation (4x2.5 ft)",
    category: "Office & Workstation Tables",
    product_type: "TABLE",
    base_length_ft: 4.0,
    base_width_ft: 2.5,
    main_image_url: "/images/cat-workstations.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "METAL"],
    top_overlay_note: "Engineered for dual-monitor setups with cable management channel",
  },
  "IMS-DN-63": {
    id: "fb-dn-63",
    sku: "IMS-DN-63",
    name: "Industrial Grade 6-Seater Dining Table (6x3 ft)",
    category: "Cafe & Dining Tables",
    product_type: "TABLE",
    base_length_ft: 6.0,
    base_width_ft: 3.0,
    main_image_url: "/images/hero-workstation.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"],
    top_overlay_note: "Heavy-duty cross-braced frame supporting up to 200 Kg load",
  },
  "IMS-CH-01": {
    id: "fb-chair-01",
    sku: "IMS-CH-01",
    name: "Cafe Chair",
    category: "SS & MS Chairs / Bar Stools",
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
    category: "SS & MS Chairs / Bar Stools",
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
    category: "Home Utility Stands",
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
    category: "Home Utility Stands",
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
    category: "Home Utility Stands",
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
    category: "Boutique & Showroom Racks",
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
    category: "Hospital, Canteen & Lab SS",
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

export async function generateMetadata({ params }: SkuPageProps): Promise<Metadata> {
  const { sku } = await params;
  const upperSku = sku.toUpperCase();
  const fallback = KNOWN_PRODUCTS[upperSku];

  let name = fallback?.name ?? upperSku;
  let category = fallback?.category ?? "Factory steel furniture";
  let image = fallback?.main_image_url ?? "/og-default.png";
  let useCases: string[] = [];

  try {
    const { data } = await supabaseServer
      .from("products")
      .select("name, category, main_image_url, use_cases")
      .eq("sku", upperSku)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      name = data.name;
      category = data.category;
      image = data.main_image_url;
      useCases = Array.isArray(data.use_cases) ? data.use_cases : [];
    }
  } catch {
    // Keep static fallback metadata.
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

  const description = `${name} — ${useCaseText}. Configure live factory pricing, structural steel options and direct SIDCO Coimbatore dispatch.`;
  const canonical = productPath(upperSku);

  return {
    title: `${name} | ${SITE_NAME} Factory Direct`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} | ${SITE_NAME}`,
      description,
      url: canonical,
      type: "website",
      images: [
        {
          url: absoluteUrl(image),
          alt: name,
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

export default async function SkuPage({ params }: SkuPageProps) {
  const { sku } = await params;
  const upperSku = sku.toUpperCase();

  let product: any = null;
  let visualVariants: any[] = [];
  let configuratorOptions: ConfigOption[] = FALLBACK_OPTIONS;
  let typeGroups: OptionGroupRow[] = [];

  try {
    const { data: prodData } = await supabaseServer
      .from("products")
      .select("*")
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
        main_image_url: prodData.main_image_url,
        hover_blueprint_img: prodData.hover_blueprint_img,
        warranty_text: prodData.warranty_text,
        is_knockdown_available: prodData.is_knockdown_available,
        allowed_top_categories: Array.isArray(prodData.allowed_top_categories)
          ? prodData.allowed_top_categories
          : ["FRAME_ONLY", "WOOD", "STONE"],
        top_overlay_note: prodData.top_overlay_note,
      };

      const { data: vData } = await supabaseServer
        .from("product_visual_variants")
        .select(
          "top_material_code, frame_color, preview_image_url, size_option, selection_key"
        )
        .eq("product_id", prodData.id);

      if (vData) {
        visualVariants = vData;
      }

      const { data: oData } = await supabaseServer
        .from("configurator_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (oData && oData.length > 0) {
        configuratorOptions = oData;
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

  if (isProductType(product.product_type)) {
    typeGroups = getTypeGroupRows(product.product_type);

    if (product.product_type !== "TABLE") {
      try {
        const { data: groupData } = await supabaseServer
          .from("product_type_option_groups")
          .select("*")
          .eq("product_type", product.product_type)
          .order("sort_order");

        if (groupData && groupData.length > 0) {
          typeGroups = getTypeGroupRows(product.product_type, groupData);
        }
      } catch {
        // Keep static group mapping.
      }
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
  const typeOptions = configuratorOptions.filter((option) =>
    typeGroupSet.has(option.option_group)
  );

  const canonicalUrl = productUrl(product.sku);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [absoluteUrl(product.main_image_url)],
    sku: product.sku,
    category: product.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(fromPrice != null
      ? {
          offers: {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "INR",
            price: fromPrice,
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };

  return (
    <div className="bg-[#FFFFFF] min-h-[70vh] py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          options={configuratorOptions}
          typeOptions={typeOptions}
          groups={typeGroups}
          visualVariants={visualVariants}
          fromPrice={fromPrice}
        />
      </div>
    </div>
  );
}
