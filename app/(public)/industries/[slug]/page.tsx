import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { getCachedFromPrices } from "@/lib/pricing/fromPrice";
import { publicImageUrl } from "@/lib/media/paths";
import { getIndustryBySlug } from "@/lib/seo/industries";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structuredData";
import ProductCard, { type CatalogProduct } from "@/components/ProductCard";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { company } from "@/lib/company";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ind = getIndustryBySlug(slug);
  if (!ind) return { title: `Not Found | ${SITE_NAME}` };

  const canonical = `${SITE_URL}/industries/${ind.slug}`;
  return {
    title: ind.seoTitle,
    description: ind.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: ind.seoTitle,
      description: ind.metaDescription,
      url: canonical,
      siteName: SITE_NAME,
    },
  };
}

export default async function IndustryLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ind = getIndustryBySlug(slug);
  if (!ind) notFound();

  const [prodRes, priceMap, projRes] = await Promise.all([
    supabaseServer
      .from("products")
      .select(
        "id, sku, name, category, product_type, base_length_ft, base_width_ft, main_image_url, hover_blueprint_img, use_cases, material_tags, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order"),
    getCachedFromPrices(),
    supabaseServer
      .from("supply_projects")
      .select("id, title, product_type, quantity, location")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const products: CatalogProduct[] = (prodRes.data ?? [])
    .filter((p) => {
      const uses = Array.isArray(p.use_cases) ? (p.use_cases as string[]) : [];
      return uses.includes(ind.useCaseCode);
    })
    .slice(0, 6)
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
    }));

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Industries", url: `${SITE_URL}/b2b` },
    { name: ind.name, url: `${SITE_URL}/industries/${ind.slug}` },
  ]);

  return (
    <div className="sanra-subpage min-h-[70vh] py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="sanra-container space-y-10">
        <nav className="flex items-center gap-2 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
          <Link href="/" className="hover:text-black">
            Home
          </Link>
          <span>/</span>
          <Link href="/b2b" className="hover:text-black">
            Trade &amp; Industries
          </Link>
          <span>/</span>
          <span className="text-neutral-900">{ind.name}</span>
        </nav>

        <header className="max-w-3xl space-y-3">
          <p className="sanra-label">
            {company.brand} · {company.manufacturer}
          </p>
          <h1 className="text-2xl sm:text-4xl font-black text-[#111111] tracking-tight">
            {ind.h1}
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">{ind.intro}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-5 rounded-xl border border-neutral-200 bg-white space-y-2">
            <h2 className="text-sm font-bold text-[#111111]">
              Material &amp; Build Selection
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {ind.materialGuidance}
            </p>
          </div>
          <div className="p-5 rounded-xl border border-neutral-200 bg-white space-y-2">
            <h2 className="text-sm font-bold text-[#111111]">
              Customization &amp; Bulk Ordering
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {ind.customizationGuidance}
            </p>
          </div>
        </div>

        {products.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-extrabold text-[#111111]">
              Applicable Models for {ind.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {(projRes.data ?? []).length > 0 && (
          <section className="space-y-3 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111111]">
                Published Factory Projects
              </h2>
              <Link href="/projects" className="text-xs font-bold underline">
                View all projects
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(projRes.data ?? []).map((pr) => (
                <div
                  key={pr.id}
                  className="p-4 rounded-xl border border-neutral-200 bg-white text-xs space-y-1"
                >
                  <p className="font-bold text-[#111111]">{pr.title}</p>
                  <p className="text-neutral-600">
                    {pr.product_type}
                    {pr.location ? ` · ${pr.location}` : ""}
                    {pr.quantity ? ` · Qty ${pr.quantity}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="p-6 rounded-xl bg-neutral-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold">
              Request a {ind.name} Furniture Quotation
            </h2>
            <p className="text-xs text-neutral-300 mt-1">
              Share your seating count or floor plan with our SIDCO Coimbatore factory desk.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/b2b#bulk"
              className="px-4 py-2.5 rounded-lg bg-white text-black text-xs font-bold"
            >
              Build Bulk Quote
            </Link>
            <Link
              href="/contact"
              className="px-4 py-2.5 rounded-lg border border-neutral-600 text-xs font-bold text-white"
            >
              Factory Contact
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
