"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus, Trash2, Calculator } from "lucide-react";
import {
  deletePricingTierAction,
  previewPricingAction,
  saveBulkRuleAction,
  savePricingProfileAction,
  savePricingTierAction,
  type AdminPricingPreviewOutput,
  type PricingRulesActionState,
} from "./actions";
import type {
  PrivateBulkRule,
  PrivatePricingProfile,
  PrivatePricingTier,
} from "@/lib/variants/types";

const initialState: PricingRulesActionState = {};

export default function PricingRulesClient({
  profiles,
  bulkRules,
  tiers,
}: {
  profiles: PrivatePricingProfile[];
  bulkRules: PrivateBulkRule[];
  tiers: PrivatePricingTier[];
}) {
  const [profileState, profileAction, savingProfile] = useActionState(
    savePricingProfileAction,
    initialState
  );
  const [bulkState, bulkAction, savingBulk] = useActionState(
    saveBulkRuleAction,
    initialState
  );
  const [tierState, tierAction, savingTier] = useActionState(
    savePricingTierAction,
    initialState
  );

  // Live server-side pricing preview state
  const [previewCost, setPreviewCost] = useState("2500");
  const [previewProfileId, setPreviewProfileId] = useState(profiles[0]?.id ?? "");
  const [previewProductType, setPreviewProductType] = useState("TABLE");
  const [previewQty, setPreviewQty] = useState("10");
  const [previewResult, setPreviewResult] = useState<AdminPricingPreviewOutput | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function runPreview() {
    if (!previewProfileId) return;
    setPreviewLoading(true);
    try {
      const res = await previewPricingAction({
        manufacturingCost: Number(previewCost),
        profileId: previewProfileId,
        productType: previewProductType,
        quantity: Number(previewQty),
      });
      setPreviewResult(res);
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Live Admin Pricing Preview */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-neutral-700" />
          <h2 className="text-sm font-bold text-[#111111]">
            Live Server-Side Pricing Preview (Admin Only)
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
              Mfg Cost (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={previewCost}
              onChange={(e) => setPreviewCost(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
              Pricing Profile
            </label>
            <select
              value={previewProfileId}
              onChange={(e) => setPreviewProfileId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs bg-white"
            >
              {profiles.length === 0 && <option value="">No profiles yet</option>}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
              Product Type
            </label>
            <select
              value={previewProductType}
              onChange={(e) => setPreviewProductType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs bg-white"
            >
              <option value="TABLE">TABLE</option>
              <option value="CHAIR">CHAIR</option>
              <option value="SET">SET</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={previewQty}
              onChange={(e) => setPreviewQty(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={runPreview}
            disabled={previewLoading || profiles.length === 0}
            className="px-4 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
          >
            {previewLoading ? "Calculating..." : "Preview Price"}
          </button>
        </div>

        {previewResult && (
          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs flex flex-wrap gap-6">
            {previewResult.error ? (
              <span className="text-red-600">{previewResult.error}</span>
            ) : previewResult.requiresQuote ? (
              <span className="text-amber-700 font-semibold">
                Quotation Required ({previewResult.quoteReason})
              </span>
            ) : (
              <>
                <span>
                  Unit Price: <strong>₹{previewResult.unitPrice}</strong> ({previewResult.priceBasis})
                </span>
                <span>
                  Total: <strong>₹{previewResult.totalPrice}</strong> (GST: ₹{previewResult.gstAmount})
                </span>
                <span className="text-emerald-700">
                  Profit/Unit (ex-GST): <strong>₹{previewResult.profitPerUnit}</strong>
                </span>
                <span className="text-emerald-700">
                  Actual Gross Margin: <strong>{previewResult.actualGrossMarginPct}%</strong>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pricing Profiles */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            Pricing Profiles (SS, MS, Chairs, Tables, Sets)
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure markup or gross margin %, minimum margin floor, rounding, and GST mode.
          </p>
        </div>

        {profileState.error && (
          <p className="text-xs text-red-600">{profileState.error}</p>
        )}
        {profileState.message && (
          <p className="text-xs text-emerald-700 font-semibold">{profileState.message}</p>
        )}

        {profiles.map((p) => (
          <form
            key={p.id}
            action={profileAction}
            className="grid grid-cols-2 md:grid-cols-9 gap-2 items-end p-3 rounded-lg border border-neutral-200 bg-neutral-50/50"
          >
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="code" value={p.code} />
            <div>
              <span className="block text-[10px] font-bold text-neutral-500">Code</span>
              <span className="text-xs font-mono font-bold">{p.code}</span>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Name</label>
              <input name="name" defaultValue={p.name} required className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Channel</label>
              <select name="channel" defaultValue={p.channel} className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
                <option value="RETAIL">RETAIL</option>
                <option value="B2B">B2B</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Method</label>
              <select name="margin_type" defaultValue={p.margin_type} className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
                <option value="GROSS_MARGIN">Gross Margin</option>
                <option value="MARKUP">Cost Markup</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Margin %</label>
              <input name="default_margin_pct" type="number" step="0.01" defaultValue={p.default_margin_pct ?? ""} required className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Min %</label>
              <input name="min_margin_pct" type="number" step="0.01" defaultValue={p.min_margin_pct ?? ""} className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Rounding</label>
              <select name="rounding_rule" defaultValue={p.rounding_rule} className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
                <option value="UP_99">Up to 99</option>
                <option value="NEAREST_99">Nearest 99</option>
                <option value="UP_10">Up to 10</option>
                <option value="UP_50">Up to 50</option>
                <option value="UP_100">Up to 100</option>
                <option value="UP_9">Up to 9</option>
                <option value="NONE">None</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">GST % / Mode</label>
              <div className="flex gap-1">
                <input name="gst_rate" type="number" step="0.01" defaultValue={p.gst_rate} required className="w-14 px-1.5 py-1.5 rounded border border-neutral-300 text-xs bg-white" />
                <select name="gst_mode" defaultValue={p.gst_mode} className="w-full px-1 py-1.5 rounded border border-neutral-300 text-xs bg-white">
                  <option value="EXCLUSIVE">Excl</option>
                  <option value="INCLUSIVE">Incl</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={savingProfile} className="px-3 py-1.5 rounded bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800">
              Save
            </button>
          </form>
        ))}

        {/* Create New Pricing Profile */}
        <form
          action={profileAction}
          className="grid grid-cols-2 md:grid-cols-9 gap-2 items-end pt-3 border-t border-neutral-200"
        >
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">New Code</label>
            <input name="code" placeholder="MS_TABLE_B2B" required className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Name</label>
            <input name="name" placeholder="MS Tables B2B" required className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Channel</label>
            <select name="channel" className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
              <option value="RETAIL">RETAIL</option>
              <option value="B2B">B2B</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Method</label>
            <select name="margin_type" className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
              <option value="GROSS_MARGIN">Gross Margin</option>
              <option value="MARKUP">Cost Markup</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Margin %</label>
            <input name="default_margin_pct" type="number" step="0.01" placeholder="25" required className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Min %</label>
            <input name="min_margin_pct" type="number" step="0.01" placeholder="15" className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Rounding</label>
            <select name="rounding_rule" defaultValue="UP_99" className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
              <option value="UP_99">Up to 99</option>
              <option value="NEAREST_99">Nearest 99</option>
              <option value="UP_10">Up to 10</option>
              <option value="UP_50">Up to 50</option>
              <option value="UP_100">Up to 100</option>
              <option value="UP_9">Up to 9</option>
              <option value="NONE">None</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">GST % / Mode</label>
            <div className="flex gap-1">
              <input name="gst_rate" type="number" step="0.01" defaultValue="18" required className="w-14 px-1.5 py-1.5 rounded border border-neutral-300 text-xs" />
              <select name="gst_mode" defaultValue="EXCLUSIVE" className="w-full px-1 py-1.5 rounded border border-neutral-300 text-xs bg-white">
                <option value="EXCLUSIVE">Excl</option>
                <option value="INCLUSIVE">Incl</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={savingProfile} className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
            {savingProfile ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Add
          </button>
        </form>
      </div>

      {/* MOQ & Bulk Rules */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">
            MOQ & Quantity Threshold Rules
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure minimum order quantities, below-MOQ behavior, and 50+ custom quotation thresholds.
          </p>
        </div>

        {bulkState.error && <p className="text-xs text-red-600">{bulkState.error}</p>}
        {bulkState.message && (
          <p className="text-xs text-emerald-700 font-semibold">{bulkState.message}</p>
        )}

        {bulkRules.map((rule) => (
          <form
            key={rule.id}
            action={bulkAction}
            className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end p-3 rounded-lg border border-neutral-200 bg-neutral-50/50"
          >
            <input type="hidden" name="product_type" value={rule.product_type} />
            <div>
              <span className="block text-[10px] font-bold text-neutral-500">Type</span>
              <span className="text-xs font-bold">{rule.product_type}</span>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">MOQ</label>
              <input name="min_qty" type="number" min="1" defaultValue={rule.min_qty} required className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Below-MOQ Action</label>
              <select name="below_min_action" defaultValue={rule.below_min_action} className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
                <option value="QUOTE_REQUIRED">Manual Quote</option>
                <option value="SURCHARGE_PCT">Higher Margin / Surcharge %</option>
                <option value="BLOCK">Block</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Surcharge %</label>
              <input name="below_min_value" type="number" step="0.01" defaultValue={rule.below_min_value ?? ""} className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">50+ Quote Qty</label>
              <input name="special_quote_qty" type="number" defaultValue={rule.special_quote_qty ?? ""} className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-500">Special Action</label>
              <select name="special_quote_action" defaultValue={rule.special_quote_action} className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
                <option value="QUOTE_REQUIRED">Custom Quote</option>
                <option value="NONE">None</option>
              </select>
            </div>
            <button type="submit" disabled={savingBulk} className="px-3 py-1.5 rounded bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800">
              Save
            </button>
          </form>
        ))}
      </div>

      {/* Quantity Pricing Tiers */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#111111]">Quantity-Based Margin & Discount Tiers</h2>
        {tierState.error && <p className="text-xs text-red-600">{tierState.error}</p>}
        {tierState.message && <p className="text-xs text-emerald-700 font-semibold">{tierState.message}</p>}

        {tiers.length > 0 && (
          <div className="space-y-2">
            {tiers.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 text-xs">
                <span>
                  <strong>{t.product_type ?? t.scope}</strong> · Qty {t.min_qty}–{t.max_qty ?? "∞"} · {t.model} ({t.value ?? "Quote"})
                </span>
                <form action={deletePricingTierAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-red-600 hover:text-red-800 p-1" aria-label="Delete tier">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={tierAction} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end pt-3 border-t border-neutral-200">
          <input type="hidden" name="scope" value="PRODUCT_TYPE" />
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Product Type</label>
            <select name="product_type" className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
              <option value="CHAIR">CHAIR</option>
              <option value="TABLE">TABLE</option>
              <option value="SET">SET</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Min Qty</label>
            <input name="min_qty" type="number" min="1" required className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Max Qty</label>
            <input name="max_qty" type="number" min="1" placeholder="49" className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Model</label>
            <select name="model" className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs bg-white">
              <option value="DISCOUNT_PCT">Discount %</option>
              <option value="MARGIN_PCT">Margin %</option>
              <option value="FIXED_UNIT_PRICE">Fixed Price (₹)</option>
              <option value="QUOTE_REQUIRED">Quote Required</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-neutral-500">Value</label>
            <input name="value" type="number" step="0.01" placeholder="10" className="w-full px-2 py-1.5 rounded border border-neutral-300 text-xs" />
          </div>
          <button type="submit" disabled={savingTier} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
            Add Tier
          </button>
        </form>
      </div>
    </div>
  );
}
