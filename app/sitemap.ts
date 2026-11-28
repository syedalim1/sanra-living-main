import "server-only";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { SITE_URL, absoluteUrl, productUrl } from "@/lib/site";
import { publicImageUrl } from "@/lib/media/paths";
import { SEO_CATEGORIES } from "@/lib/seo/categories";
import { INDUSTRY_PAGES } from "@/lib/seo/industries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/sets`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/projects`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/b2b`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const industryEntries: MetadataRoute.Sitemap = INDUSTRY_PAGES.filter(
    (ind) => ind.published
  ).map((ind) => ({
    url: `${SITE_URL}/industries/${ind.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  try {
    const [{ data: products }, { data: sets }, { data: pvRows }] = await Promise.all([
      supabaseServer
        .from("products")
        .select("id, sku, product_type, name, category, material_tags, main_image_url, created_at")
        .eq("is_active", true)
        .order("sort_order"),
      supabaseServer
        .from("product_sets")
        .select("sku, created_at")
        .eq("is_active", true)
        .order("sort_order"),
      supabaseServer
        .from("product_variants")
        .select("product_id, frame_material")
        .eq("is_active", true)
        .eq("status", "PUBLISHED"),
    ]);

    const matsByProd = new Map<string, Set<string>>();
    for (const v of pvRows ?? []) {
      const pid = v.product_id as string;
      if (!matsByProd.has(pid)) matsByProd.set(pid, new Set());
      matsByProd.get(pid)!.add(v.frame_material as string);
    }

    // Only include non-empty category pages in the sitemap
    const nonEmptyCategories: MetadataRoute.Sitemap = SEO_CATEGORIES.filter((cat) =>
      (products ?? []).some((p) => {
        if (!cat.productTypes.includes(p.product_type as string)) return false;
        const tags = Array.isArray(p.material_tags)
          ? (p.material_tags as string[]).map((t) => t.toUpperCase())
          : [];
        const mats = matsByProd.get(p.id as string);
        if (cat.requiredMaterial) {
          if (!mats?.has(cat.requiredMaterial) && !tags.includes(cat.requiredMaterial)) {
            return false;
          }
        }
        if (cat.requiredKeyword) {
          const hay = `${p.name} ${p.category} ${tags.join(" ")}`.toLowerCase();
          if (!hay.includes(cat.requiredKeyword.toLowerCase())) return false;
        }
        return true;
      })
    ).map((cat) => ({
      url: `${SITE_URL}/collections/${cat.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    }));

    const productEntries: MetadataRoute.Sitemap = (products ?? []).map((product) => {
      const img = publicImageUrl(product.main_image_url);
      return {
        url: productUrl(product.sku),
        lastModified: product.created_at ? new Date(product.created_at) : now,
        changeFrequency: "weekly",
        priority: 0.8,
        ...(img ? { images: [absoluteUrl(img)] } : {}),
      };
    });

    const setEntries: MetadataRoute.Sitemap = (sets ?? []).map((set) => ({
      url: `${SITE_URL}/sets/${encodeURIComponent(set.sku)}`,
      lastModified: set.created_at ? new Date(set.created_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [
      ...base,
      ...nonEmptyCategories,
      ...industryEntries,
      ...productEntries,
      ...setEntries,
    ];
  } catch {
    return [...base, ...industryEntries];
  }
}
