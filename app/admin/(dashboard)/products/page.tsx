import "server-only";

import Link from "next/link";
import { connection } from "next/server";
import { Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { getCachedFromPrices } from "@/lib/pricing/fromPrice";
import ProductsTable from "@/app/admin/(dashboard)/products/ProductsTable";
import type { AdminProduct } from "@/lib/admin/product-types";

export const metadata = {
  title: "Products | SANRA Internal",
};

interface ProductsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const instant = false;

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const { q } = await searchParams;

  const [productResult, priceMap] = await Promise.all([
    db.from("products").select("*").order("sort_order").order("sku"),
    getCachedFromPrices(),
  ]);

  if (productResult.error) {
    throw new Error("Unable to load products.");
  }

  const query = (q ?? "").trim().toLowerCase();

  const products: AdminProduct[] = (productResult.data ?? [])
    .map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      product_type: row.product_type,
      base_length_ft: Number(row.base_length_ft),
      base_width_ft: Number(row.base_width_ft),
      allowed_top_categories: Array.isArray(row.allowed_top_categories)
        ? (row.allowed_top_categories as string[])
        : [],
      is_knockdown_available: Boolean(row.is_knockdown_available),
      warranty_text: row.warranty_text,
      main_image_url: row.main_image_url,
      hover_blueprint_img: row.hover_blueprint_img,
      is_active: Boolean(row.is_active),
      use_cases: Array.isArray(row.use_cases) ? (row.use_cases as string[]) : [],
      material_tags: Array.isArray(row.material_tags) ? (row.material_tags as string[]) : [],
      sort_order: Number(row.sort_order ?? 100),
      from_price: priceMap[row.id] ?? null,
    }))
    .filter((product) => {
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded">
            Tab 2
          </span>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight mt-3">
            Product, Swatch &amp; Photo Manager
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            Manage catalog entries, private costing, swatches, galleries and visual variants.
            Archived products disappear from the public catalog.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] hover:bg-black text-white text-[11px] font-bold uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </Link>
      </div>

      <form method="get" className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search SKU, name or category"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-100"
        >
          Search
        </button>
      </form>

      <ProductsTable products={products} />
    </div>
  );
}
