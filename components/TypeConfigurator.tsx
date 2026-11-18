"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import PlaceholderImage from "@/components/PlaceholderImage";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  FileText,
  Layers,
  Loader2,
  MessageSquare,
  Package,
  Shield,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import PincodeEstimator from "@/components/PincodeEstimator";
import type { ConfigOption } from "@/lib/configuratorOptions";
import {
  buildSelectionKey,
  getGroupOptions,
  isSSSelection,
  selectionParam,
  type NonTableProductType,
  type OptionGroupRow,
} from "@/lib/productTypeConfig";

interface TypeConfiguratorProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  product_type: NonTableProductType;
  base_length_ft: number;
  base_width_ft: number;
  main_image_url: string;
  hover_blueprint_img?: string | null;
  warranty_text: string;
}

interface TypeVisualVariant {
  selection_key?: string | null;
  preview_image_url: string;
  top_material_code?: string | null;
  frame_color?: string | null;
  size_option?: string | null;
}

interface TypeConfiguratorProps {
  product: TypeConfiguratorProduct;
  options: ConfigOption[];
  groups: OptionGroupRow[];
  visualVariants: TypeVisualVariant[];
  fromPrice: number | null;
}

interface PriceState {
  unit_price?: number;
  total_price?: number;
  discount_pct?: number;
  bumper_included?: boolean;
  requires_quote?: boolean;
}

const CHAIR_FRAME_COLORS = new Set(["MATTE_BLACK", "WHITE", "GREY", "GOLD"]);

function visibleOptions(
  productType: NonTableProductType,
  optionGroup: string,
  options: ConfigOption[]
): ConfigOption[] {
  const groupOptions = getGroupOptions(options, optionGroup);
  if (productType === "CHAIR" && optionGroup === "FRAME_COLOR") {
    return groupOptions.filter((option) => CHAIR_FRAME_COLORS.has(option.option_code));
  }
  return groupOptions;
}

function initialSelections(
  productType: NonTableProductType,
  groups: OptionGroupRow[],
  options: ConfigOption[],
  searchParams: URLSearchParams
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const group of groups) {
    if (group.option_group === "QTY_TIER") continue;

    const groupOptions = visibleOptions(productType, group.option_group, options);
    if (groupOptions.length === 0) continue;

    const fromUrl = searchParams.get(selectionParam(group.option_group));
    const defaultCode =
      groupOptions.find((option) => option.option_code === group.default_code)?.option_code ??
      groupOptions[0]?.option_code;

    if (fromUrl && groupOptions.some((option) => option.option_code === fromUrl)) {
      result[group.option_group] = fromUrl;
    } else if (defaultCode) {
      result[group.option_group] = defaultCode;
    }
  }

  if (productType === "CHAIR") {
    if (result.SEAT !== "SEAT_REXINE") {
      delete result.SEAT_COLOR;
    } else if (!result.SEAT_COLOR) {
      result.SEAT_COLOR = "REXINE_BLACK";
    }

    if (result.METAL_TYPE !== "MS_COATED") {
      delete result.FRAME_COLOR;
    } else if (!result.FRAME_COLOR) {
      result.FRAME_COLOR = "MATTE_BLACK";
    }
  }

  return result;
}

function SafeImage({
  src,
  fallback,
  alt,
  className,
  sizes = "100vw",
  priority = false,
}: {
  src: string;
  fallback: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [current, setCurrent] = useState(src);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <PlaceholderImage fill className="h-full w-full border-0" label={alt} />
    );
  }

  return (
    <Image
      src={current}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => {
        if (attempt === 0 && fallback) {
          setCurrent(fallback);
          setAttempt(1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

type BadgeIcon = React.ComponentType<{ className?: string }>;

function featureBadges(
  productType: NonTableProductType,
  selections: Record<string, string>
): Array<{ icon: BadgeIcon; text: string }> {
  const ss = isSSSelection(productType, selections);

  if (productType === "CHAIR") {
    return [
      { icon: ShieldCheck, text: "Load-tested frame" },
      {
        icon: Sparkles,
        text:
          selections.SEAT === "SEAT_REXINE"
            ? "Cushioned comfort seat"
            : selections.SEAT === "SEAT_PERFORATED"
            ? "Ventilated steel seat"
            : "Solid rubberwood seat",
      },
      { icon: Droplets, text: ss ? "Rust-resistant SS" : "Powder-coated finish" },
      {
        icon: Package,
        text: selections.BUILD_TYPE === "KNOCKDOWN" ? "Easy flat-pack" : "Solid factory frame",
      },
    ];
  }

  if (productType === "STAND") {
    return [
      { icon: ShieldCheck, text: "Stable leveling base" },
      { icon: Droplets, text: ss ? "Rust-proof SS 304" : "Powder-coated MS" },
      {
        icon: Truck,
        text: selections.BASE === "BASE_CASTOR" ? "Easy to move" : "Fixed leveling feet",
      },
      {
        icon: Package,
        text: selections.PACK === "PACK_2" ? "Space-saving nesting" : "Compact footprint",
      },
    ];
  }

  if (productType === "RACK") {
    return [
      { icon: ShieldCheck, text: "Strong MIG-welded frame" },
      { icon: Sparkles, text: "Premium finish" },
      {
        icon: Layers,
        text: selections.SHELF === "SH_NONE" ? "Open display frame" : "Shelf-ready",
      },
      { icon: Package, text: "Ready to assemble" },
    ];
  }

  return [
    {
      icon: ShieldCheck,
      text: selections.GRADE === "SSG_304" ? "Food-grade SS 304" : "Indoor SS 202",
    },
    { icon: Droplets, text: "Easy to clean" },
    { icon: Sparkles, text: "Rust-proof finish" },
    { icon: Shield, text: "Hospital & canteen ready" },
  ];
}

function completeSetLink(productType: NonTableProductType) {
  if (productType === "CHAIR") {
    return {
      href: "/products?category=Cafe+%26+Dining+Tables",
      label: "Complete the Set with Matching Tables",
    };
  }
  if (productType === "STAND") {
    return {
      href: "/products?category=Home+Utility+Stands",
      label: "Explore Matching Utility Stands",
    };
  }
  if (productType === "RACK") {
    return {
      href: "/products?category=Boutique+%26+Showroom+Racks",
      label: "Explore Matching Showroom Racks",
    };
  }
  return {
    href: "/products?category=Hospital%2C+Canteen+%26+Lab+SS",
    label: "Explore Matching Stainless Units",
  };
}

export default function TypeConfigurator({
  product,
  options,
  groups,
  visualVariants,
  fromPrice,
}: TypeConfiguratorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [selections, setSelections] = useState<Record<string, string>>(() =>
    initialSelections(product.product_type, groups, options, searchParams)
  );
  const parsedQuantity = Number(searchParams.get("quantity") ?? "1");
  const [quantity, setQuantity] = useState(
    Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= 500
      ? parsedQuantity
      : 1
  );

  const [priceData, setPriceData] = useState<PriceState>({
    unit_price: fromPrice ?? undefined,
    total_price: fromPrice ?? undefined,
    discount_pct: 0,
    bumper_included: false,
    requires_quote: false,
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeThumbnailIndex, setActiveThumbnailIndex] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "loading" | "error">("idle");
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const commitSelections = useCallback(
    (next: Record<string, string>) => {
      setSelections(next);
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        for (const group of groups) {
          params.delete(selectionParam(group.option_group));
        }
        for (const [group, code] of Object.entries(next)) {
          params.set(selectionParam(group), code);
        }
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [groups, router, searchParams]
  );

  const handleSelect = (group: string, code: string) => {
    const next = { ...selections, [group]: code };

    if (product.product_type === "CHAIR") {
      if (group === "METAL_TYPE") {
        if (code === "MS_COATED") {
          if (!next.FRAME_COLOR) next.FRAME_COLOR = "MATTE_BLACK";
        } else {
          delete next.FRAME_COLOR;
        }
      }

      if (group === "SEAT") {
        if (code === "SEAT_REXINE") {
          if (!next.SEAT_COLOR) next.SEAT_COLOR = "REXINE_BLACK";
        } else {
          delete next.SEAT_COLOR;
        }
      }
    }

    commitSelections(next);
  };

  const handleQuantityChange = (nextQuantity: number) => {
    const clamped = Math.max(1, Math.min(500, nextQuantity));
    setQuantity(clamped);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (clamped > 1) params.set("quantity", String(clamped));
      else params.delete("quantity");
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsCalculating(true);

      try {
        const res = await fetch("/api/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: product.sku,
            quantity,
            selections,
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as PriceState;
          if (!cancelled) setPriceData(json);
        }
      } catch {
        // Preserve the previous price on a network glitch.
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [product.sku, quantity, selections]);

  const pinParam = searchParams.get("pin") ?? "";
  const validPin = /^\d{6}$/.test(pinParam) ? pinParam : null;

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      sku: product.sku,
      quantity,
      selections,
    };
    if (validPin) payload.pin = validPin;
    return payload;
  };

  const handleWhatsAppBook = async () => {
    setWhatsappStatus("loading");
    setWhatsappError(null);

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const pendingWindow = isMobile ? null : window.open("", "_blank");

    try {
      const res = await fetch("/api/whatsapp-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) throw new Error("WhatsApp request failed");

      const data = (await res.json()) as { url?: unknown };
      if (typeof data.url !== "string" || !data.url.startsWith("https://wa.me/")) {
        throw new Error("Invalid WhatsApp URL");
      }

      if (isMobile) {
        window.location.href = data.url;
      } else if (pendingWindow) {
        pendingWindow.location.href = data.url;
      } else {
        window.location.href = data.url;
      }

      setWhatsappStatus("idle");
    } catch {
      pendingWindow?.close();
      setWhatsappStatus("error");
      setWhatsappError("Could not open WhatsApp. Please check your connection and try again.");
    }
  };

  const handlePdfDownload = async () => {
    setPdfStatus("loading");
    setPdfError(null);

    try {
      const res = await fetch("/api/quote-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) throw new Error("PDF request failed");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = filenameMatch?.[1] || "SANRA-Quote.pdf";

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setPdfStatus("idle");
    } catch {
      setPdfStatus("error");
      setPdfError("Could not generate the PDF quote. Please try again.");
    }
  };

  const visibleGroups = groups.filter((group) => {
    if (group.option_group === "QTY_TIER") return false;
    if (product.product_type !== "CHAIR") return true;
    if (group.option_group === "SEAT_COLOR") return selections.SEAT === "SEAT_REXINE";
    if (group.option_group === "FRAME_COLOR") return selections.METAL_TYPE === "MS_COATED";
    return true;
  });

  const selectionKey = buildSelectionKey(product.product_type, selections);
  const matchedVariant = visualVariants.find(
    (variant) => variant.selection_key === selectionKey
  );
  const previewUrl = matchedVariant?.preview_image_url || product.main_image_url;
  const activeImage =
    activeThumbnailIndex === 1 && product.hover_blueprint_img
      ? product.hover_blueprint_img
      : previewUrl;

  const chipGroup =
    product.product_type === "CHAIR"
      ? "METAL_TYPE"
      : product.product_type === "STAND"
      ? "STAND_MATERIAL"
      : product.product_type === "RACK"
      ? "FINISH"
      : "SS_FINISH";
  const chipOption = visibleOptions(product.product_type, chipGroup, options).find(
    (option) => option.option_code === selections[chipGroup]
  );

  const badges = featureBadges(product.product_type, selections);
  const completeSet = completeSetLink(product.product_type);
  const isSS = isSSSelection(product.product_type, selections);
  const selectedPincode = selections.BUILD_TYPE;
  const totalPrice = priceData.total_price;
  const unitPrice = priceData.unit_price;
  const unitLabel =
    product.product_type === "STAND" && selections.PACK === "PACK_2" ? "pack" : "unit";

  return (
    <div
      data-type-configurator
      className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start pb-24 sm:pb-0"
    >
      <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-5">
        <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-[#F5F5F7] aspect-square">
          <SafeImage
            key={activeImage}
            src={activeImage}
            fallback={product.main_image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-neutral-900/15 text-xs sm:text-sm md:text-base font-extrabold tracking-[0.25em] sm:tracking-[0.35em] uppercase text-center transform -rotate-12 select-none px-4 py-1.5 border border-neutral-900/10 rounded">
              SANRA LIVING
            </span>
          </div>

          {chipOption && activeThumbnailIndex === 0 && (
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-neutral-300 shadow-xs backdrop-blur-xs">
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                style={{ backgroundColor: chipOption.swatch_color_hex || "#D4D4D8" }}
              />
              <span className="text-[11px] font-bold text-neutral-800 tracking-tight">
                Selected: {chipOption.label_en}
              </span>
            </div>
          )}

          {activeThumbnailIndex === 1 && (
            <div className="absolute top-3 left-3 z-20 pointer-events-none">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-600 text-white px-2.5 py-1 rounded shadow-xs">
                Blueprint & Dimension View
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveThumbnailIndex(0)}
            className={`relative rounded-lg overflow-hidden border-2 w-20 h-20 bg-neutral-100 transition-all ${
              activeThumbnailIndex === 0
                ? "border-black ring-1 ring-black"
                : "border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100"
            }`}
          >
            <SafeImage
              key={previewUrl}
              src={previewUrl}
              fallback={product.main_image_url}
              alt="Main view"
              className="w-full h-full object-cover"
              sizes="80px"
            />
            <span className="absolute bottom-1 inset-x-1 text-[9px] font-bold text-center bg-black/75 text-white rounded-xs">
              Product
            </span>
          </button>

          {product.hover_blueprint_img && (
            <button
              type="button"
              onClick={() => setActiveThumbnailIndex(1)}
              className={`relative rounded-lg overflow-hidden border-2 w-20 h-20 bg-neutral-100 transition-all ${
                activeThumbnailIndex === 1
                  ? "border-black ring-1 ring-black"
                  : "border-neutral-200 hover:border-neutral-400 opacity-70 hover:opacity-100"
              }`}
            >
              <SafeImage
                src={product.hover_blueprint_img}
                fallback={product.main_image_url}
                alt="Blueprint dimensions"
                className="w-full h-full object-cover"
                sizes="80px"
              />
              <span className="absolute bottom-1 inset-x-1 text-[9px] font-bold text-center bg-blue-700 text-white rounded-xs">
                Blueprint
              </span>
            </button>
          )}
        </div>

        {(product.product_type === "CHAIR" ||
          product.product_type === "STAND" ||
          product.product_type === "RACK") && (
          <div className="p-4 rounded-xl bg-[#F5F5F7] border border-neutral-200">
            <p className="text-xs font-bold text-[#111111]">
              SANRA Zero-Shake Telescopic Lock™ (200 Kg Tested)
            </p>
          </div>
        )}

        <div className="border border-neutral-200 rounded-xl p-4 bg-white space-y-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">
            Built For Daily Use
          </p>
          <div className="grid grid-cols-2 gap-2.5 text-xs text-neutral-800 font-medium">
            {badges.map((badge, index) => {
              const Icon = badge.icon;
              return (
                <div key={index} className="flex items-center gap-2 p-1.5 rounded bg-neutral-50">
                  <Icon className="w-4 h-4 text-neutral-700 shrink-0" />
                  <span className="text-[11px] leading-tight">{badge.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setCompareOpen(!compareOpen)}
            className="w-full flex items-center justify-between p-4 text-xs font-bold uppercase tracking-wider text-neutral-800 hover:bg-neutral-50 transition-colors"
          >
            <span>Compare With Local Market</span>
            {compareOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {compareOpen && (
            <div className="p-4 pt-0 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-red-50/70 border border-red-200 space-y-1">
                <p className="font-bold text-red-900">Local Welding Shop</p>
                <p className="text-[11px] text-red-700 leading-snug">
                  Thin-wall pipe, manual fabrication and no leveling base can loosen under
                  daily commercial use.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                <p className="font-bold text-emerald-900">SANRA SIDCO Factory</p>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  Jig-built steel frame, quality-checked finish and a structural warranty.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-6 space-y-8">
        <div>
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-600 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full mb-2">
            Factory Customizer
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            {product.name}
          </h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">
            SKU: {product.sku} • Direct SIDCO Coimbatore Production
          </p>
        </div>

        {visibleGroups.map((group, index) => {
          const groupOptions = visibleOptions(product.product_type, group.option_group, options);
          if (groupOptions.length === 0) return null;

          const isSwatchGroup =
            group.option_group === "FRAME_COLOR" ||
            group.option_group === "SEAT_COLOR" ||
            group.option_group === "FINISH";
          const isPillGroup = group.option_group === "RACK_SIZE";
          const selectedCode = selections[group.option_group];

          return (
            <div key={group.option_group} className="space-y-3 pt-4 border-t border-neutral-200 first:pt-0 first:border-t-0">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                {index + 1}. {group.group_title}
              </label>

              {isSwatchGroup ? (
                <div
                  className="grid grid-cols-3 sm:grid-cols-5 gap-2"
                  role="radiogroup"
                  aria-label={group.group_title}
                >
                  {groupOptions.map((option) => {
                    const selected = selectedCode === option.option_code;
                    return (
                      <button
                        key={option.option_code}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={option.label_en}
                        onClick={() => handleSelect(group.option_group, option.option_code)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                          selected
                            ? "border-black bg-neutral-50 ring-1 ring-black font-bold"
                            : "border-neutral-200 hover:border-neutral-400 bg-white"
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-neutral-300 mb-1"
                          style={{ backgroundColor: option.swatch_color_hex || "#111" }}
                        />
                        <span className="text-[10px] text-neutral-800 leading-tight">
                          {option.label_en}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : isPillGroup ? (
                <div className="grid grid-cols-3 gap-2">
                  {groupOptions.map((option) => {
                    const selected = selectedCode === option.option_code;
                    return (
                      <button
                        key={option.option_code}
                        type="button"
                        onClick={() => handleSelect(group.option_group, option.option_code)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          selected
                            ? "border-black bg-neutral-50 ring-1 ring-black font-bold text-black"
                            : "border-neutral-200 hover:border-neutral-400 bg-white text-neutral-700"
                        }`}
                      >
                        <span className="block text-xs">{option.label_en}</span>
                        <span className="block text-[10px] text-neutral-500 font-normal">
                          {option.spec_note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {groupOptions.map((option) => {
                    const selected = selectedCode === option.option_code;
                    const isBuild = group.option_group === "BUILD_TYPE";
                    const BuildIcon = option.option_code === "KNOCKDOWN" ? Package : Truck;

                    return (
                      <button
                        key={option.option_code}
                        type="button"
                        onClick={() => handleSelect(group.option_group, option.option_code)}
                        className={`w-full flex items-start justify-between gap-3 p-3.5 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-black bg-neutral-50 ring-1 ring-black"
                            : "border-neutral-200 hover:border-neutral-400 bg-white"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {option.swatch_color_hex && (
                              <span
                                className="w-4 h-4 rounded-full border border-neutral-300 shrink-0"
                                style={{ backgroundColor: option.swatch_color_hex }}
                              />
                            )}
                            {isBuild && (
                              <BuildIcon className="w-4 h-4 text-neutral-700 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-[#111111]">
                              {option.label_en}
                            </span>
                            {option.badge_text && (
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {option.badge_text}
                              </span>
                            )}
                          </div>
                          {option.spec_note && (
                            <p className="text-[11px] text-neutral-500 font-medium">
                              {option.spec_note}
                            </p>
                          )}
                          {option.warranty_text && (
                            <p className="text-[10px] text-neutral-500">
                              {option.warranty_text}
                            </p>
                          )}
                        </div>
                        {selected && <Check className="w-4 h-4 text-black shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {group.option_group === "METAL_TYPE" && (
                <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-700 leading-relaxed">
                  {isSS
                    ? "Natural SS finish — no powder coat is applied to stainless steel."
                    : selectedCode &&
                      groupOptions.find((option) => option.option_code === selectedCode)
                        ?.warranty_text
                    ? `Warranty: ${
                        groupOptions.find((option) => option.option_code === selectedCode)
                          ?.warranty_text
                      }`
                    : "Warranty details are confirmed on the factory quote."}
                </div>
              )}

              {group.option_group === "PACK" && selectedCode === "PACK_2" && (
                <p className="text-[11px] font-bold text-emerald-700">
                  Nesting combo saves ₹150
                </p>
              )}

              {group.option_group === "RACK_SIZE" && (
                <p className="text-[11px] font-semibold text-neutral-600">
                  Rack is ready to assemble. Choose your height.
                </p>
              )}
            </div>
          );
        })}

        <PincodeEstimator
          selectedBuildType={selectedPincode}
          onSelectFlatPack={
            product.product_type === "CHAIR"
              ? () => handleSelect("BUILD_TYPE", "KNOCKDOWN")
              : undefined
          }
        />

        <div className="space-y-3 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
              {visibleGroups.length + 1}. Quantity
            </label>
            {priceData.discount_pct && priceData.discount_pct > 0 ? (
              <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {priceData.discount_pct}% Volume Discount Applied
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuantityChange(1)}
              className={`p-2.5 rounded-lg border text-center transition-all ${
                quantity >= 1 && quantity <= 3
                  ? "border-black bg-neutral-50 ring-1 ring-black font-bold text-black"
                  : "border-neutral-200 hover:border-neutral-400 bg-white text-neutral-600"
              }`}
            >
              <span className="block text-xs">1 - 3 Units</span>
              <span className="block text-[10px] text-neutral-500 font-normal">Retail Price</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuantityChange(4)}
              className={`p-2.5 rounded-lg border text-center transition-all ${
                quantity >= 4 && quantity <= 9
                  ? "border-black bg-neutral-50 ring-1 ring-black font-bold text-black"
                  : "border-neutral-200 hover:border-neutral-400 bg-white text-neutral-600"
              }`}
            >
              <span className="block text-xs">4 - 9 Units</span>
              <span className="block text-[10px] text-emerald-700 font-bold">5% Discount</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuantityChange(10)}
              className={`p-2.5 rounded-lg border text-center transition-all ${
                quantity >= 10
                  ? "border-black bg-neutral-50 ring-1 ring-black font-bold text-black"
                  : "border-neutral-200 hover:border-neutral-400 bg-white text-neutral-600"
              }`}
            >
              <span className="block text-xs">10+ Units</span>
              <span className="block text-[10px] text-emerald-700 font-bold">12% Discount</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs font-semibold text-neutral-600">Exact Quantity:</span>
            <div className="flex items-center border border-neutral-300 rounded-md overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity - 1)}
                className="px-3 py-1.5 hover:bg-neutral-100 text-neutral-700 font-bold"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={500}
                aria-label="Quantity"
                value={quantity}
                onChange={(event) =>
                  handleQuantityChange(parseInt(event.target.value || "1", 10))
                }
                className="w-14 text-center text-xs font-bold py-1.5 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(quantity + 1)}
                className="px-3 py-1.5 hover:bg-neutral-100 text-neutral-700 font-bold"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div
          id="type-configurator-actions"
          className="p-6 rounded-xl bg-[#F5F5F7] border border-neutral-300 space-y-4"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-600 bg-neutral-200 px-2.5 py-1 rounded">
              Direct Factory Price • GST Invoice Available
            </span>
            {isCalculating && (
              <span className="text-[11px] font-semibold text-neutral-500 animate-pulse">
                Updating live quote...
              </span>
            )}
          </div>

          {priceData.requires_quote ? (
            <div className="space-y-1">
              <span className="text-2xl font-black text-[#111111]">Quote on Request</span>
              <p className="text-xs text-neutral-600">
                Our factory engineer will confirm the exact specification.
              </p>
            </div>
          ) : totalPrice != null ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-[#111111] tracking-tight">
                  ₹{totalPrice.toLocaleString("en-IN")}
                </span>
                {quantity > 1 && unitPrice != null && (
                  <span className="text-xs text-neutral-500">
                    (₹{unitPrice.toLocaleString("en-IN")} / {unitLabel})
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                GST Invoice Available • Direct SIDCO Coimbatore ex-factory quote.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculating factory price...
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleWhatsAppBook}
              disabled={whatsappStatus === "loading"}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                whatsappStatus === "loading"
                  ? "bg-emerald-700/40 text-white cursor-not-allowed"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {whatsappStatus === "loading"
                ? "Opening WhatsApp..."
                : "📲 Book This Configuration on WhatsApp"}
            </button>

            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={pdfStatus === "loading"}
              className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                pdfStatus === "loading"
                  ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                  : "bg-neutral-900 hover:bg-black text-white shadow-sm"
              }`}
            >
              <FileText className="w-4 h-4" />
              {pdfStatus === "loading"
                ? "Generating PDF..."
                : "📄 Download Instant Factory Quote (PDF)"}
            </button>

            {whatsappStatus === "error" && whatsappError && (
              <div
                aria-live="polite"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 space-y-2"
              >
                <p>{whatsappError}</p>
                <button
                  type="button"
                  onClick={handleWhatsAppBook}
                  className="px-3 py-1.5 rounded-md bg-red-700 text-white font-bold uppercase tracking-wider text-[10px] hover:bg-red-800 transition-colors"
                >
                  Retry WhatsApp
                </button>
              </div>
            )}

            {pdfStatus === "error" && pdfError && (
              <div
                aria-live="polite"
                className="p-3 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 space-y-2"
              >
                <p>{pdfError}</p>
                <button
                  type="button"
                  onClick={handlePdfDownload}
                  className="px-3 py-1.5 rounded-md bg-red-700 text-white font-bold uppercase tracking-wider text-[10px] hover:bg-red-800 transition-colors"
                >
                  Retry PDF
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 space-y-2 text-center">
          <span className="text-xs font-bold text-neutral-800">Complete the Set</span>
          <p className="text-[11px] text-neutral-500">
            Pair this piece with the rest of the SANRA factory range.
          </p>
          <Link
            href={completeSet.href}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-md border border-black bg-white text-[10px] font-bold uppercase tracking-wider text-black hover:bg-neutral-100 transition-colors"
          >
            {completeSet.label}
          </Link>
        </div>
      </div>

      <div className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
            Your Price
          </p>
          <p className="text-lg font-black text-[#111111]">
            {totalPrice != null ? `₹${totalPrice.toLocaleString("en-IN")}` : "Calculating..."}
          </p>
        </div>
        <a
          href="#type-configurator-actions"
          className="px-4 py-2.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider"
        >
          View Price
        </a>
      </div>
    </div>
  );
}
