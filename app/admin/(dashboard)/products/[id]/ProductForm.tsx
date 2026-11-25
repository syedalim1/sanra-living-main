"use client";

import { useActionState, useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, Plus, Save, X } from "lucide-react";
import AdminToast from "@/components/admin/Toast";
import { saveProductAction } from "@/app/admin/(dashboard)/products/actions";
import {
  MATERIAL_TAGS,
  TOP_CATEGORIES,
  WARRANTY_PRESETS,
} from "@/lib/admin/validation";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/catalogCategories";
import { formatBytes } from "@/lib/imageCompression";
import { adminImageUrl } from "@/lib/media/paths";
import type {
  AdminPricingRule,
  AdminProduct,
  AdminActionResult,
} from "@/lib/admin/product-types";

function valueOrEmpty(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

const initialState: AdminActionResult = {};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  TABLE: "Table",
  CHAIR: "Chair",
  STAND: "Stand",
  RACK: "Rack",
  SS_UNIT: "SS Unit",
  CHAIR_TABLE_SET: "Chair & Table Combo Set",
  BENCH_DESK: "School / College / Mess Dual Desk",
  COT_BUNK: "Hostel Cot / Bunk Bed",
  TROLLEY: "Utility / Medical / Industrial Trolley",
  CUSTOM: "Custom Product Type",
};
const TOP_CATEGORY_LABELS: Record<string, string> = {
  STONE: "Granite Top",
  WOOD: "Wood Top",
};
const FRAME_MATERIAL_LABELS: Record<string, string> = {
  MS: "MS - Mild Steel",
  SS: "SS - Stainless Steel",
};
const DEFAULT_WARRANTY: Record<string, string> = {
  MS: WARRANTY_PRESETS.MS,
  SS: WARRANTY_PRESETS.SS,
};

function normalizeWarranty(text: string | null | undefined, frameMaterial: string): string {
  if (!text) return DEFAULT_WARRANTY[frameMaterial] ?? WARRANTY_PRESETS.MS;
  if (/10-Yr MIG/i.test(text) || /MIG Structural/i.test(text)) {
    return WARRANTY_PRESETS.MS;
  }
  return text;
}
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

function ImageDropField({
  name,
  removeName,
  label,
  helper,
  currentUrl,
}: {
  name: string;
  removeName: string;
  label: string;
  helper: string;
  currentUrl: string | null;
}) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const hasExisting = Boolean(currentUrl && currentUrl !== PRODUCT_PLACEHOLDER);
  const shownUrl = previewUrl ?? (removeExisting ? null : hasExisting ? adminImageUrl(currentUrl) : null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function releaseObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function applyFile(file: File | undefined) {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Images must be 8 MB or smaller.");
      return;
    }

    setError(null);
    setRemoveExisting(false);
    setSelectedName(file.name);
    setSelectedSize(file.size);

    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }

    releaseObjectUrl();
    const preview = URL.createObjectURL(file);
    objectUrlRef.current = preview;
    setPreviewUrl(preview);


  }

  function clearSelection() {
    releaseObjectUrl();
    setPreviewUrl(null);
    setSelectedName(null);
    setSelectedSize(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void applyFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        {hasExisting && !selectedName && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700">
            Uploaded
          </span>
        )}
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative aspect-[4/3] rounded-lg border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer transition-colors ${
          dragging ? "border-[#111111] bg-neutral-100" : "border-neutral-300 bg-[#F5F5F7]"
        }`}
      >
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownUrl} alt={label} className="w-full h-full object-contain" />
        ) : (
          <div className="px-4 text-center space-y-1">
            <ImagePlus className="w-6 h-6 text-neutral-400 mx-auto" />
            <p className="text-[11px] font-semibold text-neutral-600">Drop an image here</p>
            <p className="text-[10px] text-neutral-500">JPG, PNG or WEBP · max 8 MB</p>
          </div>
        )}

        {previewUrl && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              clearSelection();
            }}
            aria-label="Clear selected image"
            className="absolute top-2 right-2 p-1 rounded-full bg-white/90 border border-neutral-200 text-neutral-600 hover:text-black"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void applyFile(event.target.files?.[0])}
        className="sr-only"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
        >
          <ImagePlus className="w-3 h-3" />
          {selectedName ? "Change image" : hasExisting ? "Replace image" : "Choose image"}
        </button>

        {selectedName && (
          <span className="text-[10px] text-neutral-500 truncate max-w-[220px]">
            {selectedName}
            {selectedSize != null ? " · " + formatBytes(selectedSize) : ""}
          </span>
        )}
      </div>

      <p className="text-[10px] text-neutral-500">{helper}</p>

      {hasExisting && !selectedName && (
        <label className="inline-flex items-center gap-2 text-[10px] font-semibold text-neutral-600">
          <input
            type="checkbox"
            name={removeName}
            checked={removeExisting}
            onChange={(event) => setRemoveExisting(event.target.checked)}
            className="w-3.5 h-3.5 accent-black"
          />
          Remove current image on save
        </label>
      )}

      {error && <p className="text-[10px] font-semibold text-red-700">{error}</p>}
    </div>
  );
}

const PRODUCT_TYPE_OPTIONS = ["CHAIR", "TABLE", "CHAIR_TABLE_SET"] as const;
const PRODUCT_TYPE_OPTION_SET = new Set<string>(PRODUCT_TYPE_OPTIONS);
const CATEGORY_PRODUCT_TYPE: Record<string, string> = {
  "SS & MS Chairs": "CHAIR",
  "SS & MS Tables": "TABLE",
  "SS & MS Chair & Table Sets": "CHAIR_TABLE_SET",
};

const TOP_CATEGORY_PRODUCT_TYPES = new Set([
  "TABLE",
  "CHAIR_TABLE_SET",
  "BENCH_DESK",
]);

export default function ProductForm({
  product,
  pricing,
}: {
  product: AdminProduct | null;
  pricing: AdminPricingRule | null;
}) {
  const initialCategory = product?.category ?? PRODUCT_CATEGORY_OPTIONS[0].value;
  const initialProductType =
    (product?.product_type && PRODUCT_TYPE_OPTION_SET.has(product.product_type)
      ? product.product_type
      : CATEGORY_PRODUCT_TYPE[initialCategory]) ?? "CHAIR";
  const initialFrameMaterial = (product?.frame_material ?? "MS").toUpperCase();

  const [state, formAction, pending] = useActionState(saveProductAction, initialState);
  const [productType, setProductType] = useState(initialProductType);
  const [category, setCategory] = useState(initialCategory);
  const [frameMaterial, setFrameMaterial] = useState(
    FRAME_MATERIAL_LABELS[initialFrameMaterial] ? initialFrameMaterial : "MS"
  );
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [warranty, setWarranty] = useState(
    normalizeWarranty(product?.warranty_text, initialFrameMaterial)
  );
  const [topCategories, setTopCategories] = useState<string[]>(() => {
    const filtered = (product?.allowed_top_categories ?? [])
      .map((entry) => (entry === "GRANITE" ? "STONE" : entry))
      .filter((entry) => (TOP_CATEGORIES as readonly string[]).includes(entry));
    if (filtered.length > 0) return filtered;
    return TOP_CATEGORY_PRODUCT_TYPES.has(initialProductType) ? ["WOOD", "STONE"] : [];
  });
  const [materialTags, setMaterialTags] = useState<string[]>(() => {
    const tags = [...(product?.material_tags ?? [])];
    if (!tags.includes(frameMaterial)) tags.push(frameMaterial);
    return tags;
  });
  const [closedError, setClosedError] = useState<string | null>(null);

  const combo = (pricing?.combo_config ?? {}) as Record<string, unknown>;

  const isEdit = Boolean(product);
  const isComboType =
    productType === "CHAIR_TABLE_SET" || productType === "BENCH_DESK";
  const showTopCategories = TOP_CATEGORY_PRODUCT_TYPES.has(productType);
  const showTopPrices = showTopCategories;
  const hasLegacyCategory = Boolean(
    product?.category &&
      !PRODUCT_CATEGORY_OPTIONS.some((option) => option.value === product.category)
  );

  function toggleTopCategory(value: string) {
    setTopCategories((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]
    );
  }

  function toggleMaterialTag(tag: string) {
    setMaterialTags((current) =>
      current.includes(tag)
        ? current.filter((entry) => entry !== tag)
        : [...current, tag]
    );
  }

  function updateProductType(nextType: string) {
    if (nextType === productType) return;
    setProductType(nextType);
    if (nextType === "TABLE" || nextType === "CHAIR_TABLE_SET") {
      setTopCategories((current) =>
        current.length === 0 ? ["WOOD", "STONE"] : current
      );
    }
  }

  function handleCategoryChange(nextCategory: string) {
    setCategory(nextCategory);
    const nextType = CATEGORY_PRODUCT_TYPE[nextCategory];
    if (nextType) updateProductType(nextType);
  }

  function handleFrameMaterialChange(nextMaterial: string) {
    setFrameMaterial(nextMaterial);
    setMaterialTags((current) =>
      current.includes(nextMaterial) ? current : [...current, nextMaterial]
    );
    const nextDefault = DEFAULT_WARRANTY[nextMaterial] ?? WARRANTY_PRESETS.MS;
    const isKnownPreset =
      warranty === WARRANTY_PRESETS.MS || warranty === WARRANTY_PRESETS.SS;
    if (!isEdit || isKnownPreset) {
      setWarranty(nextDefault);
    }
  }

  function generateSku() {
    const base = `${category}-${name}`
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 34);
    const suffix = Math.floor(Math.random() * 90 + 10);
    setSku(`${base || "SANRA-PRODUCT"}-${suffix}`);
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      {(product?.use_cases ?? []).map((useCase) => (
        <input key={useCase} type="hidden" name="use_cases" value={useCase} />
      ))}

      {state.error && state.error !== closedError && (
        <AdminToast
          kind="error"
          message={state.error}
          onClose={() => setClosedError(state.error ?? null)}
        />
      )}

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Basic Details</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Public catalog identity and display attributes.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                SKU
              </span>
              {!isEdit && (
                <button
                  type="button"
                  onClick={generateSku}
                  className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 underline underline-offset-2"
                >
                  Auto-Generate
                </button>
              )}
            </span>
            <input
              name="sku"
              value={sku}
              onChange={(event) => setSku(event.target.value.toUpperCase())}
              readOnly={isEdit}
              required
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="IMS-CF-42"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-black read-only:bg-neutral-100 read-only:text-neutral-500"
            />
            <span className="block text-[10px] text-neutral-500">
              {isEdit
                ? "SKU is permanent after creation."
                : "Uppercase letters, numbers and hyphens. Example: IMS-CF-42."}
            </span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Name
            </span>
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Category
            </span>
            <select
              name="category"
              value={category}
              onChange={(event) => handleCategoryChange(event.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {hasLegacyCategory && (
                <option value={product?.category ?? ""}>{product?.category}</option>
              )}
              {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Frame material
            </span>
            <select
              name="frame_material"
              value={frameMaterial}
              onChange={(event) => handleFrameMaterialChange(event.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="MS">{FRAME_MATERIAL_LABELS.MS}</option>
              <option value="SS">{FRAME_MATERIAL_LABELS.SS}</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Product type
            </span>
            <select
              name="product_type"
              value={productType}
              onChange={(event) => updateProductType(event.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {PRODUCT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {PRODUCT_TYPE_LABELS[type] ?? type}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Base length (ft)
            </span>
            <input
              name="base_length_ft"
              type="number"
              min="1"
              step="0.01"
              defaultValue={valueOrEmpty(product?.base_length_ft)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Base width (ft)
            </span>
            <input
              name="base_width_ft"
              type="number"
              min="1"
              step="0.01"
              defaultValue={valueOrEmpty(product?.base_width_ft)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Base height (ft)
            </span>
            <input
              name="base_height_ft"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product?.base_height_ft ?? 2.5}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Short description
            </span>
            <textarea
              name="short_description"
              rows={3}
              defaultValue={product?.short_description ?? ""}
              placeholder="e.g. 4 x 2 ft table, 1.5 inch square tube, 16 gauge, 200 kg load"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y"
            />
            <span className="block text-[10px] text-neutral-500">
              Size, pipe gauge and other quick notes in plain text.
            </span>
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Pipe spec / gauge
            </span>
            <input
              name="pipe_spec"
              defaultValue={pricing?.pipe_spec ?? ""}
              placeholder="1.5 inch Square Tube, 16 Gauge"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Sort order
            </span>
            <input
              name="sort_order"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.sort_order ?? 100}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Warranty text
            </span>
            <input
              name="warranty_text"
              value={warranty}
              onChange={(event) => setWarranty(event.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[WARRANTY_PRESETS.MS, WARRANTY_PRESETS.SS].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setWarranty(option)}
                  className="px-2 py-1 rounded border border-neutral-300 text-[9px] font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  {option}
                </button>
              ))}
            </div>
            <span className="block text-[10px] text-neutral-500">
              Default for {FRAME_MATERIAL_LABELS[frameMaterial]} is{" "}
              {DEFAULT_WARRANTY[frameMaterial]}.
            </span>
          </label>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={product?.is_active ?? true}
                className="w-4 h-4 accent-black"
              />
              <span className="text-xs font-semibold text-neutral-800">Active in public catalog</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200">
              <input
                type="checkbox"
                name="is_knockdown_available"
                defaultChecked={product?.is_knockdown_available ?? true}
                className="w-4 h-4 accent-black"
              />
              <span className="text-xs font-semibold text-neutral-800">
                Flat-pack knock-down available
              </span>
            </label>
          </div>
        </div>
      </section>

      {isComboType && (
        <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-[#111111]">
              Combo / Set Configuration
            </h2>
            <p className="text-[11px] text-neutral-500 mt-1">
              Set composition used for chair &amp; table combos.
            </p>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Set configuration
              </span>
              <select
                name="set_configuration"
                defaultValue={String(combo.set_configuration ?? "1 Table + 4 Chairs")}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
              >
                <option>1 Table + 2 Chairs</option>
                <option>1 Table + 4 Chairs</option>
                <option>1 Table + 6 Chairs</option>
                <option>1 Table + 8 Chairs</option>
                <option>Custom Set</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Chair / seating type
              </span>
              <select
                name="seating_type"
                defaultValue={String(combo.seating_type ?? "MS Welded Chair")}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
              >
                <option>MS Welded Chair</option>
                <option>SS Welded Chair</option>
                <option>High-Density Molded Chair</option>
                <option>Bar Stool</option>
                <option>Attached Bench</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Chair quantity
              </span>
              <input
                name="chair_quantity"
                type="number"
                min="0"
                step="1"
                defaultValue={Number(combo.chair_quantity ?? 4)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
              />
            </label>
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Product Images</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            {isEdit
              ? "Replace or remove images and save. The server keeps the original private and creates a protected WebP."
              : "Add images when you create the product. The server keeps the originals private."}
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ImageDropField
            name="main_image"
            removeName="remove_main_image"
            label="Main image"
            helper="Primary catalog and product page image."
            currentUrl={product?.main_image_url ?? null}
          />
          <ImageDropField
            name="hover_image"
            removeName="remove_hover_image"
            label="Hover blueprint"
            helper="Optional dimension or blueprint view."
            currentUrl={product?.hover_blueprint_img ?? null}
          />

          {showTopCategories && topCategories.includes("STONE") && (
            <ImageDropField
              name="top_stone_image"
              removeName="remove_top_stone_image"
              label="Granite / stone top image"
              helper="Shown when the customer picks Granite Top."
              currentUrl={product?.top_category_images?.STONE ?? null}
            />
          )}
          {showTopCategories && topCategories.includes("WOOD") && (
            <ImageDropField
              name="top_wood_image"
              removeName="remove_top_wood_image"
              label="Wood top image"
              helper="Shown when the customer picks Rubberwood or Plywood."
              currentUrl={product?.top_category_images?.WOOD ?? null}
            />
          )}

        </div>

        <div className="px-5 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Extra gallery / real factory photos (up to 4)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((index) => (
              <label
                key={index}
                className="space-y-1 text-[10px] font-semibold text-neutral-600"
              >
                Gallery image {index}
                <input
                  type="file"
                  name={`gallery_image_${index}`}
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-[10px]"
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Catalog Tags</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Material tags and, for tables and sets, the top options offered.
          </p>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Material tags
            </p>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_TAGS.map((tag) => (
                <label
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-200 text-[11px] font-semibold text-neutral-700"
                >
                  <input
                    type="checkbox"
                    name="material_tags"
                    value={tag}
                    checked={materialTags.includes(tag)}
                    onChange={() => toggleMaterialTag(tag)}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          {showTopCategories && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                Available tops
              </p>
              <p className="text-[10px] text-neutral-500 mb-2">
                Only Granite and Wood tops are offered. Ticking a top reveals its
                image upload card above.
              </p>
              <div className="flex flex-wrap gap-2">
                {TOP_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-200 text-[11px] font-semibold text-neutral-700"
                  >
                    <input
                      type="checkbox"
                      name="allowed_top_categories"
                      value={category}
                      checked={topCategories.includes(category)}
                      onChange={() => toggleTopCategory(category)}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    {TOP_CATEGORY_LABELS[category] ?? category}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Pricing</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Enter the selling price directly. No private costing fields.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Direct price (₹)
            </span>
            <input
              name="direct_price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={valueOrEmpty(pricing?.direct_price)}
              placeholder="e.g. 4999"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <span className="block text-[10px] text-neutral-500">
              Used as the selling price for this product.
            </span>
          </label>

          {showTopPrices && (
            <>
              <label className="space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Granite Top Price (₹)
                </span>
                <input
                  name="granite_top_price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={valueOrEmpty(pricing?.granite_top_price)}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <span className="block text-[10px] text-neutral-500">
                  Shown when Granite Top is selected.
                </span>
              </label>

              <label className="space-y-1.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Wood Top Price (₹)
                </span>
                <input
                  name="wood_top_price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={valueOrEmpty(pricing?.wood_top_price)}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <span className="block text-[10px] text-neutral-500">
                  Shown when Wood Top is selected.
                </span>
              </label>
            </>
          )}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        {!isEdit && (
          <button
            type="submit"
            name="after_save"
            value="new"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-neutral-300 bg-white text-[#111111] text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-100 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Create &amp; Add Another
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold uppercase tracking-wider disabled:bg-neutral-400"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {pending ? "Saving..." : isEdit ? "Save Product" : "Create Product"}
        </button>
      </div>
    </form>
  );
}
