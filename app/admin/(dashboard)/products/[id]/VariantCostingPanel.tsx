"use client";

import { useActionState, useState } from "react";
import { Sparkles, AlertTriangle, Loader2, Save } from "lucide-react";
import {
  bulkUpdateVariantsAction,
  generateProductVariantsAction,
  saveVariantCostingRowAction,
  type VariantAdminActionState,
} from "./variant-actions";
import type { PrivatePricingProfile, PublicSurfaceOption } from "@/lib/variants/types";

export interface AdminVariantRowView {
  id: string;
  variant_code: string;
  frame_material: "SS" | "MS";
  build_category_label: string;
  private_gauge_label: string;
  size_code: string;
  size_label: string;
  surface_label: string | null;
  manufacturing_cost: number | null;
  pricing_profile_id: string | null;
  calculated_selling_price: number | null;
  price_override_ex_gst: number | null;
  min_selling_price: number | null;
  profit_amount: number | null;
  actual_gross_margin_pct: number | null;
  lead_time_days: number | null;
  availability: "IN_STOCK" | "MADE_TO_ORDER" | "QUOTE_ONLY" | "UNAVAILABLE";
  status: "DRAFT" | "PUBLISHED";
  requires_quote: boolean;
}

const initialState: VariantAdminActionState = {};

const TABLE_SIZE_PRESETS = ["2x2", "3x2", "4x2", "4x2.5", "4x3", "6x3", "CUSTOM"];
const CHAIR_SIZE_PRESETS = ["STANDARD", "CUSTOM"];

export default function VariantCostingPanel({
  productId,
  productType,
  variants,
  surfaces,
  profiles,
}: {
  productId: string;
  productType: string;
  variants: AdminVariantRowView[];
  surfaces: PublicSurfaceOption[];
  profiles: PrivatePricingProfile[];
}) {
  const [genState, genAction, generating] = useActionState(
    generateProductVariantsAction,
    initialState
  );
  const [bulkState, bulkAction, bulking] = useActionState(
    bulkUpdateVariantsAction,
    initialState
  );
  const [rowState, rowAction, savingRow] = useActionState(
    saveVariantCostingRowAction,
    initialState
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGenerator, setShowGenerator] = useState(variants.length <= 1);

  const applicableSurfaces = surfaces.filter(
    (s) =>
      s.applicable_product_types.length === 0 ||
      s.applicable_product_types.includes(productType)
  );
  const sizePresets =
    productType === "TABLE" ? TABLE_SIZE_PRESETS : CHAIR_SIZE_PRESETS;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? variants.map((v) => v.id) : []);
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#111111]">
            Economic Variants & Costing Matrix
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Internal gauge mappings and manufacturing costs are visible to authorized administrators only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGenerator((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-800 hover:bg-neutral-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {showGenerator ? "Hide Variant Generator" : "Smart Variant Generator"}
        </button>
      </div>

      {showGenerator && (
        <form
          action={genAction}
          className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-4"
        >
          <input type="hidden" name="product_id" value={productId} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="font-bold text-neutral-700 mb-2">Step C — Materials</p>
              {(["MS", "SS"] as const).map((mat) => (
                <label key={mat} className="flex items-center gap-2 py-1">
                  <input type="checkbox" name="materials" value={mat} defaultChecked={mat === "MS"} />
                  <span>{mat === "SS" ? "SS — Stainless Steel" : "MS — Mild Steel"}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="font-bold text-neutral-700 mb-2">
                Step D — Build Categories (Admin Gauge)
              </p>
              {[
                { level: "ECONOMY", label: "Economy (SS 20G / MS 19G)" },
                { level: "STANDARD", label: "Standard (SS 18G / MS 18G)" },
                { level: "HEAVY_DUTY", label: "Heavy Duty (SS 16G / MS 16G)" },
              ].map((b) => (
                <label key={b.level} className="flex items-center gap-2 py-1">
                  <input type="checkbox" name="levels" value={b.level} defaultChecked />
                  <span>{b.label}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="font-bold text-neutral-700 mb-2">Step E — Surface Options</p>
              {applicableSurfaces.length === 0 ? (
                <p className="text-neutral-500">No surface options required.</p>
              ) : (
                applicableSurfaces.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" name="surface_ids" value={s.id} />
                    <span>{s.label}</span>
                  </label>
                ))
              )}
            </div>

            <div>
              <p className="font-bold text-neutral-700 mb-2">Step F — Sizes</p>
              {sizePresets.map((sz) => (
                <label key={sz} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    name="sizes"
                    value={sz}
                    defaultChecked={sz === "4x2" || sz === "STANDARD"}
                  />
                  <span>{sz}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
            <span className="text-[11px] text-neutral-500">
              Existing variant IDs and manufacturing costs are preserved; removed combinations are safely disabled.
            </span>
            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
            >
              {generating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Generate / Sync Variants
            </button>
          </div>
          {genState.error && <p className="text-xs text-red-600">{genState.error}</p>}
          {genState.message && (
            <p className="text-xs text-emerald-700 font-semibold">{genState.message}</p>
          )}
        </form>
      )}

      {selectedIds.length > 0 && (
        <form
          action={bulkAction}
          className="p-3 rounded-lg bg-neutral-100 border border-neutral-300 flex flex-wrap items-center gap-3 text-xs"
        >
          <input type="hidden" name="product_id" value={productId} />
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="variant_ids" value={id} />
          ))}
          <span className="font-bold">{selectedIds.length} selected:</span>
          <select
            name="pricing_profile_id"
            className="px-2 py-1.5 rounded border border-neutral-300 bg-white text-xs"
          >
            <option value="">Keep profile</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="lead_time_days"
            placeholder="Lead days"
            className="w-24 px-2 py-1.5 rounded border border-neutral-300 bg-white text-xs"
          />
          <select
            name="availability"
            className="px-2 py-1.5 rounded border border-neutral-300 bg-white text-xs"
          >
            <option value="">Keep availability</option>
            <option value="IN_STOCK">IN_STOCK</option>
            <option value="MADE_TO_ORDER">MADE_TO_ORDER</option>
            <option value="QUOTE_ONLY">QUOTE_ONLY</option>
            <option value="UNAVAILABLE">UNAVAILABLE</option>
          </select>
          <button
            type="submit"
            disabled={bulking}
            className="px-3 py-1.5 rounded bg-[#111111] text-white font-bold"
          >
            Apply Bulk Update
          </button>
        </form>
      )}

      {(rowState.error || bulkState.error) && (
        <p className="text-xs text-red-600">{rowState.error || bulkState.error}</p>
      )}
      {(rowState.message || bulkState.message) && (
        <p className="text-xs text-emerald-700 font-semibold">
          {rowState.message || bulkState.message}
        </p>
      )}

      {variants.length === 0 ? (
        <p className="text-xs text-neutral-500">
          No economic variants yet. Use the Smart Variant Generator above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px]">
                <th className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === variants.length && variants.length > 0}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label="Select all variants"
                  />
                </th>
                <th className="py-2 pr-2">Material</th>
                <th className="py-2 pr-2">Build (Gauge)</th>
                <th className="py-2 pr-2">Size</th>
                <th className="py-2 pr-2">Surface</th>
                <th className="py-2 pr-2">Mfg Cost (₹)</th>
                <th className="py-2 pr-2">Profile</th>
                <th className="py-2 pr-2">Calc Price</th>
                <th className="py-2 pr-2">Override (₹)</th>
                <th className="py-2 pr-2">Profit / Margin</th>
                <th className="py-2 pr-2">Lead (d)</th>
                <th className="py-2 pr-2">Availability</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2">Save</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const formId = `variant-form-${v.id}`;
                const missingCost =
                  v.manufacturing_cost == null && v.price_override_ex_gst == null;
                return (
                  <tr key={v.id} className="border-b border-neutral-100 align-middle">
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(v.id)}
                        onChange={() => toggleOne(v.id)}
                        aria-label={`Select ${v.variant_code}`}
                      />
                      <form id={formId} action={rowAction}>
                        <input type="hidden" name="variant_id" value={v.id} />
                        <input type="hidden" name="product_id" value={productId} />
                      </form>
                    </td>
                    <td className="py-2 pr-2 font-bold">{v.frame_material}</td>
                    <td className="py-2 pr-2">
                      <span>{v.build_category_label}</span>
                      <span className="ml-1 text-[10px] text-neutral-500 font-mono">
                        ({v.private_gauge_label})
                      </span>
                    </td>
                    <td className="py-2 pr-2">{v.size_label}</td>
                    <td className="py-2 pr-2">{v.surface_label ?? "—"}</td>
                    <td className="py-2 pr-2">
                      <input
                        form={formId}
                        name="manufacturing_cost"
                        type="number"
                        step="0.01"
                        defaultValue={v.manufacturing_cost ?? ""}
                        placeholder="Unset"
                        className={`w-24 px-2 py-1 rounded border text-xs ${
                          missingCost ? "border-amber-400 bg-amber-50" : "border-neutral-300"
                        }`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        form={formId}
                        name="pricing_profile_id"
                        defaultValue={v.pricing_profile_id ?? ""}
                        className="w-32 px-1.5 py-1 rounded border border-neutral-300 text-xs bg-white"
                      >
                        <option value="">Missing</option>
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2 font-semibold">
                      {v.calculated_selling_price != null ? (
                        `₹${v.calculated_selling_price}`
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 text-[11px]">
                          <AlertTriangle className="w-3 h-3" /> Quote
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        form={formId}
                        name="price_override_ex_gst"
                        type="number"
                        step="0.01"
                        defaultValue={v.price_override_ex_gst ?? ""}
                        placeholder="—"
                        className="w-20 px-2 py-1 rounded border border-neutral-300 text-xs"
                      />
                    </td>
                    <td className="py-2 pr-2 text-[11px]">
                      {v.profit_amount != null && v.actual_gross_margin_pct != null ? (
                        <span className="text-emerald-700 font-semibold">
                          ₹{v.profit_amount} ({v.actual_gross_margin_pct}%)
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        form={formId}
                        name="lead_time_days"
                        type="number"
                        defaultValue={v.lead_time_days ?? ""}
                        className="w-14 px-1.5 py-1 rounded border border-neutral-300 text-xs"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        form={formId}
                        name="availability"
                        defaultValue={v.availability}
                        className="px-1.5 py-1 rounded border border-neutral-300 text-xs bg-white"
                      >
                        <option value="IN_STOCK">IN_STOCK</option>
                        <option value="MADE_TO_ORDER">MADE_TO_ORDER</option>
                        <option value="QUOTE_ONLY">QUOTE_ONLY</option>
                        <option value="UNAVAILABLE">UNAVAILABLE</option>
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        form={formId}
                        name="status"
                        defaultValue={v.status}
                        className="px-1.5 py-1 rounded border border-neutral-300 text-xs bg-white"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <button
                        form={formId}
                        type="submit"
                        disabled={savingRow}
                        className="p-1.5 rounded bg-[#111111] text-white hover:bg-neutral-800"
                        aria-label={`Save ${v.variant_code}`}
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
