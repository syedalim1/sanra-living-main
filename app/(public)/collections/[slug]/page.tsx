import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { getCachedFromPrices } from "@/lib/pricing/fromPrice";
import { publicImageUrl } from "@/lib/media/paths";
import { getCategoryBySlug, SEO_CATEGORIES } from "@/lib/seo/categories";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structuredData";
import ProductCard, { type CatalogProduct } from "@/components/ProductCard";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { company } from "@/lib/company";

export const instant = false;

async function getMatchingProducts(slug: string): Promise<CatalogProduct[]> {
  const def = getCategoryBySlug(slug);
  if (!def) return [];

  const [prodRes, priceMap, pvRes] = await Promise.all([
    supabaseServer
      .from("products")
      .select(
        "id, sku, name, category, product_type, base_length_ft, base_width_ft, main_image_url, hover_blueprint_img, use_cases, material_tags, allowed_top_categories, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order"),
    getCachedFromPrices(),
    supabaseServer
      .from("product_variants")
      .select("product_id, frame_material")
      .eq("is_active", true)
      .eq("status", "PUBLISHED"),
  ]);

  const matsByProduct = new Map<string, Set<"SS" | "MS">>();
  for (const v of pvRes.data ?? []) {
    const pid = v.product_id as string;
    if (!matsByProduct.has(pid)) matsByProduct.set(pid, new Set());
    matsByProduct.get(pid)!.add(v.frame_material as "SS" | "MS");
  }

  return (prodRes.data ?? [])
    .filter((p) => {
      if (!def.productTypes.includes(p.product_type as string)) return false;
      const tags = Array.isArray(p.material_tags)
        ? (p.material_tags as string[]).map((t) => t.toUpperCase())
        : [];
      const mats = matsByProduct.get(p.id as string);

      if (def.requiredMaterial) {
        const hasMat =
          mats?.has(def.requiredMaterial) || tags.includes(def.requiredMaterial);
        if (!hasMat) return false;
      }

      if (def.requiredKeyword) {
        const kw = def.requiredKeyword.toLowerCase();
        const hay = `${p.name} ${p.category} ${tags.join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }

      return true;
    })
    .map((p) => ({
      id: p.id as string,
      sku: p.sku as string,
      name: p.name as string,
      category: p.category as string,
      product_type: p.product_type as string,
      base_length_ft: Number(p.base_length_ft),
      base_width_ft: Number(p.base_width_ft),
      main_image_url: publicImageUrl(p.main_image_url),
      hover_blueprint_img: publicImageUrl(p.hover_blueprint_img),
      from_price: priceMap[p.id as string] ?? null,
      use_cases: (p.use_cases as string[]) ?? [],
      material_tags: (p.material_tags as string[]) ?? [],
      available_materials: matsByProduct.has(p.id as string)
        ? [...matsByProduct.get(p.id as string)!]
        : [],
    }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const def = getCategoryBySlug(slug);
  if (!def) return { title: `Not Found | ${SITE_NAME}` };

  const products = await getMatchingProducts(slug);
  const canonical = `${SITE_URL}/collections/${def.slug}`;

  return {
    title: def.seoTitle,
    description: def.metaDescription,
    alternates: { canonical },
    // Do not index empty category pages
    robots:
      products.length > 0
        ? { index: true, follow: true }
        : { index: false, follow: true },
    openGraph: {
      type: "website",
      title: def.seoTitle,
      description: def.metaDescription,
      url: canonical,
      siteName: SITE_NAME,
    },
  };
}

export default async function CategoryCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const def = getCategoryBySlug(slug);
  if (!def) notFound();

  const products = await getMatchingProducts(slug);
  const related = def.relatedSlugs
    .map((s) => SEO_CATEGORIES.find((c) => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Collections", url: `${SITE_URL}/products` },
    { name: def.name, url: `${SITE_URL}/collections/${def.slug}` },
  ]);

  return (
    <div className="sanra-subpage min-h-[70vh] py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="sanra-container space-y-8">
        <nav className="flex items-center gap-2 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
          <Link href="/" className="hover:text-black">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-black">
            Catalog
          </Link>
          <span>/</span>
          <span className="text-neutral-900">{def.name}</span>
        </nav>

        <header className="max-w-3xl space-y-3">
          <p className="sanra-label">
            {company.brand} · {company.manufacturer}
          </p>
          <h1 className="text-2xl sm:text-4xl font-black text-[#111111] tracking-tight">
            {def.h1}
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {def.description}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/b2b#bulk"
              className="px-4 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800"
            >
              Request Bulk Quotation
            </Link>
            <Link
              href="/products"
              className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-800 hover:bg-neutral-50"
            >
              Browse Full Catalogue
            </Link>
          </div>
        </header>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-neutral-200 bg-white text-center space-y-3">
            <p className="text-sm font-bold text-[#111111]">
              Custom fabrication available for {def.name}
            </p>
            <p className="text-xs text-neutral-600">
              Contact our SIDCO Coimbatore factory desk for custom orders and bulk quotations.
            </p>
            <Link
              href="/contact"
              className="inline-block px-4 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold"
            >
              Contact Factory
            </Link>
          </div>
        )}

        {related.length > 0 && (
          <section className="pt-8 border-t border-neutral-200 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-500">
              Related Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/collections/${r.slug}`}
                  className="px-3.5 py-2 rounded-full border border-neutral-300 text-xs font-semibold text-neutral-800 hover:border-neutral-500"
                >
                  {r.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
