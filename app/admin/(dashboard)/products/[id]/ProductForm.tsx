"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, Plus, Save, X } from "lucide-react";
import { saveProductAction } from "@/app/admin/(dashboard)/products/actions";
import {
  MATERIAL_TAGS,
  PRODUCT_TYPES,
  TOP_CATEGORIES,
  WARRANTY_PRESETS,
} from "@/lib/admin/validation";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/catalogCategories";
import { formatBytes } from "@/lib/imageCompression";
import { adminImageUrl } from "@/lib/media/paths";
import { PRODUCT_PLACEHOLDER } from "@/lib/admin/product-types";
import type {
  AdminPricingRule,
  AdminProduct,
  AdminActionResult,
} from "@/lib/admin/product-types";

import { EditorSection, editorInput, editorPrimary, editorSecondary } from "./EditorSection";

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
      clearSelection();
      setError("Use a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      clearSelection();
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
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-700">
          {label}
        </p>
        {hasExisting && !selectedName && (
          <span className="text-xs font-medium text-emerald-700">
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
        className={`relative h-36 rounded-xl border border-dashed overflow-hidden flex items-center justify-center cursor-pointer transition-colors ${
          dragging ? "border-[#111111] bg-neutral-100" : "border-neutral-300 bg-[#F5F5F7]"
        }`}
      >
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownUrl} alt={label} className="w-full h-full object-contain" />
        ) : (
          <div className="px-4 text-center space-y-1">
            <ImagePlus className="w-6 h-6 text-neutral-400 mx-auto" />
            <p className="text-sm font-semibold text-neutral-600">Add an image</p>
            <p className="text-xs text-neutral-500">JPG, PNG or WEBP · max 8 MB</p>
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
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-lg border border-neutral-300 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
        >
          <ImagePlus className="w-3 h-3" />
          {selectedName ? "Change image" : hasExisting ? "Replace image" : "Choose image"}
        </button>

        {selectedName && (
          <span className="text-xs text-neutral-500 truncate max-w-[220px]">
            {selectedName}
            {selectedSize != null ? " · " + formatBytes(selectedSize) : ""}
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500">{helper}</p>

      {hasExisting && !selectedName && (
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600">
          <input
            type="checkbox"
            name={removeName}
            checked={removeExisting}
            onChange={(event) => setRemoveExisting(event.target.checked)}
            className="size-4 accent-black"
          />
          Remove current image on save
        </label>
      )}

      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}

const CATEGORY_PRODUCT_TYPE: Record<string, string> = {
  "SS & MS Chairs": "CHAIR",
  "SS & MS Tables": "TABLE",
  "SS & MS Chair & Table Sets": "CHAIR_TABLE_SET",
};

const TOP_CATEGORY_PRODUCT_TYPES = new Set(["TABLE", "CHAIR_TABLE_SET", "BENCH_DESK"]);
const LEGACY_PRICES = [
  ["direct_price", "Direct price (₹)"],
  ["granite_top_price", "Granite top price (₹)"],
  ["wood_top_price", "Wood top price (₹)"],
] as const;

export default function ProductForm({
  product,
  pricing,
}: {
  product: AdminProduct | null;
  pricing: AdminPricingRule | null;
}) {
  const initialCategory = product?.category ?? PRODUCT_CATEGORY_OPTIONS[0].value;
  const initialType = product?.product_type ?? CATEGORY_PRODUCT_TYPE[initialCategory] ?? "CHAIR";
  const initialMaterial = product?.frame_material === "SS" ? "SS" : "MS";
  const [state, formAction, pending] = useActionState(saveProductAction, initialState);
  const [category, setCategory] = useState(initialCategory);
  const [productType, setProductType] = useState(initialType);
  const [frameMaterial, setFrameMaterial] = useState(initialMaterial);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [materialTags, setMaterialTags] = useState(product?.material_tags ?? [initialMaterial]);
  const [warranty, setWarranty] = useState(normalizeWarranty(product?.warranty_text, initialMaterial));
  const [editLegacy, setEditLegacy] = useState(false);

  const showTopCategories = TOP_CATEGORY_PRODUCT_TYPES.has(productType);
  const initialTopCategories = product?.allowed_top_categories.map((value) => value === "GRANITE" ? "STONE" : value) ?? TOP_CATEGORIES;
  const combo = pricing?.combo_config ?? {};
  const isCombo = productType === "CHAIR_TABLE_SET" || productType === "BENCH_DESK";

  function updateMaterial(nextMaterial: "SS" | "MS") {
    setFrameMaterial(nextMaterial);
    setMaterialTags((current) => current.includes(nextMaterial) ? current : [...current, nextMaterial]);
    if (Object.values(WARRANTY_PRESETS).some((preset) => warranty === preset)) {
      setWarranty(WARRANTY_PRESETS[nextMaterial]);
    }
  }

  function generateSku() {
    const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32).replace(/-$/, "");
    const suffix = Math.floor(Math.random() * 900 + 100);
    setSku(`SANRA-${base || productType}-${suffix}`);
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const { submitter } = event.nativeEvent as SubmitEvent;
        const data = new FormData(event.currentTarget, submitter);
        startTransition(() => formAction(data));
      }}
      className="space-y-4"
    >
      <input type="hidden" name="id" value={product?.id ?? ""} />
      {(product?.use_cases ?? []).map((useCase) => (
        <input key={useCase} type="hidden" name="use_cases" value={useCase} />
      ))}

      <EditorSection id="information" title="Product information">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Product name
            <input name="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={160} className={editorInput} />
          </label>
          <div>
            <label htmlFor="product-sku" className="text-sm font-semibold">Model number (SKU)</label>
            <div className="flex items-end gap-2">
              <input id="product-sku" name="sku" value={sku} onChange={(event) => setSku(event.target.value.toUpperCase())} readOnly={Boolean(product)} required pattern="[A-Z0-9]+(-[A-Z0-9]+)+" maxLength={50} placeholder="SANRA-CF-42" className={editorInput} />
              {!product && <button type="button" onClick={generateSku} className={editorSecondary}>Generate</button>}
            </div>
          </div>
          <label className="block text-sm font-semibold">
            Category
            <select name="category" value={category} onChange={(event) => {
              setCategory(event.target.value);
              const nextType = CATEGORY_PRODUCT_TYPE[event.target.value];
              if (nextType) setProductType(nextType);
            }} className={editorInput}>
              {product && !PRODUCT_CATEGORY_OPTIONS.some((option) => option.value === product.category) && <option>{product.category}</option>}
              {PRODUCT_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Product type
            <select name="product_type" value={productType} onChange={(event) => setProductType(event.target.value)} className={editorInput}>
              {!PRODUCT_TYPES.some((type) => type === initialType) && <option>{initialType}</option>}
              {PRODUCT_TYPES.map((type) => <option key={type} value={type}>{PRODUCT_TYPE_LABELS[type]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold sm:col-span-2">
            Catalog description
            <textarea name="short_description" rows={3} maxLength={2000} defaultValue={product?.short_description ?? ""} className={editorInput} />
          </label>
        </div>
      </EditorSection>

      <EditorSection id="photos" title="Product photos" description="Uploaded catalog photos receive a SANRA watermark.">
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageDropField key={product?.main_image_url ?? "main"} name="main_image" removeName="remove_main_image" label="Main photo" helper="Used on the product page and catalog." currentUrl={product?.main_image_url ?? null} />
          <ImageDropField key={product?.hover_blueprint_img ?? "hover"} name="hover_image" removeName="remove_hover_image" label="Blueprint" helper="Optional dimension or alternate view." currentUrl={product?.hover_blueprint_img ?? null} />
        </div>
        <details className="mt-4 rounded-xl border border-neutral-200 p-3 sm:p-4">
          <summary className="cursor-pointer text-sm font-semibold">Gallery and surface photos{product?.gallery_images?.length ? ` · ${product.gallery_images.length} in gallery` : ""}</summary>
          {showTopCategories && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ImageDropField key={product?.top_category_images?.STONE ?? "stone"} name="top_stone_image" removeName="remove_top_stone_image" label="Granite top" helper="Shown when a granite top is selected." currentUrl={product?.top_category_images?.STONE ?? null} />
              <ImageDropField key={product?.top_category_images?.WOOD ?? "wood"} name="top_wood_image" removeName="remove_top_wood_image" label="Wood top" helper="Shown when a wood top is selected." currentUrl={product?.top_category_images?.WOOD ?? null} />
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((index) => (
              <label key={`${product?.gallery_images?.join("|") ?? ""}-${index}`} className="min-w-0 text-sm font-medium">
                Gallery photo {index}
                <input type="file" name={`gallery_image_${index}`} accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2" />
              </label>
            ))}
          </div>
        </details>
      </EditorSection>

      <EditorSection id="dimensions" title="Dimensions and materials">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {([
            ["base_length_ft", "Length", product?.base_length_ft],
            ["base_width_ft", "Width", product?.base_width_ft],
            ["base_height_ft", "Height", product?.base_height_ft ?? 2.5],
          ] as const).map(([field, label, value]) => (
            <label key={field} className="min-w-0 text-sm font-semibold">
              {label} <span className="font-normal text-neutral-500">(ft)</span>
              <input name={field} type="number" step="0.01" min="0.01" max="200" required defaultValue={value ?? ""} className={editorInput} />
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Default frame material
            <select name="frame_material" value={frameMaterial} onChange={(event) => updateMaterial(event.target.value === "SS" ? "SS" : "MS")} className={editorInput}>
              {Object.entries(FRAME_MATERIAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Warranty
            <input name="warranty_text" value={warranty} onChange={(event) => setWarranty(event.target.value)} required minLength={2} maxLength={240} className={editorInput} />
          </label>
          <fieldset className="min-w-0">
            <legend className="mb-1 text-sm font-semibold">Catalog material tags</legend>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...MATERIAL_TAGS, ...materialTags])].map((tag) => (
                <label key={tag} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm">
                  <input type="checkbox" name="material_tags" value={tag} checked={materialTags.includes(tag)} onChange={(event) => setMaterialTags((current) => event.target.checked ? [...current, tag] : current.filter((value) => value !== tag))} className="size-4 accent-black" />
                  {tag}
                </label>
              ))}
            </div>
          </fieldset>
          {showTopCategories && (
            <fieldset>
              <legend className="mb-1 text-sm font-semibold">Available tabletops</legend>
              <div className="flex flex-wrap gap-2">
                {TOP_CATEGORIES.map((value) => (
                  <label key={value} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm">
                    <input type="checkbox" name="allowed_top_categories" value={value} defaultChecked={initialTopCategories.includes(value)} className="size-4 accent-black" />
                    {TOP_CATEGORY_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
        <label className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium">
          <input name="is_knockdown_available" type="checkbox" defaultChecked={product?.is_knockdown_available ?? false} className="size-4 accent-black" />
          Offer flat-pack
        </label>
        {isCombo && (
          <div className="mt-4 grid gap-4 border-t border-neutral-100 pt-4 sm:grid-cols-3">
            <label className="text-sm font-semibold">
              Set configuration
              <input name="set_configuration" maxLength={160} defaultValue={String(combo.set_configuration ?? "")} placeholder="1 table + 4 chairs" className={editorInput} />
            </label>
            <label className="text-sm font-semibold">
              Seating type
              <input name="seating_type" maxLength={160} defaultValue={String(combo.seating_type ?? "")} className={editorInput} />
            </label>
            <label className="text-sm font-semibold">
              Chair quantity
              <input name="chair_quantity" type="number" min="0" max="1000" defaultValue={Number(combo.chair_quantity ?? 0)} className={editorInput} />
            </label>
          </div>
        )}
      </EditorSection>

      <details className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:px-5">
        <summary className="cursor-pointer py-1 text-sm font-semibold">Advanced product settings</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Catalog sort order
            <input name="sort_order" type="number" min="0" max="100000" defaultValue={product?.sort_order ?? 100} className={editorInput} />
          </label>
        </div>
        {product && pricing && (
          <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="edit_legacy_prices" checked={editLegacy} onChange={(event) => setEditLegacy(event.target.checked)} className="size-4 accent-black" />
              Edit legacy prices and specifications
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {LEGACY_PRICES.map(([field, label]) => (
                <label key={field} className="text-sm">
                  {label}
                  <input name={field} disabled={!editLegacy} type="number" min="0" max="100000000" step="0.01" placeholder={pricing[field]?.toString() ?? "Unset"} className={editorInput} />
                </label>
              ))}
            </div>
            <label className="block text-sm">
              Internal pipe specification
              <input name="pipe_spec" maxLength={160} disabled={!editLegacy} placeholder={pricing.pipe_spec ?? "Unset"} className={editorInput} />
            </label>
            {editLegacy && <p className="text-xs text-neutral-600">Leave a field blank to keep its current value.</p>}
          </div>
        )}
      </details>

      <div className="flex flex-col items-stretch gap-2 rounded-2xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className={`px-1 text-sm ${state.error ? "text-red-700" : "text-neutral-600"}`}>
          {state.error ?? (state.ok ? "Product details saved." : product ? "Save details before generating variants or publishing." : "Save a draft to unlock variants, costing, and SEO.")}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {!product && (
            <button type="submit" name="after_save" value="new" disabled={pending} className={editorSecondary}>
              <Plus className="size-4" /> Save and add another
            </button>
          )}
          <button type="submit" disabled={pending} className={editorPrimary}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {pending ? "Saving…" : product ? "Save details" : "Create draft"}
          </button>
        </div>
      </div>
    </form>
  );
}
