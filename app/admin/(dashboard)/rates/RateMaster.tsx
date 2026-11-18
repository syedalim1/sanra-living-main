"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShieldAlert, TrendingUp } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import { previewPriceAction, saveRatesAction } from "@/app/admin/(dashboard)/rates/actions";
import { formatINR } from "@/lib/format";
import { formatRateNumber, isLargeRateChange } from "@/lib/admin/validation";
import type {
  GlobalRateRow,
  MaterialRateRow,
  OptionRateRow,
  PreviewOption,
  PreviewProduct,
} from "@/lib/admin/rates-types";

interface RateMasterProps {
  materialRates: MaterialRateRow[];
  globals: GlobalRateRow[];
  options: OptionRateRow[];
  previewProducts: PreviewProduct[];
  previewSizes: PreviewOption[];
  previewTopTabs: PreviewOption[];
  previewMaterials: PreviewOption[];
  previewGauges: PreviewOption[];
}

interface RateChange {
  code: string;
  oldValue: number;
  newValue: number;
}

interface GlobalChange {
  key: string;
  oldValue: number;
  newValue: number;
}

interface OptionChange {
  code: string;
  field: "metal_cost_multiplier" | "flat_addon";
  oldValue: number;
  newValue: number;
}

const GLOBAL_LABELS: Record<string, string> = {
  BUMPER_RATE_PER_FT: "Protective steel bumper rate per ft",
  CENTER_SUPPORT_FLAT: "Center cross-support flat",
  KNOCKDOWN_PRICE_PCT: "Knock-down price adjustment %",
  QTY_DISCOUNT_4_9_PCT: "Quantity discount 4-9 units %",
  QTY_DISCOUNT_10_PLUS_PCT: "Quantity discount 10+ units %",
  SS_WEIGHT_FACTOR: "Stainless steel weight factor",
  PACK2_SAVING: "Pack-of-2 nesting saving (₹)",
};

const OPTION_GROUP_LABELS: Record<string, string> = {
  GAUGE: "Gauge multipliers",
  RACK_SIZE: "Rack size multipliers",
  THICKNESS: "SS top thickness multipliers",
  ADDON: "Add-on flat prices",
  FRAME_COLOR: "Frame finish add-ons",
  SEAT_COLOR: "Rexine color add-ons",
  BASE: "Base add-ons",
  FINISH: "Rack finish add-ons",
  SS_FINISH: "SS finish add-ons",
  METAL_TYPE: "Linked metal options",
  STAND_MATERIAL: "Linked material options",
  GRADE: "Linked stainless grades",
  SEAT: "Linked seat materials",
  SHELF: "Linked shelf materials",
  PACK: "Pack options",
  BUILD_TYPE: "Build options",
};

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-9;
}

function isValidRateValue(
  value: number | null,
  minimum: "positive" | "non-negative"
): value is number {
  if (value === null || !hasTwoDecimals(value)) return false;
  return minimum === "positive" ? value > 0 : value >= 0;
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-sm font-bold text-[#111111]">{title}</h2>
        <p className="text-[11px] text-neutral-500 mt-1">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function RateMaster({
  materialRates,
  globals,
  options,
  previewProducts,
  previewSizes,
  previewTopTabs,
  previewMaterials,
  previewGauges,
}: RateMasterProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  const [rateValues, setRateValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      materialRates.map((row) => [row.material_code, formatRateNumber(row.cost_per_unit)])
    )
  );
  const [globalValues, setGlobalValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(globals.map((row) => [row.key, formatRateNumber(row.numeric_value)]))
  );
  const [optionValues, setOptionValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      options
        .filter((row) => row.field !== null)
        .map((row) => [
          `${row.option_code}:${row.field}`,
          formatRateNumber(row.value),
        ])
    )
  );

  const [savedRates, setSavedRates] = useState<Record<string, number>>(() =>
    Object.fromEntries(materialRates.map((row) => [row.material_code, row.cost_per_unit]))
  );
  const [savedGlobals, setSavedGlobals] = useState<Record<string, number>>(() =>
    Object.fromEntries(globals.map((row) => [row.key, row.numeric_value]))
  );
  const [savedOptions, setSavedOptions] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      options
        .filter((row) => row.field !== null)
        .map((row) => [`${row.option_code}:${row.field}`, row.value])
    )
  );

  const [largeConfirm, setLargeConfirm] = useState(false);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [previewProductId, setPreviewProductId] = useState(previewProducts[0]?.id ?? "");
  const initialProduct = previewProducts[0];
  const initialTabs = previewTopTabs.filter((tab) =>
    initialProduct?.allowed_top_categories.includes(tab.option_code)
  );
  const [previewTopTab, setPreviewTopTab] = useState(initialTabs[0]?.option_code ?? "FRAME_ONLY");
  const [previewMaterial, setPreviewMaterial] = useState(
    previewTopTab === "FRAME_ONLY"
      ? ""
      : previewMaterials.find((material) => material.parent_code === previewTopTab)
          ?.option_code ?? ""
  );
  const [previewSize, setPreviewSize] = useState(
    previewSizes.find((size) => size.option_code === "4x2")?.option_code ??
      previewSizes[0]?.option_code ??
      ""
  );
  const [previewGauge, setPreviewGauge] = useState(
    previewGauges.find((gauge) => gauge.option_code === "G16")?.option_code ??
      previewGauges[0]?.option_code ??
      ""
  );
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    unit_price: number | null;
    total_price: number | null;
    requires_quote: boolean;
  } | null>(null);

  let invalidCount = 0;
  const rateChanges: RateChange[] = [];

  for (const row of materialRates) {
    const raw = rateValues[row.material_code] ?? "";
    const value = toNumber(raw);
    const oldValue = savedRates[row.material_code];

    if (!isValidRateValue(value, "positive")) {
      if (raw !== formatRateNumber(oldValue)) invalidCount += 1;
      continue;
    }

    if (value !== oldValue) {
      rateChanges.push({ code: row.material_code, oldValue, newValue: value });
    }
  }

  const globalChanges: GlobalChange[] = [];

  for (const row of globals) {
    const raw = globalValues[row.key] ?? "";
    const value = toNumber(raw);
    const oldValue = savedGlobals[row.key];

    if (!isValidRateValue(value, "non-negative")) {
      if (raw !== formatRateNumber(oldValue)) invalidCount += 1;
      continue;
    }

    if (value !== oldValue) {
      globalChanges.push({ key: row.key, oldValue, newValue: value });
    }
  }

  const optionChanges: OptionChange[] = [];

  for (const row of options) {
    if (!row.field) continue;

    const key = `${row.option_code}:${row.field}`;
    const raw = optionValues[key] ?? "";
    const value = toNumber(raw);
    const oldValue = savedOptions[key];
    const minimum = row.field === "metal_cost_multiplier" ? "positive" : "non-negative";

    if (!isValidRateValue(value, minimum)) {
      if (raw !== formatRateNumber(oldValue)) invalidCount += 1;
      continue;
    }

    if (value !== oldValue) {
      optionChanges.push({
        code: row.option_code,
        field: row.field,
        oldValue,
        newValue: value,
      });
    }
  }

  const changedCount = rateChanges.length + globalChanges.length + optionChanges.length;
  const largeCount = [
    ...rateChanges.map((change) => isLargeRateChange(change.oldValue, change.newValue)),
    ...globalChanges.map((change) => isLargeRateChange(change.oldValue, change.newValue)),
    ...optionChanges.map((change) => isLargeRateChange(change.oldValue, change.newValue)),
  ].filter(Boolean).length;

  const canSave =
    changedCount > 0 &&
    invalidCount === 0 &&
    (largeCount === 0 || largeConfirm) &&
    !isSaving;

  const rateChanged = (code: string) => rateChanges.some((change) => change.code === code);
  const globalChanged = (key: string) => globalChanges.some((change) => change.key === key);
  const optionChanged = (code: string, field: string) =>
    optionChanges.some((change) => change.code === code && change.field === field);

  const handleSave = () => {
    if (invalidCount > 0) {
      setToast({ kind: "error", message: "Fix the highlighted values before saving." });
      return;
    }

    if (largeCount > 0 && !largeConfirm) {
      setToast({
        kind: "error",
        message: "Tick the large-change confirmation before saving.",
      });
      return;
    }

    if (changedCount === 0) return;

    const confirmed = window.confirm(
      `Update ${changedCount} rates? Public prices will refresh within 5 minutes.`
    );
    if (!confirmed) return;

    startSaving(async () => {
      const result = await saveRatesAction({
        materialRates: rateChanges.map((change) => ({
          code: change.code,
          value: change.newValue,
        })),
        globals: globalChanges.map((change) => ({
          key: change.key,
          value: change.newValue,
        })),
        options: optionChanges.map((change) => ({
          code: change.code,
          field: change.field,
          value: change.newValue,
        })),
        confirmLarge: largeConfirm,
      });

      if (!result.ok) {
        setToast({ kind: "error", message: result.error ?? "Unable to save rates." });
        return;
      }

      setSavedRates((current) => ({
        ...current,
        ...Object.fromEntries(rateChanges.map((change) => [change.code, change.newValue])),
      }));
      setSavedGlobals((current) => ({
        ...current,
        ...Object.fromEntries(globalChanges.map((change) => [change.key, change.newValue])),
      }));
      setSavedOptions((current) => ({
        ...current,
        ...Object.fromEntries(
          optionChanges.map((change) => [
            `${change.code}:${change.field}`,
            change.newValue,
          ])
        ),
      }));
      setLargeConfirm(false);
      setToast({
        kind: "success",
        message:
          result.updated && result.updated > 0
            ? `${result.updated} value${result.updated === 1 ? "" : "s"} updated. Public prices refresh within 5 minutes.`
            : "No changes to save.",
      });
      router.refresh();
    });
  };

  const selectedProduct = previewProducts.find((product) => product.id === previewProductId);
  const availableTabs = previewTopTabs.filter((tab) =>
    selectedProduct?.allowed_top_categories.includes(tab.option_code)
  );
  const availableMaterials = previewMaterials.filter(
    (material) => material.parent_code === previewTopTab
  );

  const handleProductChange = (productId: string) => {
    setPreviewProductId(productId);
    setPreviewResult(null);
    const product = previewProducts.find((item) => item.id === productId);
    const tabs = previewTopTabs.filter((tab) =>
      product?.allowed_top_categories.includes(tab.option_code)
    );
    const nextTab = tabs[0]?.option_code ?? "FRAME_ONLY";
    setPreviewTopTab(nextTab);
    setPreviewMaterial(
      nextTab === "FRAME_ONLY"
        ? ""
        : previewMaterials.find((material) => material.parent_code === nextTab)?.option_code ??
            ""
    );
  };

  const handleTopTabChange = (topTab: string) => {
    setPreviewTopTab(topTab);
    setPreviewResult(null);
    setPreviewMaterial(
      topTab === "FRAME_ONLY"
        ? ""
        : previewMaterials.find((material) => material.parent_code === topTab)?.option_code ??
            ""
    );
  };

  const handlePreview = async () => {
    if (!previewProductId || !previewSize || !previewTopTab || !previewGauge) return;

    setPreviewing(true);
    try {
      const result = await previewPriceAction({
        productId: previewProductId,
        size: previewSize,
        top_tab: previewTopTab,
        top_material: previewTopTab === "FRAME_ONLY" ? null : previewMaterial || null,
        gauge: previewGauge,
      });

      if (!result.ok) {
        setToast({ kind: "error", message: result.error ?? "Unable to preview." });
        return;
      }

      setPreviewResult({
        unit_price: result.unit_price ?? null,
        total_price: result.total_price ?? null,
        requires_quote: Boolean(result.requires_quote),
      });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-neutral-200 px-2.5 py-1 rounded">
          Tab 1
        </span>
        <h1 className="text-2xl font-black text-[#111111] tracking-tight mt-3">Rate Master</h1>
        <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
          Edit factory input rates, global pricing values and option pricing. Every saved change
          is audit-logged and refreshes public prices immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Material rates
          </p>
          <p className="text-2xl font-black text-[#111111] mt-1">{materialRates.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Unsaved changes
          </p>
          <p className="text-2xl font-black text-[#111111] mt-1">{changedCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-neutral-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            Large changes
          </p>
          <p className={`text-2xl font-black mt-1 ${largeCount > 0 ? "text-amber-700" : "text-[#111111]"}`}>
            {largeCount}
          </p>
        </div>
      </div>

      <SectionCard
        title="Material Rates"
        description="METAL is priced per kg. WOOD and STONE are priced per sq.ft. Highlighted rows have unsaved changes."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-5 py-2.5 font-bold">Material</th>
                <th className="px-3 py-2.5 font-bold">Code</th>
                <th className="px-3 py-2.5 font-bold">Unit</th>
                <th className="px-3 py-2.5 font-bold">Rate</th>
                <th className="px-3 py-2.5 font-bold">Change</th>
                <th className="px-5 py-2.5 font-bold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  {
                    key: "METAL",
                    label: "Metal (per kg)",
                    match: (row: MaterialRateRow) =>
                      row.category === "METAL" && row.unit.toUpperCase() !== "SQFT",
                  },
                  {
                    key: "SHEET",
                    label: "Sheet Tops (per sq.ft)",
                    match: (row: MaterialRateRow) =>
                      row.category === "METAL" && row.unit.toUpperCase() === "SQFT",
                  },
                  {
                    key: "WOOD",
                    label: "Wood (per sq.ft)",
                    match: (row: MaterialRateRow) => row.category === "WOOD",
                  },
                  {
                    key: "STONE",
                    label: "Stone (per sq.ft)",
                    match: (row: MaterialRateRow) => row.category === "STONE",
                  },
                ] as const
              ).map((category) => {
                const rows = materialRates.filter(category.match);
                return (
                  <GroupRows key={category.key} category={category.label} colSpan={6}>
                    {rows.map((row) => {
                      const changed = rateChanged(row.material_code);
                      const raw = rateValues[row.material_code] ?? "";
                      const value = toNumber(raw);
                      const invalid = raw !== "" && !isValidRateValue(value, "positive");
                      const large =
                        changed &&
                        value !== null &&
                        isLargeRateChange(savedRates[row.material_code], value);

                      return (
                        <tr
                          key={row.material_code}
                          className={changed ? "bg-amber-50/70" : "bg-white"}
                        >
                          <td className="px-5 py-3 font-semibold text-neutral-900">
                            {row.display_name}
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] text-neutral-500">
                            {row.material_code}
                          </td>
                          <td className="px-3 py-3 uppercase text-neutral-500">{row.unit}</td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={raw}
                              onChange={(event) =>
                                setRateValues((current) => ({
                                  ...current,
                                  [row.material_code]: event.target.value,
                                }))
                              }
                              className={`w-28 px-2.5 py-1.5 rounded-md border bg-white text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black ${
                                invalid ? "border-red-400" : "border-neutral-300"
                              }`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            {changed ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[11px] text-neutral-600">
                                  ₹{formatRateNumber(savedRates[row.material_code])} → ₹
                                  {formatRateNumber(value ?? 0)}
                                </span>
                                {large && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">
                                    <ShieldAlert className="w-3 h-3" /> &gt;40%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                            {invalid && (
                              <p className="text-[10px] font-semibold text-red-600 mt-1">
                                Enter a number greater than 0 with max 2 decimals.
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-[11px] text-neutral-500">
                            {formatTimestamp(row.updated_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </GroupRows>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Global Pricing Values"
        description="Bumper, center support, quantity discounts, knock-down adjustment and stainless weight factor."
      >
        <div className="divide-y divide-neutral-100">
          {globals.map((row) => {
            const key = row.key;
            const changed = globalChanged(key);
            const raw = globalValues[key] ?? "";
            const value = toNumber(raw);
            const invalid = raw !== "" && !isValidRateValue(value, "non-negative");
            const large =
              changed && value !== null && isLargeRateChange(savedGlobals[key], value);

            return (
              <div
                key={key}
                className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  changed ? "bg-amber-50/70" : ""
                }`}
              >
                <div className="flex-1">
                  <p className="text-xs font-semibold text-neutral-900">
                    {GLOBAL_LABELS[key] ?? key}
                  </p>
                  <p className="text-[10px] font-mono text-neutral-500 mt-0.5">{key}</p>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={raw}
                  onChange={(event) =>
                    setGlobalValues((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className={`w-28 px-2.5 py-1.5 rounded-md border bg-white text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black ${
                    invalid ? "border-red-400" : "border-neutral-300"
                  }`}
                />
                <div className="w-56">
                  {changed ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] text-neutral-600">
                        {formatRateNumber(savedGlobals[key])} → {formatRateNumber(value ?? 0)}
                      </span>
                      {large && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">
                          <ShieldAlert className="w-3 h-3" /> &gt;40%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-neutral-400">—</span>
                  )}
                  {invalid && (
                    <p className="text-[10px] font-semibold text-red-600 mt-1">
                      Enter 0 or more with max 2 decimals.
                    </p>
                  )}
                </div>
                <p className="w-40 text-[11px] text-neutral-500">
                  {formatTimestamp(row.updated_at)}
                </p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Option Pricing"
        description="Gauge, rack and SS multipliers plus flat finish/add-on prices. Linked material options are shown read-only."
      >
        <div className="divide-y divide-neutral-100">
          {options.length === 0 && (
            <p className="px-5 py-4 text-xs text-neutral-500">
              No option pricing rows found. Run migrations 003 and 005, then reload this
              page.
            </p>
          )}
          {options.map((row) => {
            if (!row.field) {
              return (
                <div
                  key={`${row.option_code}:readonly`}
                  className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 bg-neutral-50/50"
                >
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-neutral-900">{row.label_en}</p>
                    <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      {row.option_code} •{" "}
                      {OPTION_GROUP_LABELS[row.option_group] ?? row.option_group}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-500">
                    {row.note ?? "Read-only"}
                  </span>
                </div>
              );
            }

            const key = `${row.option_code}:${row.field}`;
            const changed = optionChanged(row.option_code, row.field);
            const raw = optionValues[key] ?? "";
            const value = toNumber(raw);
            const minimum = row.field === "metal_cost_multiplier" ? "positive" : "non-negative";
            const invalid = raw !== "" && !isValidRateValue(value, minimum);
            const large =
              changed && value !== null && isLargeRateChange(savedOptions[key], value);

            return (
              <div
                key={key}
                className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                  changed ? "bg-amber-50/70" : ""
                }`}
              >
                <div className="flex-1">
                  <p className="text-xs font-semibold text-neutral-900">{row.label_en}</p>
                  <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                    {row.option_code} • {OPTION_GROUP_LABELS[row.option_group] ?? row.option_group}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 w-32">
                  {row.field === "metal_cost_multiplier" ? "Multiplier" : "Flat add-on"}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={row.field === "metal_cost_multiplier" ? "0.01" : "0"}
                  value={raw}
                  onChange={(event) =>
                    setOptionValues((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className={`w-28 px-2.5 py-1.5 rounded-md border bg-white text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black ${
                    invalid ? "border-red-400" : "border-neutral-300"
                  }`}
                />
                <div className="w-56">
                  {changed ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] text-neutral-600">
                        {formatRateNumber(savedOptions[key])} → {formatRateNumber(value ?? 0)}
                      </span>
                      {large && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">
                          <ShieldAlert className="w-3 h-3" /> &gt;40%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-neutral-400">—</span>
                  )}
                  {invalid && (
                    <p className="text-[10px] font-semibold text-red-600 mt-1">
                      {minimum === "positive"
                        ? "Enter a number greater than 0."
                        : "Enter 0 or more."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {largeCount > 0 && (
        <label className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900">
          <input
            type="checkbox"
            checked={largeConfirm}
            onChange={(event) => setLargeConfirm(event.target.checked)}
            className="mt-0.5 w-4 h-4 accent-amber-700"
          />
          <span className="text-xs font-semibold leading-relaxed">
            I confirm this large change
            <span className="block font-normal text-[11px] text-amber-800 mt-0.5">
              {largeCount} value{largeCount === 1 ? "" : "s"} move by more than 40%.
            </span>
          </span>
        </label>
      )}

      <SectionCard
        title="Price Preview"
        description="Runs the existing server-side pricing engine. Preview uses saved rates, so save first to preview unsaved edits."
      >
        <div className="p-5 space-y-4">
          {previewProducts.length === 0 ? (
            <p className="text-xs text-neutral-500">No active products available.</p>
          ) : (
            <>
              {(previewSizes.length === 0 || previewGauges.length === 0) && (
                <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                  Configurator options are not loaded. Run migrations 003 and 005 so Size,
                  Top and Gauge can be selected.
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Product
                  </span>
                  <select
                    value={previewProductId}
                    onChange={(event) => handleProductChange(event.target.value)}
                    className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
                  >
                    {previewProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} — {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Size
                  </span>
                  <select
                    value={previewSize}
                    onChange={(event) => {
                      setPreviewSize(event.target.value);
                      setPreviewResult(null);
                    }}
                    className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
                  >
                    {previewSizes.map((size) => (
                      <option key={size.option_code} value={size.option_code}>
                        {size.label_en}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Top
                  </span>
                  <select
                    value={previewTopTab}
                    onChange={(event) => handleTopTabChange(event.target.value)}
                    className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
                  >
                    {availableTabs.map((tab) => (
                      <option key={tab.option_code} value={tab.option_code}>
                        {tab.label_en}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Top material
                  </span>
                  <select
                    value={previewMaterial}
                    onChange={(event) => {
                      setPreviewMaterial(event.target.value);
                      setPreviewResult(null);
                    }}
                    disabled={previewTopTab === "FRAME_ONLY"}
                    className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold disabled:bg-neutral-100 disabled:text-neutral-400"
                  >
                    {previewTopTab === "FRAME_ONLY" ? (
                      <option value="">Frame only</option>
                    ) : (
                      availableMaterials.map((material) => (
                        <option key={material.option_code} value={material.option_code}>
                          {material.label_en}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Gauge
                  </span>
                  <select
                    value={previewGauge}
                    onChange={(event) => {
                      setPreviewGauge(event.target.value);
                      setPreviewResult(null);
                    }}
                    className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
                  >
                    {previewGauges.map((gauge) => (
                      <option key={gauge.option_code} value={gauge.option_code}>
                        {gauge.label_en}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
                >
                  {previewing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                  {previewing ? "Calculating..." : "Preview"}
                </button>

                {previewResult && (
                  <div className="px-4 py-2.5 rounded-lg bg-[#F5F5F7] border border-neutral-200">
                    {previewResult.requires_quote ? (
                      <p className="text-xs font-bold text-neutral-900">Quote on request</p>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-[#111111]">
                          ₹{formatINR(previewResult.total_price ?? 0)}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          ₹{formatINR(previewResult.unit_price ?? 0)} / unit
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SectionCard>

      <div className="sticky bottom-4 z-30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-white border border-neutral-300 shadow-lg">
          <div className="flex-1">
            <p className="text-xs font-bold text-neutral-900">
              {changedCount} unsaved change{changedCount === 1 ? "" : "s"}
            </p>
            <p className="text-[11px] text-neutral-500">
              {invalidCount > 0
                ? `${invalidCount} invalid value${invalidCount === 1 ? "" : "s"}.`
                : largeCount > 0 && !largeConfirm
                ? "Large change confirmation required."
                : "Public prices refresh immediately after saving."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold uppercase tracking-wider disabled:bg-neutral-300 disabled:text-neutral-500"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      </div>

      {toast && (
        <AdminToast
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function GroupRows({
  category,
  colSpan,
  children,
}: {
  category: string;
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <tr className="bg-neutral-100/80">
        <td colSpan={colSpan} className="px-5 py-2 text-[10px] font-extrabold uppercase tracking-widest text-neutral-600">
          {category}
        </td>
      </tr>
      {children}
    </>
  );
}
