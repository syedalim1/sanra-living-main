"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  MessageSquare,
  Plus,
  Phone,
  ShieldCheck,
  Truck,
  Factory,
  AlertCircle,
} from "lucide-react";
import WatermarkedImage from "@/components/WatermarkedImage";
import { addEnquiryItem } from "@/lib/enquiryBasket";
import type { PublicProductVariant } from "@/lib/variants/types";
import type { PublicBuildCategory } from "@/lib/buildCategory";

export interface VariantConfiguratorProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  product_type: string;
  base_length_ft: number;
  base_width_ft: number;
  base_height_ft: number;
  main_image_url: string;
  gallery_images: string[];
  short_description: string | null;
  warranty_text: string;
  use_cases?: string[];
  seo_h1?: string | null;
  image_alt_text?: string | null;
}

export interface RelatedCatalogProduct {
  sku: string;
  name: string;
  category: string;
  from_price: number | null;
}

interface VariantPriceResponse {
  variant_id: string;
  variant_code: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  price_basis: "GST_INCLUSIVE" | "GST_EXCLUSIVE" | null;
  gst_rate: number | null;
  gst_amount: number | null;
  availability: "IN_STOCK" | "MADE_TO_ORDER" | "QUOTE_ONLY" | "UNAVAILABLE";
  lead_time_days: number | null;
  requires_quote: boolean;
  quote_reason: string | null;
}

const BUILD_DESCRIPTIONS: Record<PublicBuildCategory, string> = {
  Economy: "Budget-conscious furniture configuration.",
  Standard: "Regular-use furniture configuration.",
  "Heavy Duty": "Upgraded frame configuration.",
};

const BUILD_ORDER: PublicBuildCategory[] = ["Economy", "Standard", "Heavy Duty"];

const SURFACE_SWATCHES: Record<string, string> = {
  Rubberwood: "#C28B38",
  Plywood: "#9E6B40",
  "Particle Board": "#B89B72",
  Granite: "#1C1C1E",
  "Cushion / Upholstery": "#27272A",
  "Metal Seat": "#71717A",
  "Frame Only": "#52525B",
};

export default function VariantConfigurator({
  product,
  variants,
  moqQty,
  specialQuoteQty,
  whatsappNumber,
  relatedProducts,
}: {
  product: VariantConfiguratorProduct;
  variants: PublicProductVariant[];
  moqQty: number | null;
  specialQuoteQty: number | null;
  whatsappNumber: string;
  relatedProducts: RelatedCatalogProduct[];
}) {
  const materials = useMemo(
    () =>
      (["SS", "MS"] as const).filter((mat) =>
        variants.some((v) => v.frame_material === mat)
      ),
    [variants]
  );

  const [selectedMaterial, setSelectedMaterial] = useState<"SS" | "MS">(
    materials[0] ?? "MS"
  );

  const materialVariants = useMemo(
    () => variants.filter((v) => v.frame_material === selectedMaterial),
    [variants, selectedMaterial]
  );

  const surfaces = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of materialVariants) {
      const label = v.surface_label ?? "Standard";
      if (!seen.has(label)) seen.set(label, v.surface_option_id ?? "");
    }
    return [...seen.keys()];
  }, [materialVariants]);

  const [selectedSurface, setSelectedSurface] = useState<string>(
    surfaces[0] ?? "Standard"
  );
  const effectiveSurface = surfaces.includes(selectedSurface)
    ? selectedSurface
    : (surfaces[0] ?? "Standard");

  const surfaceVariants = useMemo(
    () =>
      materialVariants.filter(
        (v) => (v.surface_label ?? "Standard") === effectiveSurface
      ),
    [materialVariants, effectiveSurface]
  );

  const sizes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of surfaceVariants) {
      if (!seen.has(v.size_code)) seen.set(v.size_code, v.size_label);
    }
    return [...seen.entries()].map(([code, label]) => ({ code, label }));
  }, [surfaceVariants]);

  const [selectedSize, setSelectedSize] = useState<string>(
    sizes[0]?.code ?? "STANDARD"
  );
  const effectiveSize = sizes.some((s) => s.code === selectedSize)
    ? selectedSize
    : (sizes[0]?.code ?? "STANDARD");

  const sizeVariants = useMemo(
    () => surfaceVariants.filter((v) => v.size_code === effectiveSize),
    [surfaceVariants, effectiveSize]
  );

  const buildOptions = useMemo(() => {
    return BUILD_ORDER.flatMap((label) => {
      const match = sizeVariants.find((v) => v.build_category_label === label);
      return match ? [{ label, variant: match }] : [];
    });
  }, [sizeVariants]);

  const [selectedBuild, setSelectedBuild] = useState<PublicBuildCategory>(
    buildOptions[0]?.label ?? "Standard"
  );
  const effectiveBuild = buildOptions.some((b) => b.label === selectedBuild)
    ? selectedBuild
    : (buildOptions[0]?.label ?? "Standard");

  const activeVariant =
    buildOptions.find((b) => b.label === effectiveBuild)?.variant ??
    sizeVariants[0] ??
    variants[0];

  const [quantity, setQuantity] = useState<number>(moqQty && moqQty > 1 ? moqQty : 1);
  const [buildPrices, setBuildPrices] = useState<
    Record<string, VariantPriceResponse>
  >({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [addedToList, setAddedToList] = useState(false);

  const gallery = useMemo(() => {
    const imgs = [
      activeVariant?.variant_image_url,
      product.main_image_url,
      ...product.gallery_images,
    ].filter((u): u is string => Boolean(u));
    return [...new Set(imgs)];
  }, [activeVariant, product.main_image_url, product.gallery_images]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const activeImage =
    selectedImage && gallery.includes(selectedImage)
      ? selectedImage
      : (gallery[0] ?? product.main_image_url);

  // Fetch authoritative server-side prices for Economy, Standard, Heavy Duty simultaneously
  useEffect(() => {
    if (buildOptions.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingPrices(true);
      try {
        const responses = await Promise.all(
          buildOptions.map(async ({ variant }) => {
            const res = await fetch("/api/price", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                variant_id: variant.id,
                quantity,
              }),
            });
            if (!res.ok) return null;
            return (await res.json()) as VariantPriceResponse;
          })
        );
        if (cancelled) return;
        const nextMap: Record<string, VariantPriceResponse> = {};
        for (const item of responses) {
          if (item?.variant_id) nextMap[item.variant_id] = item;
        }
        setBuildPrices(nextMap);
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [buildOptions, quantity]);

  const activePrice = activeVariant ? buildPrices[activeVariant.id] : undefined;
  const isSpecialBulk =
    specialQuoteQty != null && quantity >= specialQuoteQty;

  function handleAddToEnquiryList() {
    if (!activeVariant) return;
    addEnquiryItem({
      sku: product.sku,
      name: product.name,
      variant_id: activeVariant.id,
      variant_code: activeVariant.variant_code,
      frame_material:
        selectedMaterial === "SS" ? "Stainless Steel" : "Mild Steel",
      build_category: activeVariant.build_category_label,
      surface: activeVariant.surface_label,
      size: activeVariant.size_label,
      quantity,
      product_url: `${window.location.origin}/products/${encodeURIComponent(product.sku.toLowerCase())}`,
      added_at: new Date().toISOString(),
    });
    setAddedToList(true);
    setTimeout(() => setAddedToList(false), 2500);
  }

  function whatsappUrl(): string {
    const cleanNumber = whatsappNumber.replace(/[^\d]/g, "");
    const lines = [
      `Hi SANRA LIVING, I'd like a factory quotation for:`,
      `Product: ${product.name} (${product.sku})`,
      `Frame Material: ${selectedMaterial === "SS" ? "Stainless Steel" : "Mild Steel"}`,
      `Build Category: ${activeVariant?.build_category_label ?? selectedBuild}`,
      ...(activeVariant?.surface_label
        ? [`Surface: ${activeVariant.surface_label}`]
        : []),
      `Size: ${activeVariant?.size_label ?? selectedSize}`,
      `Quantity: ${quantity}`,
      ...(activePrice && !activePrice.requires_quote && activePrice.unit_price != null
        ? [
            `Displayed Price: ₹${activePrice.unit_price.toLocaleString("en-IN")} / pc (${activePrice.price_basis === "GST_INCLUSIVE" ? "Incl. GST" : "Excl. GST"})`,
            `Estimated Total: ₹${(activePrice.total_price ?? 0).toLocaleString("en-IN")}`,
          ]
        : [`Status: Quotation Requested`]),
      `Link: ${typeof window !== "undefined" ? window.location.href : ""}`,
    ];
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left: Product Gallery */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-3">
          <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-[#F5F5F7] aspect-square">
            <WatermarkedImage
              key={activeImage}
              src={activeImage}
              fallbackSrc={product.main_image_url}
              alt={product.image_alt_text || product.name}
              aspectRatio="square"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((img) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border shrink-0 ${
                    activeImage === img
                      ? "border-neutral-900 ring-1 ring-neutral-900"
                      : "border-neutral-200"
                  }`}
                >
                  <WatermarkedImage
                    src={img}
                    alt={product.name}
                    aspectRatio="square"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Smart Variant Configurator */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
              <span>{product.category}</span>
              <span>·</span>
              <span className="font-mono text-neutral-800">{product.sku}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight mt-1">
              {product.seo_h1 || product.name}
            </h1>
            {product.short_description && (
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                {product.short_description}
              </p>
            )}
          </div>

          {/* Live Price & Status Summary Box */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-white space-y-2">
            {loadingPrices ? (
              <p className="text-sm font-semibold text-neutral-500">
                Updating factory price...
              </p>
            ) : activePrice &&
              !activePrice.requires_quote &&
              activePrice.unit_price != null ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-2xl font-black text-[#111111]">
                      ₹{activePrice.unit_price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-neutral-500 ml-1">
                      / piece ·{" "}
                      {activePrice.price_basis === "GST_INCLUSIVE"
                        ? `Incl. ${activePrice.gst_rate ?? 18}% GST`
                        : `Excl. ${activePrice.gst_rate ?? 18}% GST`}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-neutral-800">
                    Est. Total: ₹{(activePrice.total_price ?? 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-neutral-600 pt-1">
                  <span>Qty: {quantity}</span>
                  {moqQty != null && <span>MOQ: {moqQty} pcs</span>}
                  {activePrice.lead_time_days != null && (
                    <span>Lead time: {activePrice.lead_time_days} days</span>
                  )}
                  <span>
                    {activePrice.availability === "IN_STOCK"
                      ? "In Stock"
                      : "Made to Order"}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#111111]">
                    Request Quote
                  </p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {isSpecialBulk
                      ? `Orders of ${specialQuoteQty}+ pieces qualify for a custom bulk factory quotation.`
                      : activePrice?.quote_reason === "BELOW_MOQ" && moqQty
                        ? `Minimum bulk order is ${moqQty} pieces. Request a custom quote for ${quantity} piece(s).`
                        : "Request a tailored factory quotation for this configuration."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 1. Frame Material */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
              1. Frame Material
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {materials.map((mat) => (
                <button
                  key={mat}
                  type="button"
                  onClick={() => setSelectedMaterial(mat)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedMaterial === mat
                      ? "border-[#111111] bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <span className="block text-xs font-bold">
                    {mat === "SS" ? "Stainless Steel" : "Mild Steel"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Build Category with Individual Selling Prices */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
              2. Build Category
            </label>
            <div className="space-y-2">
              {buildOptions.map(({ label, variant }) => {
                const bp = buildPrices[variant.id];
                const isSelected = activeVariant?.id === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedBuild(label)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-[#111111] bg-neutral-50 ring-1 ring-[#111111]"
                        : "border-neutral-200 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-bold text-[#111111]">
                        {label}
                      </span>
                      <span className="block text-[11px] text-neutral-500 mt-0.5">
                        {BUILD_DESCRIPTIONS[label]}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-[#111111] shrink-0">
                      {bp && !bp.requires_quote && bp.unit_price != null
                        ? `₹${bp.unit_price.toLocaleString("en-IN")}`
                        : "Request Quote"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Surface Option */}
          {surfaces.length > 0 && surfaces[0] !== "Standard" && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                3. Seat / Tabletop Material
              </label>
              <div className="flex flex-wrap gap-2">
                {surfaces.map((surf) => {
                  const swatch = SURFACE_SWATCHES[surf];
                  const isSelected = effectiveSurface === surf;
                  return (
                    <button
                      key={surf}
                      type="button"
                      onClick={() => setSelectedSurface(surf)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
                        isSelected
                          ? "border-[#111111] bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
                      }`}
                    >
                      {swatch && (
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0"
                          style={{ backgroundColor: swatch }}
                        />
                      )}
                      {surf}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Size */}
          {sizes.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600">
                4. Size &amp; Dimensions
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => setSelectedSize(s.code)}
                    className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
                      selectedSize === s.code || effectiveSize === s.code
                        ? "border-[#111111] bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Finish (if applicable) */}
          {activeVariant?.finish_label && (
            <div className="text-xs text-neutral-700">
              <span className="font-bold uppercase tracking-wider text-neutral-500">
                Finish:{" "}
              </span>
              {activeVariant.finish_label}
            </div>
          )}

          {/* 6. Quantity & MOQ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="variant-qty"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-600"
              >
                5. Quantity
              </label>
              {moqQty != null && (
                <span className="text-[11px] font-semibold text-neutral-500">
                  Bulk MOQ: {moqQty} pcs
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                id="variant-qty"
                type="number"
                min={1}
                max={10000}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value) || 1))
                }
                className="w-28 px-3 py-2 rounded-lg border border-neutral-300 text-sm font-bold"
              />
              {specialQuoteQty != null && (
                <button
                  type="button"
                  onClick={() => setQuantity(specialQuoteQty)}
                  className="px-3 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  {specialQuoteQty}+ pcs Bulk Quote
                </button>
              )}
            </div>
          </div>

          {/* Enquiry Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800"
            >
              <MessageSquare className="w-4 h-4" />
              Request WhatsApp Quote
            </a>
            <button
              type="button"
              onClick={handleAddToEnquiryList}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-xs font-bold hover:bg-neutral-50"
            >
              {addedToList ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Added to Enquiry List
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to Enquiry List
                </>
              )}
            </button>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 sm:col-span-2"
            >
              <Phone className="w-3.5 h-3.5" />
              Contact Factory — SIDCO Coimbatore
            </Link>
          </div>

          {/* Product Details */}
          <div className="pt-4 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-700">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#111111]">Warranty</strong>
                <span>{product.warranty_text}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Truck className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#111111]">Dispatch</strong>
                <span>Coimbatore &amp; Pan-India</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Factory className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#111111]">Manufacturer</strong>
                <span>Indian Make Steel Industries</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-8 border-t border-neutral-200">
          <h2 className="text-lg font-extrabold text-[#111111] tracking-tight mb-4">
            Related Products
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedProducts.map((rel) => (
              <Link
                key={rel.sku}
                href={`/products/${encodeURIComponent(rel.sku.toLowerCase())}`}
                className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition-colors"
              >
                <p className="text-[10px] font-mono text-neutral-500">{rel.sku}</p>
                <p className="text-sm font-bold text-[#111111] mt-1">{rel.name}</p>
                <p className="text-xs font-semibold text-neutral-700 mt-2">
                  {rel.from_price != null
                    ? `From ₹${rel.from_price.toLocaleString("en-IN")}`
                    : "Request Quote"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
