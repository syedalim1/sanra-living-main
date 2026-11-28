import "server-only";

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import ProductCard, { CatalogProduct } from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import ActiveChips from "@/components/ActiveChips";
import { getCachedFromPrices } from "@/lib/pricing/fromPrice";
import { supabaseServer } from "@/lib/supabase/server";
import { whatsappHref } from "@/lib/company";
import { PRODUCT_CATEGORIES } from "@/lib/catalogCategories";
import { publicImageUrl } from "@/lib/media/paths";

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

// Catalog data and prices are read live from Supabase, so this route is
// allowed to block instead of being validated for instant navigation.
export const instant = false;

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
    q?: string;
    category?: string;
    use?: string;
    material?: string;
    top?: string;
    surface?: string;
    budget?: string;
    sort?: string;
    limit?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const {
    q,
    category,
    use,
    material,
    top,
    surface,
    budget,
    sort = "recommended",
    limit: limitParam,
  } = resolvedParams;
  const pageLimit = Math.max(12, Math.min(120, Number(limitParam) || 12));

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

      if (!error && data) {
        rawProducts = data;
      }
    } catch {
      rawProducts = [];
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

  // 2. Fetch computed from_prices and published variant summaries
  const priceMap = HAS_SUPABASE ? await getCachedFromPrices() : {};
  const variantMaterialsMap = new Map<string, Set<"SS" | "MS">>();
  const variantBuildsMap = new Map<string, Set<string>>();
  const variantSurfacesMap = new Map<string, Set<string>>();
  const bulkMoqByType = new Map<string, number>();

  if (HAS_SUPABASE && rawProducts.length > 0) {
    try {
      const [pvRes, bcRes, surfRes, bulkRes] = await Promise.all([
        supabaseServer
          .from("product_variants")
          .select("product_id, frame_material, build_category_id, surface_option_id")
          .eq("is_active", true)
          .eq("status", "PUBLISHED"),
        supabaseServer.from("build_categories").select("id, public_label"),
        supabaseServer.from("surface_options").select("id, code"),
        supabaseServer
          .from("bulk_rules")
          .select("product_type, min_qty")
          .eq("is_active", true),
      ]);

      const bcLabel = new Map(
        (bcRes.data ?? []).map((b) => [b.id as string, b.public_label as string])
      );
      const surfCode = new Map(
        (surfRes.data ?? []).map((s) => [s.id as string, s.code as string])
      );

      for (const b of bulkRes.data ?? []) {
        bulkMoqByType.set(b.product_type as string, Number(b.min_qty));
      }

      for (const v of pvRes.data ?? []) {
        const pid = v.product_id as string;
        if (!variantMaterialsMap.has(pid)) variantMaterialsMap.set(pid, new Set());
        variantMaterialsMap.get(pid)!.add(v.frame_material as "SS" | "MS");

        const build = bcLabel.get(v.build_category_id as string);
        if (build) {
          if (!variantBuildsMap.has(pid)) variantBuildsMap.set(pid, new Set());
          variantBuildsMap.get(pid)!.add(build);
        }

        if (v.surface_option_id) {
          const sc = surfCode.get(v.surface_option_id as string);
          if (sc) {
            if (!variantSurfacesMap.has(pid)) variantSurfacesMap.set(pid, new Set());
            variantSurfacesMap.get(pid)!.add(sc);
          }
        }
      }
    } catch {
      // Non-fatal
    }
  }

  let catalog: CatalogProduct[] = rawProducts.map((p) => {
    const fallbackPrice = typeof p.from_price === "number" ? p.from_price : null;
    const mats = variantMaterialsMap.get(p.id);
    const builds = variantBuildsMap.get(p.id);
    const surfs = variantSurfacesMap.get(p.id);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      product_type: p.product_type,
      base_length_ft: Number(p.base_length_ft),
      base_width_ft: Number(p.base_width_ft),
      main_image_url: publicImageUrl(p.main_image_url),
      hover_blueprint_img: publicImageUrl(p.hover_blueprint_img),
      from_price: HAS_SUPABASE ? priceMap[p.id] ?? null : fallbackPrice,
      use_cases: p.use_cases || [],
      material_tags: p.material_tags || [],
      available_materials: mats ? [...mats] : [],
      available_builds: builds ? [...builds] : [],
      surface_codes: surfs ? [...surfs] : [],
      moq_qty: bulkMoqByType.get(p.product_type) ?? null,
    };
  });

  // 3. Apply Filters on Server
  if (q && q.trim()) {
    const queryLower = q.trim().toLowerCase();
    catalog = catalog.filter(
      (p) =>
        p.name.toLowerCase().includes(queryLower) ||
        p.sku.toLowerCase().includes(queryLower)
    );
  }

  if (surface) {
    const surfUpper = surface.toUpperCase();
    catalog = catalog.filter((p) => p.surface_codes?.includes(surfUpper));
  }
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
    <div className="sanra-subpage min-h-[70vh] py-10 md:py-14">
      <div className="sanra-container">
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
          title="Steel furniture catalog."
          subtitle="Explore factory-direct seating, tables and dining sets. See live prices and configure available finishes."
          align="left"
          as="h1"
        />

        <nav className="sanra-catalog-tabs" aria-label="Browse collections">
          <Link href="/products" aria-current={!category ? "page" : undefined}>All products</Link>
          {PRODUCT_CATEGORIES.map((collection, index) => (
            <Link key={collection} href={`/products?${new URLSearchParams({ category: collection })}`} aria-current={category === collection ? "page" : undefined}>
              {["Chairs", "Tables", "Dining sets"][index]}
            </Link>
          ))}
          <Link href="/sets">Configurable sets</Link>
        </nav>

        {/* Main Content Layout (Sidebar + Grid) */}
        <div className="flex flex-col lg:flex-row gap-8 mt-6">
          {/* Desktop Left Sidebar & Mobile Drawer Trigger */}
          <ProductFilters />

          {/* Product Grid Area */}
          <div className="flex-1 min-w-0">
            {/* Active Chips & Total Count */}
            <ActiveChips totalCount={catalog.length} />

            <h2 className="sr-only">Product results</h2>

            {/* Product Cards Grid or Empty State */}
            {catalog.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  {catalog.slice(0, pageLimit).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {catalog.length > pageLimit && (
                  <div className="mt-8 flex justify-center">
                    <Link
                      href={`/products?${new URLSearchParams({
                        ...(q ? { q } : {}),
                        ...(category ? { category } : {}),
                        ...(use ? { use } : {}),
                        ...(material ? { material } : {}),
                        ...(top ? { top } : {}),
                        ...(surface ? { surface } : {}),
                        ...(budget ? { budget } : {}),
                        ...(sort !== "recommended" ? { sort } : {}),
                        limit: String(pageLimit + 12),
                      }).toString()}`}
                      className="px-5 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-neutral-800 hover:bg-neutral-50"
                    >
                      Load more ({catalog.length - pageLimit} remaining)
                    </Link>
                  </div>
                )}
              </>
            ) : (
              /* Empty State */
              <div className="sanra-catalog-empty">
                <Search size={24} aria-hidden="true" />
                <h3 className="text-lg font-bold text-[#111111] mb-2">
                  No products match these filters
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto mb-6 leading-relaxed">
                  Tell us what you need and the factory desk can discuss options for your space.
                </p>
                <a
                  href={whatsappHref(
                    "Hello SANRA LIVING, I am looking for a custom size or specific product not listed."
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sanra-button sanra-button--ink"
                >
                  Ask the factory on WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
