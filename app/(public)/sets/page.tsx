import "server-only";

import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { publicImageUrl } from "@/lib/media/paths";
import { supabaseServer } from "@/lib/supabase/server";
import { calculateSetPrice } from "@/lib/pricing/setPrice";
import WatermarkedImage from "@/components/WatermarkedImage";
import SectionHeading from "@/components/SectionHeading";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const instant = false;

export const metadata: Metadata = {
  title: `Sets & Combos | ${SITE_NAME}`,
  description: "Factory-direct furniture sets and combos with live pricing and GST invoice.",
  alternates: { canonical: `${SITE_URL}/sets` },
  openGraph: {
    title: `Sets & Combos | ${SITE_NAME}`,
    description: "Factory-direct furniture sets and combos with live pricing.",
    url: `${SITE_URL}/sets`,
    images: [{ url: `${SITE_URL}/og-default.png` }],
  },
  twitter: { card: "summary_large_image" },
};

export default async function SetsIndexPage() {
  await connection();

  const { data: sets } = await supabaseServer
    .from("product_sets")
    .select("id, sku, name, short_description, main_image_url")
    .eq("is_active", true)
    .order("sort_order");

  const prices = new Map<string, number | null>();
  await Promise.all(
    (sets ?? []).map(async (set) => {
      try {
        const result = await calculateSetPrice({ sku: set.sku, quantity: 1 });
        prices.set(set.id, result.requires_quote ? null : result.unit_price);
      } catch {
        prices.set(set.id, null);
      }
    })
  );

  return (
    <div className="sanra-subpage min-h-[60vh]">
      <div className="sanra-container py-10 lg:py-16">
        <SectionHeading as="h1" align="left" badge="Factory collections" title="Configurable sets." subtitle="Shop coordinated furniture from the factory and price available sets as you configure them." />

        {(sets ?? []).length === 0 ? (
          <div className="sanra-catalog-empty">
            <p>No configurable sets are listed right now.</p>
            <Link className="sanra-text-link" href="/products?category=SS+%26+MS+Chair+%26+Table+Sets">Browse dining sets in the catalog</Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(sets ?? []).map((set) => {
              const price = prices.get(set.id);
              return (
                <Link
                  key={set.id}
                  href={`/sets/${encodeURIComponent(set.sku)}`}
                  className="sanra-product-card"
                >
                  <WatermarkedImage
                    src={publicImageUrl(set.main_image_url)}
                    alt={set.name}
                    aspectRatio="video"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      {set.sku}
                    </p>
                    <h2 className="text-base font-bold text-[#111111] mt-1">
                      {set.name}
                    </h2>
                    {set.short_description && (
                      <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                        {set.short_description}
                      </p>
                    )}
                    <p className="text-sm font-black text-[#111111] mt-3">
                      {price != null
                        ? `From ₹${price.toLocaleString("en-IN")}`
                        : "Ask on WhatsApp"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
