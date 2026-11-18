import "server-only";

import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { calculateSetPrice } from "@/lib/pricing/setPrice";
import WatermarkedImage from "@/components/WatermarkedImage";
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
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <h1 className="text-3xl font-black text-[#111111] tracking-tight">
          Sets &amp; Combos
        </h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">
          Ready-made sets from our factory. Each set is priced live with the same
          configurator engine as single products.
        </p>

        {(sets ?? []).length === 0 ? (
          <p className="mt-8 text-sm text-neutral-500">No sets available yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(sets ?? []).map((set) => {
              const price = prices.get(set.id);
              return (
                <Link
                  key={set.id}
                  href={`/sets/${encodeURIComponent(set.sku)}`}
                  className="group bg-white rounded-xl border border-neutral-200 overflow-hidden hover:border-neutral-400 transition-colors"
                >
                  <WatermarkedImage
                    src={set.main_image_url}
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
