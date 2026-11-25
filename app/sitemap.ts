import "server-only";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { SITE_URL, productUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/sets`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/projects`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/b2b`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  try {
    const { data } = await supabaseServer
      .from("products")
      .select("sku")
      .eq("is_active", true)
      .order("sort_order");

    const productEntries = (data ?? []).map((product) => ({
      url: productUrl(product.sku),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const { data: sets } = await supabaseServer
      .from("product_sets")
      .select("sku")
      .eq("is_active", true)
      .order("sort_order");

    const setEntries = (sets ?? []).map((set) => ({
      url: `${SITE_URL}/sets/${encodeURIComponent(set.sku)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...base, ...productEntries, ...setEntries];
  } catch {
    return base;
  }
}
