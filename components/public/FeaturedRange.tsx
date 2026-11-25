import "server-only";

import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { getCachedFromPrices } from "@/lib/pricing/fromPrice";
import { calculateSetPrice } from "@/lib/pricing/setPrice";
import { productPath } from "@/lib/site";
import { PRODUCT_CATEGORIES } from "@/lib/catalogCategories";

async function getFeaturedRange() {
  const [{ data: products }, { data: sets }, prices] = await Promise.all([
    supabaseServer.from("products").select("id, sku, name, category").eq("is_active", true).in("category", PRODUCT_CATEGORIES).order("sort_order").limit(3),
    supabaseServer.from("product_sets").select("sku, name").eq("is_active", true).order("sort_order").limit(4),
    getCachedFromPrices().catch(() => ({} as Record<string, number>)),
  ]);

  const collectionItems = (products ?? []).map((product) => ({
    href: productPath(product.sku),
    name: product.name,
    category: product.category,
    price: prices[product.id] ?? null,
  }));

  const setItems = await Promise.all(
    (sets ?? []).map(async (set) => {
      const price = await calculateSetPrice({ sku: set.sku, quantity: 1 }).catch(() => null);
      return {
        href: `/sets/${encodeURIComponent(set.sku)}`,
        name: set.name,
        category: "Configurable set",
        price: price && !price.requires_quote ? price.unit_price : null,
      };
    })
  );

  return [...collectionItems, ...setItems];
}

export default async function FeaturedRange() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  await connection();
  const items = await getFeaturedRange().catch(() => []);
  if (!items.length) return null;

  return (
    <section className="sanra-container sanra-range" aria-labelledby="range-heading">
      <h2 id="range-heading" className="sanra-label">In the factory catalog</h2>
      <ul>
        {items.map(({ href, name, category, price }) => (
          <li key={href}>
            <Link href={href}>
              <span className="sanra-range-product"><strong>{name}</strong><small>{category}</small></span>
              <span className="sanra-range-price">{price == null ? "Request pricing" : `From ₹${price.toLocaleString("en-IN")}`}</span>
              <ArrowUpRight size={19} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
