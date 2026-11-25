import "server-only";

import { adminImageUrl } from "@/lib/media/paths";

import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { calculateSetPrice } from "@/lib/pricing/setPrice";
import {
  duplicateSetAction,
  toggleSetAction,
} from "@/app/admin/(dashboard)/sets/actions";

export const metadata: Metadata = {
  title: "Sets & Combos | SANRA Internal",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminSetsPage() {
  await connection();
  await requireAdmin();
  const db = createServerClient();

  const [setResult, itemResult] = await Promise.all([
    db.from("product_sets").select("*").order("sort_order"),
    db.from("product_set_items").select("set_id, product_id"),
  ]);

  const sets = setResult.data ?? [];
  const itemCounts = new Map<string, number>();
  for (const item of itemResult.data ?? []) {
    itemCounts.set(item.set_id, (itemCounts.get(item.set_id) ?? 0) + 1);
  }

  const prices = new Map<string, number | null>();
  await Promise.all(
    sets.map(async (set) => {
      try {
        const price = await calculateSetPrice({ sku: set.sku, quantity: 1 });
        prices.set(set.id, price.requires_quote ? null : price.unit_price);
      } catch {
        prices.set(set.id, null);
      }
    })
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            Sets &amp; Combos
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Bundle existing products and sell the set as one live-priced item.
          </p>
        </div>
        <Link
          href="/admin/sets/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" /> Add New Set
        </Link>
      </div>

      {sets.length === 0 && (
        <p className="bg-white border border-neutral-200 rounded-xl p-5 text-sm text-neutral-500">
          No sets yet. Create your first combo.
        </p>
      )}

      <div className="space-y-3">
        {sets.map((set) => {
          const price = prices.get(set.id);
          return (
            <div
              key={set.id}
              className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-wrap items-center gap-4"
            >
              {set.main_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={adminImageUrl(set.main_image_url) ?? undefined}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover border border-neutral-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200" />
              )}

              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-bold">
                  {set.name}
                  {!set.is_active && (
                    <span className="ml-2 text-[9px] uppercase text-neutral-400">
                      archived
                    </span>
                  )}
                </p>
                <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                  {set.sku} · {itemCounts.get(set.id) ?? 0} item
                  {(itemCounts.get(set.id) ?? 0) === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-xs font-bold text-neutral-800 min-w-[90px]">
                {price != null ? `₹${price.toLocaleString("en-IN")}` : "—"}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/admin/sets/${set.id}`}
                  className="px-2.5 py-1.5 rounded border border-neutral-200 text-[10px] font-bold uppercase tracking-wider"
                >
                  Edit
                </Link>
                <form action={duplicateSetAction}>
                  <input type="hidden" name="set_id" value={set.id} />
                  <button className="px-2.5 py-1.5 rounded border border-neutral-200 text-[10px] font-bold uppercase tracking-wider">
                    Duplicate
                  </button>
                </form>
                <form action={toggleSetAction}>
                  <input type="hidden" name="set_id" value={set.id} />
                  <input
                    type="hidden"
                    name="next"
                    value={set.is_active ? "false" : "true"}
                  />
                  <button className="px-2.5 py-1.5 rounded border border-neutral-200 text-[10px] font-bold uppercase tracking-wider">
                    {set.is_active ? "Archive" : "Activate"}
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
