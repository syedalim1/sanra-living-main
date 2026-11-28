"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, Save, WandSparkles } from "lucide-react";
import type { BuildCategoryLevel, FrameMaterialCode, VariantAvailability, VariantStatus } from "@/lib/variants/types";
import { EditorSection, editorInput, editorPrimary, editorSecondary } from "./EditorSection";
import {
  bulkUpdateVariantsAction,
  generateProductVariantsAction,
  saveVariantCostingRowAction,
  type VariantAdminActionState,
} from "./variant-actions";

export interface AdminVariantRowView {
  id: string;
  variant_code: string;
  frame_material: FrameMaterialCode;
  build_level: BuildCategoryLevel;
  build_category_label: string;
  size_code: string;
  size_label: string;
  surface_label: string | null;
  surface_option_id: string | null;
  manufacturing_cost: number | null;
  pricing_profile_id: string | null;
  suggested_profile_id: string | null;
  calculated_selling_price: number | null;
  price_basis: "GST_INCLUSIVE" | "GST_EXCLUSIVE" | null;
  price_override_ex_gst: number | null;
  min_selling_price: number | null;
  lead_time_days: number | null;
  availability: VariantAvailability;
  status: VariantStatus;
  variant_revision: string;
  pricing_revision: string | null;
}

type ProfileOption = { id: string; name: string };
type SurfaceOption = { id: string; label: string };

const initialState: VariantAdminActionState = {};
const MATERIALS = [["MS", "MS · Mild steel"], ["SS", "SS · Stainless steel"]] as const;
const BUILDS = [["ECONOMY", "Economy"], ["STANDARD", "Standard"], ["HEAVY_DUTY", "Heavy Duty"]] as const;
const TABLE_SIZES = ["2x2", "3x2", "4x2", "4x2.5", "4x3", "6x3"];
const priceFormat = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const AVAILABILITY = {
  IN_STOCK: "In stock",
  MADE_TO_ORDER: "Made to order",
  QUOTE_ONLY: "Quote only",
  UNAVAILABLE: "Unavailable",
};
const SHEET = "@min-[760px]:grid-cols-[1.05rem_minmax(8rem,1.55fr)_minmax(5.25rem,0.8fr)_minmax(8rem,1.2fr)_minmax(5rem,0.7fr)_minmax(6rem,0.85fr)_4.65rem]";
const COMPACT_INPUT = `${editorInput} @min-[760px]:mt-0 @min-[760px]:min-h-9 @min-[760px]:px-2 @min-[760px]:py-1`;
const FIELD_LABEL = "text-sm font-medium text-neutral-800";
const MOBILE_LABEL = "@min-[760px]:sr-only";
const CHECKBOX = "size-4 shrink-0 accent-neutral-900";

function submitWithoutReset(event: FormEvent<HTMLFormElement>, action: (data: FormData) => void) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  startTransition(() => action(data));
}

function ActionFeedback({ state }: { state: VariantAdminActionState }) {
  if (!state.error && !state.message) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-red-700" : "text-emerald-700"}`}>
      {state.error ?? state.message}
    </p>
  );
}

function GeneratorChoices({ name, title, options, defaults }: {
  name: string;
  title: string;
  options: ReadonlyArray<readonly [string, string]>;
  defaults: string[];
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-neutral-800">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, label]) => (
          <label key={value} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm has-checked:border-neutral-500 has-checked:bg-neutral-100">
            <input type="checkbox" name={name} value={value} defaultChecked={defaults.includes(value)} className={CHECKBOX} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function VariantGenerator({ productId, productType, primaryMaterial, materialTags, dimensions, variants, surfaces }: {
  productId: string;
  productType: string;
  primaryMaterial: FrameMaterialCode;
  materialTags: string[];
  dimensions: string;
  variants: AdminVariantRowView[];
  surfaces: SurfaceOption[];
}) {
  const [state, action, pending] = useActionState(generateProductVariantsAction, initialState);
  const sizeOptions = productType === "TABLE" || productType === "CHAIR_TABLE_SET"
    ? TABLE_SIZES.map((size) => [size, `${size.replace("x", " × ")} ft`] as const)
    : [];
  const preferredMaterials = MATERIALS.filter(([code]) => materialTags.includes(code) || code === primaryMaterial).map(([code]) => code);
  const generated = variants.filter((variant) => !variant.variant_code.endsWith("-DEFAULT"));
  const expandableSizes = generated.map((variant) => variant.size_code).filter((code) =>
    !["STANDARD", "CUSTOM", ...sizeOptions.map(([value]) => value)].includes(code));

  return (
    <form action={action} onSubmit={(event) => submitWithoutReset(event, action)} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <GeneratorChoices name="materials" title="Frame materials" options={MATERIALS} defaults={generated.length ? generated.map((variant) => variant.frame_material) : preferredMaterials} />
        <GeneratorChoices name="levels" title="Build categories" options={BUILDS} defaults={generated.length ? generated.map((variant) => variant.build_level) : ["ECONOMY", "STANDARD", "HEAVY_DUTY"]} />
        {surfaces.length > 0 && (
          <div className="space-y-2 sm:col-span-2">
            <GeneratorChoices name="surface_ids" title="Surfaces" options={surfaces.map(({ id, label }) => [id, label])} defaults={generated.flatMap(({ surface_option_id }) => surface_option_id ? [surface_option_id] : [])} />
            <p className="text-sm text-neutral-600">Leave surfaces unchecked for a variant with no separate surface selection.</p>
          </div>
        )}
        <div className="space-y-3 sm:col-span-2">
          <GeneratorChoices name="sizes" title="Sizes" options={[
            ["STANDARD", `Model size · ${dimensions}`],
            ...sizeOptions, ["CUSTOM", "Custom · Quote only"],
          ]} defaults={generated.length ? generated.map((variant) => variant.size_code) : ["STANDARD"]} />
          <label className="block max-w-sm text-sm font-medium">
            Additional sizes (ft)
            <input name="additional_sizes" defaultValue={[...new Set(expandableSizes)].join(", ")} placeholder="3.5x2, 5x3" maxLength={240} className={editorInput} />
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
        {variants.length > 0 && (
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="replace_variants" className={CHECKBOX} />
            Deactivate combinations outside this selection
          </label>
        )}
        <button type="submit" disabled={pending} className={`${editorPrimary} ml-auto`}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
          {pending ? "Generating…" : "Generate variants"}
        </button>
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}

function AvailabilityOptions() {
  return Object.entries(AVAILABILITY).map(([value, label]) => <option key={value} value={value}>{label}</option>);
}

function CostingRow({ variant: v, productId, profiles, selected, onSelect }: {
  variant: AdminVariantRowView;
  productId: string;
  profiles: ProfileOption[];
  selected: boolean;
  onSelect: () => void;
}) {
  const [state, action, pending] = useActionState(saveVariantCostingRowAction, initialState);
  const currentProfile = v.pricing_profile_id ?? v.suggested_profile_id ?? "";
  const isRetiredProfile = currentProfile && !profiles.some((profile) => profile.id === currentProfile);
  const displayPrice = v.calculated_selling_price != null
    ? priceFormat.format(v.calculated_selling_price)
    : v.availability === "QUOTE_ONLY" ? "Quote only" : "—";

  return (
    <form
      action={action}
      aria-label={`Costing for ${v.variant_code}`}
      onSubmit={(event) => submitWithoutReset(event, action)}
      className="rounded-xl border border-neutral-200 bg-white p-3 @min-[760px]:rounded-none @min-[760px]:border-x-0 @min-[760px]:border-t-0 @min-[760px]:px-2"
    >
      <div key={`${v.variant_revision}:${v.pricing_revision}`} className={`grid grid-cols-2 items-start gap-3 @min-[760px]:items-center @min-[760px]:gap-x-2 ${SHEET}`}>
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="variant_id" value={v.id} />
        <input type="hidden" name="variant_revision" value={v.variant_revision} />
        <input type="hidden" name="pricing_revision" value={v.pricing_revision ?? ""} />
        <div className="col-span-2 flex min-w-0 items-start gap-2 @min-[760px]:col-span-1">
          <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${v.variant_code}`} className={`${CHECKBOX} mt-0.5`} />
          <div className="min-w-0 @min-[760px]:hidden">
            <p className="text-sm font-semibold">{v.frame_material} · {v.build_category_label}</p>
            <p className="text-xs text-neutral-600">{v.size_label}{v.surface_label && ` · ${v.surface_label}`}</p>
            <p className="mt-1 break-all text-xs text-neutral-500">{v.variant_code}</p>
          </div>
        </div>
        <div className="hidden min-w-0 @min-[760px]:block">
          <p className="text-sm font-semibold">{v.frame_material} · {v.build_category_label}</p>
          <p className="truncate text-xs text-neutral-600" title={v.variant_code}>{v.size_label}{v.surface_label && ` · ${v.surface_label}`}</p>
          <p className="truncate text-xs text-neutral-500" title={v.variant_code}>{v.variant_code}</p>
        </div>
        <label className={FIELD_LABEL}>
          <span className={MOBILE_LABEL}>Manufacturing cost (₹)</span>
          <input name="manufacturing_cost" type="number" min="0" max="10000000" step="0.01" defaultValue={v.manufacturing_cost ?? ""} placeholder="Enter cost" className={COMPACT_INPUT} />
        </label>
        <label className={FIELD_LABEL}>
          <span className={MOBILE_LABEL}>Pricing profile</span>
          <select name="pricing_profile_id" defaultValue={currentProfile} className={COMPACT_INPUT}>
            <option value="">Select profile</option>
            {isRetiredProfile && <option value={currentProfile}>Inactive profile</option>}
            {profiles.map(({ id, name }) => (
              <option key={id} value={id}>{name}{!v.pricing_profile_id && id === v.suggested_profile_id ? " (suggested)" : ""}</option>
            ))}
          </select>
        </label>
        <div>
          <p className={`${FIELD_LABEL} ${MOBILE_LABEL}`}>Selling price</p>
          <p className="text-sm font-semibold tabular-nums">{displayPrice}</p>
          {v.price_basis && <p className="text-xs text-neutral-600">{v.price_basis === "GST_INCLUSIVE" ? "Incl. GST" : "Excl. GST"}</p>}
        </div>
        <label className={FIELD_LABEL}>
          <span className={MOBILE_LABEL}>Variant status</span>
          <select name="status" defaultValue={v.status} className={COMPACT_INPUT}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </label>
        <button type="submit" disabled={pending} className={`${editorPrimary} col-span-2 @min-[760px]:col-span-1 @min-[760px]:min-h-9 @min-[760px]:px-2`}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </button>
        <details className="col-span-full border-t border-neutral-100 pt-2 @min-[760px]:col-start-2 @min-[760px]:col-end-[-1]">
          <summary className="min-h-8 cursor-pointer py-1 text-sm font-medium text-neutral-700">
            Availability and price options · {AVAILABILITY[v.availability]}
          </summary>
          <div className="grid gap-3 pt-2 sm:grid-cols-2 @min-[760px]:grid-cols-4">
            <label className={FIELD_LABEL}>
              Availability
              <select name="availability" defaultValue={v.availability} className={editorInput}><AvailabilityOptions /></select>
            </label>
            <label className={FIELD_LABEL}>
              Lead time (days)
              <input name="lead_time_days" type="number" min="0" max="365" defaultValue={v.lead_time_days ?? ""} className={editorInput} />
            </label>
            <label className={FIELD_LABEL}>
              Manual price ex. GST (₹)
              <input name="price_override_ex_gst" type="number" min="0" max="10000000" step="0.01" defaultValue={v.price_override_ex_gst ?? ""} className={editorInput} />
            </label>
            <label className={FIELD_LABEL}>
              Minimum selling price (₹)
              <input name="min_selling_price" type="number" min="0" max="10000000" step="0.01" defaultValue={v.min_selling_price ?? ""} className={editorInput} />
            </label>
          </div>
        </details>
      </div>
      <div className="mt-1"><ActionFeedback state={state} /></div>
    </form>
  );
}

export default function VariantCostingPanel({ productId, productType, variants, surfaces, profiles, primaryMaterial, materialTags, dimensions }: {
  productId: string;
  productType: string;
  variants: AdminVariantRowView[];
  surfaces: SurfaceOption[];
  profiles: ProfileOption[];
  primaryMaterial: FrameMaterialCode;
  materialTags: string[];
  dimensions: string;
}) {
  const [bulkState, bulkAction, pending] = useActionState(bulkUpdateVariantsAction, initialState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selection = new Set(selectedIds);
  const selected = variants.filter((variant) => selection.has(variant.id));
  const allSelected = selected.length > 0 && selected.length === variants.length;

  return (
    <>
      <EditorSection id="variants" title="Generate variants" description="Choose the materials, build categories and sizes sold under this model number.">
        <VariantGenerator {...{ productId, productType, primaryMaterial, materialTags, dimensions, variants, surfaces }} />
      </EditorSection>
      <EditorSection id="costing" title="Manufacturing costs and selling prices" description="Save a cost and pricing profile to calculate the selling price.">
        <div className="@container min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {variants.length > 0 ? (
              <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-neutral-700">
                <input type="checkbox" className={CHECKBOX} checked={allSelected} onChange={(event) => setSelectedIds(event.target.checked ? variants.map(({ id }) => id) : [])} />
                Select all variants
              </label>
            ) : <p className="text-sm text-neutral-600">Generate variants to start costing.</p>}
            <Link href="/admin/cost-import" className={editorSecondary}>Import costs from CSV</Link>
          </div>
          {selected.length > 0 && (
            <form action={bulkAction} onSubmit={(event) => submitWithoutReset(event, bulkAction)} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <input type="hidden" name="product_id" value={productId} />
              {selected.map(({ id }) => <input key={id} type="hidden" name="variant_ids" value={id} />)}
              <p className="mb-2 text-sm font-semibold">Update {selected.length} selected {selected.length === 1 ? "variant" : "variants"}</p>
              <div className="grid items-end gap-3 sm:grid-cols-3 @min-[760px]:grid-cols-[1fr_1fr_1fr_auto]">
                <label className={FIELD_LABEL}>
                  Pricing profile
                  <select name="pricing_profile_id" className={editorInput}>
                    <option value="">Keep current</option>
                    {profiles.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </label>
                <label className={FIELD_LABEL}>
                  Lead time (days)
                  <input type="number" name="lead_time_days" min="0" max="365" placeholder="Keep current" className={editorInput} />
                </label>
                <label className={FIELD_LABEL}>
                  Availability
                  <select name="availability" className={editorInput}><option value="">Keep current</option><AvailabilityOptions /></select>
                </label>
                <button type="submit" disabled={pending} className={editorPrimary}>{pending ? "Saving…" : "Apply changes"}</button>
              </div>
            </form>
          )}
          <ActionFeedback state={bulkState} />
          {variants.length > 0 && (
            <div className="space-y-3 @min-[760px]:space-y-0">
              <div aria-hidden="true" className={`hidden items-center gap-2 rounded-t-lg bg-neutral-100 px-2 py-2 text-xs font-semibold text-neutral-700 @min-[760px]:grid ${SHEET}`}>
                <span /><span>Variant</span><span>Cost (₹)</span><span>Pricing profile</span><span>Selling price</span><span>Status</span>
              </div>
              {variants.map((variant) => (
                <CostingRow
                  key={variant.id}
                  variant={variant}
                  productId={productId}
                  profiles={profiles}
                  selected={selection.has(variant.id)}
                  onSelect={() => setSelectedIds((current) =>
                    current.includes(variant.id) ? current.filter((id) => id !== variant.id) : [...current, variant.id]
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </EditorSection>
    </>
  );
}
