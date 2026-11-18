import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { isProductType } from "@/lib/productTypeConfig";
import SetPreview from "@/app/admin/(dashboard)/sets/SetPreview";
import {
  moveSetItemAction,
  removeSetItemAction,
  saveSetAction,
  saveSetItemAction,
  saveSetPricingAction,
  toggleSetAction,
} from "@/app/admin/(dashboard)/sets/actions";

export const metadata: Metadata = {
  title: "Set Builder | SANRA Internal",
  robots: { index: false, follow: false },
};

export const instant = false;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

interface SetRow {
  id: string;
  sku: string;
  name: string;
  short_description: string | null;
  main_image_url: string | null;
  hover_image_url: string | null;
  use_cases: string[] | null;
  sort_order: number;
  is_active: boolean;
}

interface ItemRow {
  id: string;
  set_id: string;
  product_id: string;
  quantity: number;
  default_selection: Record<string, string> | null;
  allow_customize: boolean;
  sort_order: number;
}

export default async function SetBuilderPage({ params }: PageProps) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const { id } = await params;

  const isNew = id === "new";
  if (!isNew && !UUID_RE.test(id)) notFound();

  let set: SetRow | null = null;
  let items: ItemRow[] = [];
  let pricing: { adjustment_type: string; adjustment_value: number; note: string | null } | null =
    null;

  if (!isNew) {
    const [setResult, itemResult, pricingResult] = await Promise.all([
      db.from("product_sets").select("*").eq("id", id).maybeSingle(),
      db.from("product_set_items").select("*").eq("set_id", id).order("sort_order"),
      db.from("set_pricing").select("*").eq("set_id", id).maybeSingle(),
    ]);

    if (setResult.error || !setResult.data) notFound();

    set = setResult.data as SetRow;
    items = (itemResult.data ?? []) as ItemRow[];
    pricing = pricingResult.data
      ? {
          adjustment_type: pricingResult.data.adjustment_type,
          adjustment_value: Number(pricingResult.data.adjustment_value),
          note: pricingResult.data.note,
        }
      : null;
  }

  const [productResult, groupResult, optionResult] = await Promise.all([
    db
      .from("products")
      .select("id, sku, name, product_type")
      .eq("is_active", true)
      .order("sku"),
    db.from("product_type_option_groups").select("*").order("sort_order"),
    db.from("configurator_options").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const products = productResult.data ?? [];
  const groups = (groupResult.data ?? []).filter((group) => group.is_active !== false);
  const options = optionResult.data ?? [];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const currentSetId = set?.id ?? "";

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/admin/sets"
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            {set ? set.name : "New Set"}
          </h1>
          <p className="text-[10px] font-mono text-neutral-500 mt-1">
            {set ? set.sku : "Save the set to start adding products"}
          </p>
        </div>
        {set && (
          <form action={toggleSetAction}>
            <input type="hidden" name="set_id" value={currentSetId} />
            <input type="hidden" name="next" value={set.is_active ? "false" : "true"} />
            <button className="px-3 py-2 rounded-md border border-neutral-300 text-[10px] font-bold uppercase tracking-wider">
              {set.is_active ? "Archive set" : "Activate set"}
            </button>
          </form>
        )}
      </div>

      <section className="bg-white rounded-xl border border-neutral-200 p-5">
        <h2 className="text-sm font-bold mb-4">Set details</h2>
        <form
          action={saveSetAction}
          encType="multipart/form-data"
          className="grid gap-3 sm:grid-cols-2"
        >
          {set && <input type="hidden" name="set_id" value={currentSetId} />}
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Name
            <input
              name="name"
              required
              defaultValue={set?.name ?? ""}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            SKU
            <input
              name="sku"
              required
              readOnly={Boolean(set)}
              defaultValue={set?.sku ?? ""}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-mono uppercase font-normal read-only:bg-neutral-50"
            />
          </label>
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 sm:col-span-2">
            Short description
            <textarea
              name="short_description"
              rows={2}
              defaultValue={set?.short_description ?? ""}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Use cases (comma separated)
            <input
              name="use_cases"
              defaultValue={(set?.use_cases ?? []).join(", ")}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Sort order
            <input
              name="sort_order"
              type="number"
              defaultValue={set?.sort_order ?? 100}
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Main image
            <input
              type="file"
              name="main_image"
              accept="image/jpeg,image/png,image/webp"
              className="w-full text-xs"
            />
          </label>
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Hover image
            <input
              type="file"
              name="hover_image"
              accept="image/jpeg,image/png,image/webp"
              className="w-full text-xs"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={set ? set.is_active : true}
              className="accent-black"
            />
            Active
          </label>
          <button className="justify-self-start px-4 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
            {set ? "Save set" : "Create set"}
          </button>
        </form>
      </section>

      {set && (
        <>
          <section className="bg-white rounded-xl border border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-bold">Items</h2>
              <p className="text-[11px] text-neutral-500 mt-1">
                Products in this set. Defaults use each product&apos;s configurator
                choices.
              </p>
            </div>

            <div className="divide-y divide-neutral-100">
              {items.map((item, index) => {
                const product = productMap.get(item.product_id);
                if (!product) return null;
                const typeGroups = isProductType(product.product_type)
                  ? groups.filter((group) => group.product_type === product.product_type)
                  : [];

                return (
                  <div key={item.id} className="px-5 py-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {product.name}{" "}
                          <span className="text-neutral-500">× {item.quantity}</span>
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500">
                          {product.sku} · {product.product_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <form action={moveSetItemAction}>
                          <input type="hidden" name="set_id" value={currentSetId} />
                          <input type="hidden" name="item_id" value={item.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            disabled={index === 0}
                            className="p-2 rounded border border-neutral-200 disabled:opacity-30"
                            aria-label="Move item up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        </form>
                        <form action={moveSetItemAction}>
                          <input type="hidden" name="set_id" value={currentSetId} />
                          <input type="hidden" name="item_id" value={item.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            disabled={index === items.length - 1}
                            className="p-2 rounded border border-neutral-200 disabled:opacity-30"
                            aria-label="Move item down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </form>
                        <form action={removeSetItemAction}>
                          <input type="hidden" name="set_id" value={currentSetId} />
                          <input type="hidden" name="item_id" value={item.id} />
                          <button
                            className="p-2 rounded border border-red-200 text-red-700"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </div>

                    <details>
                      <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Edit item &amp; default options
                      </summary>
                      <form action={saveSetItemAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="set_id" value={currentSetId} />
                        <input type="hidden" name="item_id" value={item.id} />
                        <input type="hidden" name="product_id" value={item.product_id} />
                        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Quantity
                          <input
                            name="quantity"
                            type="number"
                            min="1"
                            max="50"
                            defaultValue={item.quantity}
                            className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold">
                          <input
                            type="checkbox"
                            name="allow_customize"
                            defaultChecked={item.allow_customize}
                            className="accent-black"
                          />
                          Customer can change options
                        </label>

                        {typeGroups.map((group) => {
                          const groupOptions = options.filter(
                            (option) => option.option_group === group.option_group
                          );
                          if (groupOptions.length === 0) return null;
                          return (
                            <label
                              key={group.option_group}
                              className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500"
                            >
                              {group.group_title}
                              <select
                                name={`opt_${group.option_group}`}
                                defaultValue={
                                  item.default_selection?.[group.option_group] ??
                                  group.default_code ??
                                  ""
                                }
                                className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal bg-white"
                              >
                                <option value="">Product default</option>
                                {groupOptions.map((option) => (
                                  <option key={option.option_code} value={option.option_code}>
                                    {option.label_en}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        })}

                        <button className="justify-self-start px-4 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
                          Save item
                        </button>
                      </form>
                    </details>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-100">
              <details>
                <summary className="cursor-pointer text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add product
                </summary>
                <form action={saveSetItemAction} className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="set_id" value={currentSetId} />
                  <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 sm:col-span-2">
                    Product
                    <select
                      name="product_id"
                      required
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal bg-white"
                    >
                      <option value="">Choose product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.sku} · {product.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Quantity
                    <input
                      name="quantity"
                      type="number"
                      min="1"
                      max="50"
                      defaultValue={1}
                      className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      name="allow_customize"
                      defaultChecked
                      className="accent-black"
                    />
                    Customer can change options
                  </label>
                  <button className="justify-self-start px-4 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
                    Add to set
                  </button>
                </form>
              </details>
            </div>
          </section>

          <section className="bg-amber-50 rounded-xl border border-amber-200 p-5 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-amber-900">
                ADMIN ONLY · private set pricing
              </h2>
              <p className="text-[11px] text-amber-800 mt-1">
                Negative lowers the set price, positive raises it. Never shown publicly.
              </p>
            </div>

            <form action={saveSetPricingAction} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="set_id" value={currentSetId} />
              <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                Adjustment type
                <select
                  name="adjustment_type"
                  defaultValue={pricing?.adjustment_type ?? "AMOUNT"}
                  className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                >
                  <option value="AMOUNT">Amount (₹)</option>
                  <option value="PERCENT">Percent (%)</option>
                </select>
              </label>
              <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                Adjustment value
                <input
                  name="adjustment_value"
                  type="number"
                  step="0.01"
                  defaultValue={pricing?.adjustment_value ?? 0}
                  className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                />
              </label>
              <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                Note (private)
                <input
                  name="note"
                  defaultValue={pricing?.note ?? ""}
                  className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                />
              </label>
              <button className="justify-self-start px-4 py-2 rounded-md bg-amber-900 text-white text-[10px] font-bold uppercase tracking-wider">
                Save private pricing
              </button>
            </form>

            <SetPreview
              setId={currentSetId}
              savedType={pricing?.adjustment_type ?? "AMOUNT"}
              savedValue={pricing?.adjustment_value ?? 0}
            />
          </section>
        </>
      )}
    </div>
  );
}
