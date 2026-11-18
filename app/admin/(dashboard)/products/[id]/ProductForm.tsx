"use client";

import { useActionState, useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, Plus, Save, X } from "lucide-react";
import AdminToast from "@/components/admin/Toast";
import { saveProductAction } from "@/app/admin/(dashboard)/products/actions";
import {
  MATERIAL_TAGS,
  PRODUCT_TYPES,
  TOP_CATEGORIES,
  USE_CASES,
} from "@/lib/admin/validation";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/catalogCategories";
import { labelForUseCase } from "@/lib/useCases";
import { compressImage, formatBytes } from "@/lib/imageCompression";
import type {
  AdminPricingRule,
  AdminProduct,
  AdminActionResult,
} from "@/lib/admin/product-types";

function valueOrEmpty(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

const initialState: AdminActionResult = {};
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
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<
    { original: number; compressed: number } | null
  >(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const selectionToken = useRef(0);

  const hasExisting = Boolean(currentUrl && currentUrl !== PRODUCT_PLACEHOLDER);
  const shownUrl = previewUrl ?? (removeExisting ? null : hasExisting ? currentUrl : null);

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

  async function applyFile(file: File | undefined) {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Images must be 8 MB or smaller.");
      return;
    }

    const token = ++selectionToken.current;
    setError(null);
    setRemoveExisting(false);
    setCompressionInfo(null);
    setSelectedName(file.name);
    setSelectedSize(file.size);
    setCompressing(true);

    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }

    releaseObjectUrl();
    const preview = URL.createObjectURL(file);
    objectUrlRef.current = preview;
    setPreviewUrl(preview);

    const result = await compressImage(file);
    if (token !== selectionToken.current) return;

    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(result.file);
      inputRef.current.files = transfer.files;
    }

    if (result.compressed) {
      releaseObjectUrl();
      const compressedPreview = URL.createObjectURL(result.file);
      objectUrlRef.current = compressedPreview;
      setPreviewUrl(compressedPreview);
      setSelectedName(result.file.name);
    }

    setSelectedSize(result.compressedSize);
    setCompressionInfo(
      result.compressed
        ? { original: result.originalSize, compressed: result.compressedSize }
        : null
    );
    setCompressing(false);
  }

  function clearSelection() {
    selectionToken.current += 1;
    releaseObjectUrl();
    setPreviewUrl(null);
    setSelectedName(null);
    setSelectedSize(null);
    setCompressionInfo(null);
    setCompressing(false);
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

        {compressing && (
          <span className="text-[10px] font-semibold text-amber-700">
            Compressing for faster upload…
          </span>
        )}

        {!compressing && selectedName && (
          <span className="text-[10px] text-neutral-500 truncate max-w-[220px]">
            {selectedName}
            {compressionInfo
              ? ` · ${formatBytes(compressionInfo.original)} → ${formatBytes(
                  compressionInfo.compressed
                )}`
              : selectedSize != null
              ? ` · ${formatBytes(selectedSize)}`
              : ""}
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

export default function ProductForm({
  product,
  pricing,
}: {
  product: AdminProduct | null;
  pricing: AdminPricingRule | null;
}) {
  const [state, formAction, pending] = useActionState(saveProductAction, initialState);
  const [productType, setProductType] = useState(product?.product_type ?? "TABLE");
  const [closedError, setClosedError] = useState<string | null>(null);

  const isEdit = Boolean(product);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={product?.id ?? ""} />

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
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              SKU
            </span>
            <input
              name="sku"
              defaultValue={product?.sku ?? ""}
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
              defaultValue={product?.name ?? ""}
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
              defaultValue={product?.category ?? PRODUCT_CATEGORY_OPTIONS[0].value}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {product?.category &&
                !PRODUCT_CATEGORY_OPTIONS.some(
                  (option) => option.value === product.category
                ) && <option value={product.category}>{product.category}</option>}
              {PRODUCT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Product type
            </span>
            <select
              name="product_type"
              value={productType}
              onChange={(event) =>
                setProductType(event.target.value as AdminProduct["product_type"])
              }
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {PRODUCT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
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
              defaultValue={product?.warranty_text ?? "10-Yr MIG Structural Warranty"}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
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

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Product Images</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            {isEdit
              ? "Replace or remove images and save. Photos are compressed in your browser to 1600 px WEBP for faster uploads."
              : "Add images now — they upload when you create the product. Photos are compressed in your browser to 1600 px WEBP before upload."}
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
        </div>
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Catalog Filters</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Use cases, material tags and allowed top categories.
          </p>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Use cases
            </p>
            <div className="flex flex-wrap gap-2">
              {USE_CASES.map((useCase) => (
                <label
                  key={useCase}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-200 text-[11px] font-semibold text-neutral-700"
                >
                  <input
                    type="checkbox"
                    name="use_cases"
                    value={useCase}
                    defaultChecked={product?.use_cases.includes(useCase)}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  {labelForUseCase(useCase)}
                </label>
              ))}
            </div>
          </div>

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
                    defaultChecked={product?.material_tags.includes(tag)}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Allowed top categories
            </p>
            <p className="text-[10px] text-neutral-500 mb-2">
              Only used by TABLE products. Disabled for other product types.
            </p>
            <div className="flex flex-wrap gap-2">
              {TOP_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-200 text-[11px] font-semibold ${
                    productType === "TABLE" ? "text-neutral-700" : "text-neutral-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="allowed_top_categories"
                    value={category}
                    disabled={productType !== "TABLE"}
                    defaultChecked={product?.allowed_top_categories.includes(category)}
                    className="w-3.5 h-3.5 accent-black"
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#111111]">Private Costing Block</h2>
              <p className="text-[11px] text-neutral-500 mt-1">
                This never appears on the public site.
              </p>
            </div>
            <span className="inline-block px-2 py-1 rounded bg-neutral-900 text-white text-[9px] font-bold uppercase tracking-widest">
              Admin only
            </span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Metal weight (kg)
            </span>
            <input
              name="base_pipe_weight_18g_kg"
              type="number"
              min="0"
              step="0.01"
              defaultValue={valueOrEmpty(pricing?.base_pipe_weight_18g_kg)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Top / seat / shelf area (sq.ft)
            </span>
            <input
              name="top_area_sqft"
              type="number"
              min="0"
              step="0.01"
              defaultValue={valueOrEmpty(pricing?.top_area_sqft)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <span className="block text-[9px] text-neutral-500">
              Seat area for chairs, shelf area for racks, top area for tables.
            </span>
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Consumables cost
            </span>
            <input
              name="consumables_cost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={valueOrEmpty(pricing?.consumables_cost)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Labor cost
            </span>
            <input
              name="labor_cost"
              type="number"
              min="0"
              step="0.01"
              defaultValue={valueOrEmpty(pricing?.labor_cost)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Overhead %
            </span>
            <input
              name="overhead_pct"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={valueOrEmpty(pricing?.overhead_pct)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Retail margin %
            </span>
            <input
              name="retail_margin_pct"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={valueOrEmpty(pricing?.retail_margin_pct)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              B2B margin %
            </span>
            <input
              name="b2b_margin_pct"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={valueOrEmpty(pricing?.b2b_margin_pct)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>
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
