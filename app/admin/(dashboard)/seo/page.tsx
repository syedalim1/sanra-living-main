import "server-only";

import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminSeoPage() {
  await connection();
  await requireAdmin();
  const db = createServerClient();

  const [{ data: products }, { data: seoRows }] = await Promise.all([
    db
      .from("products")
      .select("id, sku, name, category, is_active")
      .order("sort_order"),
    db.from("product_seo").select("product_id, seo_title, meta_description, product_h1, image_alt_text"),
  ]);

  const seoMap = new Map(
    (seoRows ?? []).map((row) => [row.product_id as string, row])
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black text-[#111111] tracking-tight">
          Product SEO Manager
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Review and complete SEO titles, meta descriptions, H1s, and image alt text per product.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-5 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px]">
              <th className="py-2 pr-3">SKU</th>
              <th className="py-2 pr-3">Product</th>
              <th className="py-2 pr-3">SEO Title</th>
              <th className="py-2 pr-3">Meta Description</th>
              <th className="py-2 pr-3">Alt Text</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => {
              const seo = seoMap.get(p.id as string);
              return (
                <tr key={p.id} className="border-b border-neutral-100">
                  <td className="py-2.5 pr-3 font-mono font-bold">{p.sku}</td>
                  <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                  <td className="py-2.5 pr-3">
                    {seo?.seo_title ? (
                      <span className="text-emerald-700 font-semibold">Set</span>
                    ) : (
                      <span className="text-amber-700">Missing</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {seo?.meta_description ? (
                      <span className="text-emerald-700 font-semibold">Set</span>
                    ) : (
                      <span className="text-amber-700">Missing</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    {seo?.image_alt_text ? (
                      <span className="text-emerald-700 font-semibold">Set</span>
                    ) : (
                      <span className="text-amber-700">Missing</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-xs font-bold text-[#111111] underline hover:no-underline"
                    >
                      Edit SEO
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
