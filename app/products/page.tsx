import "server-only";

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import ProductCard, { CatalogProduct } from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import ActiveChips from "@/components/ActiveChips";
import { getCachedFromPrices } from "@/lib/pricing/fromPrice";
import { supabaseServer } from "@/lib/supabase/server";
import { whatsappHref } from "@/lib/company";
import { PRODUCT_CATEGORIES } from "@/lib/catalogCategories";

const HAS_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CORE_CATEGORIES = new Set(
  PRODUCT_CATEGORIES.map((category) => category.trim().toLowerCase())
);

// Product types that can have a table-top material (GRANITE / WOOD).
// BENCH_DESK was removed — it has no active category in the core 3.
const TOP_CATEGORY_PRODUCT_TYPES = new Set(["TABLE", "CHAIR_TABLE_SET"]);

export const metadata: Metadata = {
  title: "Steel Furniture Catalog | SANRA LIVING",
  description:
    "Direct SIDCO Coimbatore factory catalog of MS and stainless steel chairs, tables, and chair & table sets with live prices.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Steel Furniture Catalog | SANRA LIVING",
    description:
      "Browse factory-direct MS and SS chairs, tables, and chair & table sets with live prices.",
    url: "/products",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "SANRA LIVING steel furniture catalog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Steel Furniture Catalog | SANRA LIVING",
    description:
      "Factory-direct steel furniture with live prices and GST invoicing.",
    images: ["/og-default.png"],
  },
};

// Fallback products if DB has not been seeded yet
const FALLBACK_PRODUCTS: CatalogProduct[] = [
  {
    id: "fb-1",
    sku: "IMS-CF-42",
    name: "Commercial Heavy-Gauge Cafe Table (4x2 ft)",
    category: "SS & MS Tables",
    product_type: "TABLE",
    base_length_ft: 4.0,
    base_width_ft: 2.0,
    main_image_url: "/images/cat-dining-tables.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    from_price: 3199,
    use_cases: ["CAFE", "HOME"],
    material_tags: ["MS", "WOOD", "GRANITE"],
  },
  {
    id: "fb-2",
    sku: "IMS-WS-425",
    name: "Zero-Shake Modular Office Workstation (4x2.5 ft)",
    category: "SS & MS Tables",
    product_type: "TABLE",
    base_length_ft: 4.0,
    base_width_ft: 2.5,
    main_image_url: "/images/cat-workstations.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    from_price: 3799,
    use_cases: ["OFFICE", "HOME"],
    material_tags: ["MS", "WOOD"],
  },
  {
    id: "fb-3",
    sku: "IMS-DN-63",
    name: "Industrial Grade 6-Seater Dining Table (6x3 ft)",
    category: "SS & MS Tables",
    product_type: "TABLE",
    base_length_ft: 6.0,
    base_width_ft: 3.0,
    main_image_url: "/images/hero-workstation.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    from_price: 5499,
    use_cases: ["HOME", "CAFE"],
    material_tags: ["MS", "WOOD", "GRANITE"],
  },
];

interface CatalogRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  product_type: string;
  base_length_ft: number | string;
  base_width_ft: number | string;
  main_image_url: string | null;
  hover_blueprint_img?: string | null;
  from_price?: number | null;
  use_cases?: string[] | null;
  material_tags?: string[] | null;
}

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    use?: string;
    material?: string;
    top?: string;
    budget?: string;
    sort?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const { category, use, material, top, budget, sort = "recommended" } = resolvedParams;

  // 1. Fetch products from Supabase
  let rawProducts: CatalogRow[] = [];

  if (HAS_SUPABASE) {
    try {
      const { data, error } = await supabaseServer
        .from("products")
        .select(
          "id, sku, name, category, product_type, base_length_ft, base_width_ft, main_image_url, hover_blueprint_img, use_cases, material_tags, sort_order"
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        rawProducts = data;
      } else {
        rawProducts = FALLBACK_PRODUCTS;
      }
    } catch {
      rawProducts = FALLBACK_PRODUCTS;
    }
  } else {
    rawProducts = FALLBACK_PRODUCTS;
  }

  // Only the three core categories are publicly listed. Legacy categories stay
  // in the database but remain hidden until they are re-enabled.
  rawProducts = rawProducts.filter(
    (product) =>
      typeof product.category === "string" &&
      CORE_CATEGORIES.has(product.category.trim().toLowerCase())
  );

  // 2. Fetch computed from_prices
  const priceMap = HAS_SUPABASE ? await getCachedFromPrices() : {};

  // Attach from_price. Fallback rows carry their own display price so the
  // catalog still shows prices when Supabase is not configured or unreachable.
  let catalog: CatalogProduct[] = rawProducts.map((p) => {
    const fallbackPrice = typeof p.from_price === "number" ? p.from_price : null;
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      product_type: p.product_type,
      base_length_ft: Number(p.base_length_ft),
      base_width_ft: Number(p.base_width_ft),
      main_image_url: p.main_image_url,
      hover_blueprint_img: p.hover_blueprint_img,
      from_price: HAS_SUPABASE ? priceMap[p.id] ?? fallbackPrice : fallbackPrice,
      use_cases: p.use_cases || [],
      material_tags: p.material_tags || [],
    };
  });

  // 3. Apply Filters on Server
  if (category) {
    catalog = catalog.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (use) {
    catalog = catalog.filter((p) => p.use_cases?.includes(use.toUpperCase()));
  }

  if (material) {
    catalog = catalog.filter((p) => p.material_tags?.includes(material.toUpperCase()));
  }

  const topUpper = top?.toUpperCase();
  if (topUpper === "GRANITE" || topUpper === "STONE" || topUpper === "WOOD") {
    catalog = catalog.filter((p) => {
      if (!TOP_CATEGORY_PRODUCT_TYPES.has(p.product_type)) return false;
      const tags = p.material_tags || [];
      if (topUpper === "WOOD") {
        return tags.includes("WOOD") || tags.includes("PLYWOOD");
      }
      return tags.includes("GRANITE") || tags.includes("STONE");
    });
  }

  // Budget Filter
  if (budget) {
    catalog = catalog.filter((p) => {
      if (p.from_price === null) return false;
      const price = p.from_price;
      switch (budget) {
        case "under-2000":
          return price < 2000;
        case "2000-4000":
          return price >= 2000 && price <= 4000;
        case "4000-8000":
          return price > 4000 && price <= 8000;
        case "above-8000":
          return price > 8000;
        default:
          return true;
      }
    });
  }

  // 4. Sort on Server
  if (sort === "price-asc") {
    catalog.sort((a, b) => {
      if (a.from_price === null) return 1;
      if (b.from_price === null) return -1;
      return a.from_price - b.from_price;
    });
  } else if (sort === "price-desc") {
    catalog.sort((a, b) => {
      if (a.from_price === null) return 1;
      if (b.from_price === null) return -1;
      return b.from_price - a.from_price;
    });
  }

  return (
    <div className="bg-[#FFFFFF] min-h-[70vh] py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Factory Overview
          </Link>
        </div>

        {/* Section Heading */}
        <SectionHeading
          badge="SIDCO Coimbatore Direct"
          title="Steel Furniture Catalog & Live Prices"
          subtitle="Explore all structural furniture manufactured at our SIDCO Kurichi unit. Transparent factory pricing with full GST invoices and direct dispatch."
          align="left"
          as="h1"
        />

        {/* Main Content Layout (Sidebar + Grid) */}
        <div className="flex flex-col lg:flex-row gap-8 mt-6">
          {/* Desktop Left Sidebar & Mobile Drawer Trigger */}
          <ProductFilters />

          {/* Product Grid Area */}
          <div className="flex-1">
            {/* Active Chips & Total Count */}
            <ActiveChips totalCount={catalog.length} />

            <h2 className="sr-only">Product results</h2>

            {/* Product Cards Grid or Empty State */}
            {catalog.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-7">
                {catalog.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="p-10 md:p-14 text-center rounded-xl bg-[#F5F5F7] border border-neutral-200">
                <div className="w-12 h-12 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center mx-auto mb-4 text-xl">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-[#111111] mb-2">
                  No matching frames found
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto mb-6 leading-relaxed">
                  We might not have an active catalog item matching these exact filters, but we manufacture custom steel dimensions every day on our SIDCO line.
                </p>
                <a
                  href={whatsappHref(
                    "Hello SANRA LIVING, I am looking for a custom size or specific product not listed."
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  Can&apos;t find it? Tell us what you need on WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
