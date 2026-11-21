import "server-only";

import { connection } from "next/server";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Copy, Plus, Power } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import OptionPreview from "@/app/admin/(dashboard)/options/OptionPreview";
import {
  duplicateGroupAction,
  duplicateOptionAction,
  moveGroupAction,
  saveGroupAction,
  saveOptionAction,
  toggleGroupAction,
  toggleOptionAction,
} from "@/app/admin/(dashboard)/options/actions";

export const metadata: Metadata = {
  title: "Options Manager | SANRA Internal",
  robots: { index: false, follow: false },
};

export const instant = false;

interface PageProps {
  searchParams: Promise<{ type?: string; inactive?: string }>;
}

type OptionsTabType = "TABLE" | "CHAIR" | "CHAIR_TABLE_SET";

const OPTION_TABS: Array<{ type: OptionsTabType; label: string }> = [
  { type: "TABLE", label: "TABLE" },
  { type: "CHAIR", label: "CHAIR" },
  { type: "CHAIR_TABLE_SET", label: "SET" },
];
const OPTION_TAB_TYPES = new Set<string>(OPTION_TABS.map((tab) => tab.type));

const HIDDEN_GROUP_CODES = new Set(["ADDON", "GAUGE"]);
const HIDDEN_OPTION_CODES = new Set(["FRAME_ONLY", "METAL", "GOLD", "RAW", "WHITE"]);

function isHiddenOption(option: OptionRow): boolean {
  return (
    HIDDEN_OPTION_CODES.has(option.option_code) ||
    option.option_code.startsWith("SHEET_")
  );
}

interface GroupRow {
  product_type: string;
  option_group: string;
  group_title: string;
  sort_order: number;
  is_required: boolean;
  default_code: string | null;
  display_style: string | null;
  allow_multiple: boolean | null;
  is_active: boolean | null;
}

interface OptionRow {
  option_code: string;
  option_group: string;
  label_en: string;
  swatch_color_hex: string | null;
  swatch_texture_img: string | null;
  spec_note: string | null;
  badge_text: string | null;
  load_kg: number | null;
  warranty_text: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface PricingRow {
  option_code: string;
  material_code: string | null;
  applies_to: string | null;
  metal_cost_multiplier: number;
  flat_addon: number;
  per_sqft_addon: number;
}

function pricingValue(row: PricingRow | undefined): number {
  if (!row) return 0;
  if (row.applies_to === "METAL_WEIGHT") return Number(row.metal_cost_multiplier);
  if (row.applies_to === "TOP_AREA") return Number(row.per_sqft_addon);
  return Number(row.flat_addon);
}

export default async function OptionsPage({ searchParams }: PageProps) {
  await connection();
  await requireAdmin();
  const db = createServerClient();
  const params = await searchParams;
  const activeType: OptionsTabType =
    params.type && OPTION_TAB_TYPES.has(params.type)
      ? (params.type as OptionsTabType)
      : "TABLE";
  const showInactive = params.inactive === "1";

  const [
    groupResult,
    optionResult,
    pricingResult,
    materialResult,
    productResult,
    variantResult,
  ] = await Promise.all([
    db
      .from("product_type_option_groups")
      .select("*")
      .eq("product_type", activeType)
      .order("sort_order"),
    db
      .from("configurator_options")
      .select(
        "option_code, option_group, label_en, swatch_color_hex, swatch_texture_img, spec_note, badge_text, load_kg, warranty_text, is_active, sort_order"
      )
      .order("sort_order"),
    db
      .from("option_pricing")
      .select(
        "option_code, material_code, applies_to, metal_cost_multiplier, flat_addon, per_sqft_addon"
      ),
    db
      .from("material_rates")
      .select("material_code, display_name, category")
      .order("category")
      .order("display_name"),
    db
      .from("products")
      .select("id, sku, name, product_type")
      .eq("is_active", true)
      .order("sku"),
    db
      .from("product_visual_variants")
      .select("top_material_code, frame_color, size_option"),
  ]);

  const groups = ((groupResult.data ?? []) as GroupRow[]).filter(
    (group) => !HIDDEN_GROUP_CODES.has(group.option_group)
  );
  const groupCodes = new Set(groups.map((group) => group.option_group));
  const options = ((optionResult.data ?? []) as OptionRow[])
    .filter((option) => groupCodes.has(option.option_group))
    .filter((option) => !isHiddenOption(option))
    .filter((option) => showInactive || option.is_active !== false);
  const pricing = new Map(
    ((pricingResult.data ?? []) as PricingRow[]).map((row) => [row.option_code, row])
  );
  const materials = materialResult.data ?? [];
  const products = (productResult.data ?? []).filter(
    (product) => product.product_type !== "TABLE"
  );
  const variantCounts = new Map<string, number>();
  for (const variant of variantResult.data ?? []) {
    for (const code of [variant.top_material_code, variant.frame_color, variant.size_option]) {
      if (!code) continue;
      variantCounts.set(code, (variantCounts.get(code) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            Options Manager
          </h1>
          <p className="text-xs text-neutral-500 mt-2 max-w-2xl">
            Add option groups and options without code. Prices, availability and the
            configurator update from the database. Private pricing is admin-only.
          </p>
        </div>
        <Link
          href="/admin/rates"
          className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 underline underline-offset-2"
        >
          Open Rate Master
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {OPTION_TABS.map((tab) => (
            <Link
              key={tab.type}
              href={`/admin/options?type=${tab.type}`}
              className={`px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                tab.type === activeType
                  ? "bg-[#111111] text-white border-[#111111]"
                  : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <Link
          href={`/admin/options?type=${activeType}${showInactive ? "" : "&inactive=1"}`}
          className="px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
        >
          {showInactive ? "Hide inactive" : "Show inactive"}
        </Link>
      </div>

      <details className="bg-white rounded-xl border border-neutral-200">
        <summary className="cursor-pointer px-5 py-4 text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Group
        </summary>
        <form action={saveGroupAction} className="px-5 pb-5 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="product_type" value={activeType} />
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Title
            <input
              name="group_title"
              required
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Display style
            <select
              name="display_style"
              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
            >
              <option value="SWATCH">Swatch</option>
              <option value="CARD">Card</option>
              <option value="PILL">Pill</option>
              <option value="CHECKBOX">Checkbox</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" name="is_required" className="accent-black" />
            Required
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" name="allow_multiple" className="accent-black" />
            Allow multiple
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" name="is_active" defaultChecked className="accent-black" />
            Active
          </label>
          <div className="sm:col-span-2">
            <button className="px-4 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
              Create group
            </button>
          </div>
        </form>
      </details>

      {groups.length === 0 && (
        <p className="text-sm text-neutral-500 bg-white border border-neutral-200 rounded-xl p-5">
          No option groups for this product type yet.
        </p>
      )}

      <div className="space-y-4">
        {groups.map((group, index) => {
          const groupOptions = options
            .filter((option) => option.option_group === group.option_group)
            .sort((a, b) => Number(a.sort_order ?? 100) - Number(b.sort_order ?? 100));

          return (
            <section
              key={group.option_group}
              className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
            >
              <header className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100">
                <div>
                  <h2 className="text-sm font-bold">{group.group_title}</h2>
                  <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                    {group.option_group} · {group.display_style ?? "SWATCH"} ·{" "}
                    {group.is_active === false ? "Inactive" : "Active"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <form action={moveGroupAction}>
                    <input type="hidden" name="product_type" value={activeType} />
                    <input type="hidden" name="option_group" value={group.option_group} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      disabled={index === 0}
                      className="p-2 rounded border border-neutral-200 disabled:opacity-30"
                      aria-label="Move group up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  <form action={moveGroupAction}>
                    <input type="hidden" name="product_type" value={activeType} />
                    <input type="hidden" name="option_group" value={group.option_group} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      disabled={index === groups.length - 1}
                      className="p-2 rounded border border-neutral-200 disabled:opacity-30"
                      aria-label="Move group down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  <form action={toggleGroupAction}>
                    <input type="hidden" name="product_type" value={activeType} />
                    <input type="hidden" name="option_group" value={group.option_group} />
                    <input
                      type="hidden"
                      name="next"
                      value={group.is_active === false ? "true" : "false"}
                    />
                    <button className="p-2 rounded border border-neutral-200" aria-label="Toggle group">
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  <form action={duplicateGroupAction}>
                    <input type="hidden" name="product_type" value={activeType} />
                    <input type="hidden" name="option_group" value={group.option_group} />
                    <button className="p-2 rounded border border-neutral-200" aria-label="Duplicate group">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </header>

              <div className="px-5 py-3 border-b border-neutral-100">
                <details>
                  <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Edit group
                  </summary>
                  <form action={saveGroupAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="product_type" value={activeType} />
                    <input type="hidden" name="original_group" value={group.option_group} />
                    <input
                      name="group_title"
                      defaultValue={group.group_title}
                      required
                      className="px-3 py-2 rounded-md border border-neutral-300 text-sm"
                    />
                    <select
                      name="display_style"
                      defaultValue={group.display_style ?? "SWATCH"}
                      className="px-3 py-2 rounded-md border border-neutral-300 text-sm"
                    >
                      <option value="SWATCH">Swatch</option>
                      <option value="CARD">Card</option>
                      <option value="PILL">Pill</option>
                      <option value="CHECKBOX">Checkbox</option>
                    </select>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        name="is_required"
                        defaultChecked={group.is_required}
                        className="accent-black"
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        name="allow_multiple"
                        defaultChecked={group.allow_multiple ?? false}
                        className="accent-black"
                      />
                      Allow multiple
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={group.is_active !== false}
                        className="accent-black"
                      />
                      Active
                    </label>
                    <button className="justify-self-start px-4 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
                      Save group
                    </button>
                  </form>
                </details>
              </div>

              <div className="divide-y divide-neutral-100">
                {groupOptions.map((option) => {
                  const price = pricing.get(option.option_code);
                  const usage = variantCounts.get(option.option_code) ?? 0;

                  return (
                    <div key={option.option_code} className="px-5 py-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {option.swatch_texture_img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={option.swatch_texture_img}
                              alt=""
                              className="w-8 h-8 rounded object-cover border border-neutral-200"
                            />
                          ) : (
                            <span
                              className="w-8 h-8 rounded border border-neutral-200"
                              style={{
                                backgroundColor: option.swatch_color_hex ?? "#F5F5F7",
                              }}
                            />
                          )}
                          <div>
                            <p className="text-sm font-semibold">
                              {option.label_en}
                              {option.is_active === false && (
                                <span className="ml-2 text-[9px] uppercase text-neutral-400">
                                  inactive
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-500">
                              {option.option_code}
                              {option.badge_text ? ` · ${option.badge_text}` : ""}
                              {option.load_kg != null ? ` · ${option.load_kg} kg` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <form action={toggleOptionAction}>
                            <input type="hidden" name="option_code" value={option.option_code} />
                            <input
                              type="hidden"
                              name="next"
                              value={option.is_active === false ? "true" : "false"}
                            />
                            <button className="p-2 rounded border border-neutral-200" aria-label="Toggle option">
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </form>
                          <form action={duplicateOptionAction}>
                            <input type="hidden" name="option_code" value={option.option_code} />
                            <button className="px-2 py-2 rounded border border-neutral-200 text-[10px] font-bold">
                              Duplicate
                            </button>
                          </form>
                        </div>
                      </div>

                      {option.spec_note && (
                        <p className="text-[11px] text-neutral-500">{option.spec_note}</p>
                      )}
                      {usage > 0 && (
                        <p className="text-[10px] font-semibold text-amber-700">
                          Used by {usage} saved variant{usage === 1 ? "" : "s"}.
                        </p>
                      )}
                      <p className="text-[10px] text-neutral-500">
                        Disabling is a soft delete: existing orders and variants keep their
                        data, but new selections are hidden.
                      </p>

                      <details>
                        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Edit option
                        </summary>
                        <form
                          action={saveOptionAction}
                          className="mt-3 grid gap-3 sm:grid-cols-2"
                        >
                          <input type="hidden" name="option_group" value={group.option_group} />
                          <input type="hidden" name="original_code" value={option.option_code} />

                          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Label
                            <input
                              name="label_en"
                              defaultValue={option.label_en}
                              required
                              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Badge text
                            <input
                              name="badge_text"
                              defaultValue={option.badge_text ?? ""}
                              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Short note
                            <input
                              name="spec_note"
                              defaultValue={option.spec_note ?? ""}
                              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Warranty text
                            <input
                              name="warranty_text"
                              defaultValue={option.warranty_text ?? ""}
                              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Load kg
                            <input
                              name="load_kg"
                              type="number"
                              min="0"
                              defaultValue={option.load_kg ?? ""}
                              className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Swatch colour
                            <input
                              name="swatch_color_hex"
                              type="color"
                              defaultValue={option.swatch_color_hex ?? "#111111"}
                              className="w-full h-9 rounded-md border border-neutral-300"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Swatch image
                            <input
                              type="file"
                              name="swatch_file"
                              accept="image/jpeg,image/png,image/webp"
                              className="w-full text-xs"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold">
                            <input type="checkbox" name="remove_swatch" className="accent-black" />
                            Remove swatch image
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold">
                            <input
                              type="checkbox"
                              name="is_active"
                              defaultChecked={option.is_active !== false}
                              className="accent-black"
                            />
                            Active
                          </label>

                          <div className="sm:col-span-2 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                              Admin only · private pricing
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                                Linked material
                                <select
                                  name="material_code"
                                  defaultValue={price?.material_code ?? ""}
                                  className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                                >
                                  <option value="">None</option>
                                  {materials.map((material) => (
                                    <option key={material.material_code} value={material.material_code}>
                                      {material.display_name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                                Charged as
                                <select
                                  name="applies_to"
                                  defaultValue={price?.applies_to ?? "FLAT"}
                                  className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                                >
                                  <option value="FLAT">Flat amount</option>
                                  <option value="METAL_WEIGHT">Metal weight multiplier</option>
                                  <option value="TOP_AREA">Top area (per sq.ft)</option>
                                  <option value="PER_UNIT">Per unit</option>
                                </select>
                              </label>
                              <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                                Number
                                <input
                                  name="price_value"
                                  type="number"
                                  step="0.001"
                                  defaultValue={pricingValue(price)}
                                  className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                                />
                              </label>
                            </div>
                          </div>

                          <button className="justify-self-start px-4 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
                            Save option
                          </button>
                        </form>
                        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <OptionPreview
                            optionCode={option.option_code}
                            products={products}
                          />
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-100">
                <details>
                  <summary className="cursor-pointer text-xs font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Option
                  </summary>
                  <form
                    action={saveOptionAction}
                    className="mt-3 grid gap-3 sm:grid-cols-2"
                  >
                    <input type="hidden" name="option_group" value={group.option_group} />
                    <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Label
                      <input
                        name="label_en"
                        required
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Badge text
                      <input
                        name="badge_text"
                        placeholder="Recommended"
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Short note
                      <input
                        name="spec_note"
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Warranty text
                      <input
                        name="warranty_text"
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Load kg
                      <input
                        name="load_kg"
                        type="number"
                        min="0"
                        className="w-full px-3 py-2 rounded-md border border-neutral-300 text-sm font-normal"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Swatch colour
                      <input
                        name="swatch_color_hex"
                        type="color"
                        defaultValue="#111111"
                        className="w-full h-9 rounded-md border border-neutral-300"
                      />
                    </label>
                    <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      Swatch image
                      <input
                        type="file"
                        name="swatch_file"
                        accept="image/jpeg,image/png,image/webp"
                        className="w-full text-xs"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input type="checkbox" name="is_active" defaultChecked className="accent-black" />
                      Active
                    </label>

                    <div className="sm:col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-200 grid gap-3 sm:grid-cols-3">
                      <p className="sm:col-span-3 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                        Admin only · private pricing
                      </p>
                      <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                        Linked material
                        <select
                          name="material_code"
                          className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                        >
                          <option value="">None</option>
                          {materials.map((material) => (
                            <option key={material.material_code} value={material.material_code}>
                              {material.display_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                        Charged as
                        <select
                          name="applies_to"
                          className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                        >
                          <option value="FLAT">Flat amount</option>
                          <option value="METAL_WEIGHT">Metal weight multiplier</option>
                          <option value="TOP_AREA">Top area (per sq.ft)</option>
                          <option value="PER_UNIT">Per unit</option>
                        </select>
                      </label>
                      <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                        Number
                        <input
                          name="price_value"
                          type="number"
                          step="0.001"
                          defaultValue={0}
                          className="w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
                        />
                      </label>
                    </div>

                    <button className="justify-self-start px-4 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
                      Create option
                    </button>
                  </form>
                </details>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
