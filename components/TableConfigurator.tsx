"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import WatermarkedImage from "@/components/WatermarkedImage";
import PincodeEstimator from "@/components/PincodeEstimator";
import { ConfigOption } from "@/lib/configuratorOptions";
import {
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  Droplets,
  Layers,
  Shield,
  Laptop,
  Zap,
  AlertTriangle,
  Package,
  Truck,
  MessageSquare,
  FileText,
} from "lucide-react";

interface VisualVariant {
  top_material_code: string;
  frame_color: string;
  preview_image_url: string;
  size_option?: string;
}

function parseCustomDimension(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{1,2}(\.\d)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) return null;
  if (Math.abs(parsed * 10 - Math.round(parsed * 10)) > 1e-9) return null;
  return parsed;
}

interface TableConfiguratorProps {
  product: {
    id: string;
    sku: string;
    name: string;
    category: string;
    base_length_ft: number;
    base_width_ft: number;
    main_image_url: string;
    hover_blueprint_img?: string | null;
    warranty_text: string;
    allowed_top_categories: string[];
    top_overlay_note?: string | null;
  };
  options: ConfigOption[];
  visualVariants: VisualVariant[];
}

export default function TableConfigurator({
  product,
  options,
  visualVariants,
}: TableConfiguratorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Group options by option_group
  const topTabs = options.filter(
    (o) =>
      o.option_group === "TOP_TAB" &&
      product.allowed_top_categories.includes(o.option_code)
  );

  const topMaterials = options.filter((o) => o.option_group === "TOP_MATERIAL");
  const gauges = options.filter((o) => o.option_group === "GAUGE");
  const frameColors = options.filter((o) => o.option_group === "FRAME_COLOR");
  const buildTypes = options.filter((o) => o.option_group === "BUILD_TYPE");
  const sizes = options.filter((o) => o.option_group === "SIZE");
  const addons = options.filter((o) => o.option_group === "ADDON");

  // Read initial values from URL search params with strict fallbacks
  const urlTopTab = searchParams.get("top_tab");
  const initialTopTab =
    topTabs.some((t) => t.option_code === urlTopTab)
      ? urlTopTab!
      : topTabs.find((t) => t.option_code === "WOOD")?.option_code || topTabs[0]?.option_code || "FRAME_ONLY";

  const availableMaterialsForTab = topMaterials.filter((m) => m.parent_code === initialTopTab);
  const urlTopMaterial = searchParams.get("top_material");
  const initialTopMaterial =
    availableMaterialsForTab.some((m) => m.option_code === urlTopMaterial)
      ? urlTopMaterial
      : availableMaterialsForTab[0]?.option_code || null;

  const urlGauge = searchParams.get("gauge");
  const initialGauge = gauges.some((g) => g.option_code === urlGauge) ? urlGauge! : "G16";

  const urlFrameColor = searchParams.get("frame_color");
  const initialFrameColor = frameColors.some((c) => c.option_code === urlFrameColor)
    ? urlFrameColor!
    : "MATTE_BLACK";

  const urlBuildType = searchParams.get("build_type");
  const initialBuildType = buildTypes.some((b) => b.option_code === urlBuildType)
    ? urlBuildType!
    : "WELDED";

  const urlSize = searchParams.get("size");
  const defaultSizeCode = `${product.base_length_ft}x${product.base_width_ft}`;
  const initialSize = sizes.some((s) => s.option_code === urlSize)
    ? urlSize!
    : sizes.some((s) => s.option_code === defaultSizeCode)
    ? defaultSizeCode
    : "4x2";

  const urlAddons = searchParams.get("addons")?.split(",").filter(Boolean) || [];
  const initialAddons = urlAddons.filter((a) => addons.some((opt) => opt.option_code === a));

  const urlQty = parseInt(searchParams.get("quantity") || "1", 10);
  const initialQuantity = !isNaN(urlQty) && urlQty >= 1 && urlQty <= 500 ? urlQty : 1;

  // Active state
  const [selectedTopTab, setSelectedTopTab] = useState<string>(initialTopTab);
  const [selectedTopMaterial, setSelectedTopMaterial] = useState<string | null>(initialTopMaterial);
  const [selectedGauge, setSelectedGauge] = useState<string>(initialGauge);
  const [selectedFrameColor, setSelectedFrameColor] = useState<string>(initialFrameColor);
  const [selectedBuildType, setSelectedBuildType] = useState<string>(initialBuildType);
  const [selectedSize, setSelectedSize] = useState<string>(initialSize);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(initialAddons);
  const [quantity, setQuantity] = useState<number>(initialQuantity);

  const [customLength, setCustomLength] = useState<string>(() => {
    const parsed = parseCustomDimension(searchParams.get("custom_length_ft"));
    return parsed != null ? String(parsed) : "";
  });
  const [customWidth, setCustomWidth] = useState<string>(() => {
    const parsed = parseCustomDimension(searchParams.get("custom_width_ft"));
    return parsed != null ? String(parsed) : "";
  });

  const [whatsappStatus, setWhatsappStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "loading" | "error">("idle");
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Active image toggle (0 = main product, 1 = blueprint)
  const [activeThumbnailIndex, setActiveThumbnailIndex] = useState<number>(0);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  // Live pricing state
  const [priceData, setPriceData] = useState<{
    unit_price?: number;
    total_price?: number;
    discount_pct?: number;
    bumper_included?: boolean;
    requires_quote?: boolean;
  }>({
    unit_price: 4999,
    total_price: 4999,
    discount_pct: 0,
    bumper_included: false,
    requires_quote: false,
  });

  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Sync state to URL search params
  const updateUrlState = useCallback(
    (updates: Record<string, string | null>) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === "") {
            params.delete(key);
          } else {
            params.set(key, value);
          }
        }
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  // Fetch live price debounced
  useEffect(() => {
    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (isCancelled) return;
      setIsCalculating(true);

      try {
        const res = await fetch("/api/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: product.sku,
            top_tab: selectedTopTab,
            top_material: selectedTopTab === "FRAME_ONLY" ? null : selectedTopMaterial,
            gauge: selectedGauge,
            frame_color: selectedFrameColor,
            build_type: selectedBuildType,
            size: selectedSize,
            addons: selectedAddons,
            quantity,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (!isCancelled) {
            setPriceData(json);
          }
        }
      } catch {
        // preserve previous price on network glitch
      } finally {
        if (!isCancelled) {
          setIsCalculating(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    product.sku,
    selectedTopTab,
    selectedTopMaterial,
    selectedGauge,
    selectedFrameColor,
    selectedBuildType,
    selectedSize,
    selectedAddons,
    quantity,
  ]);

  // Tab switch handler: auto-select first material in that tab
  const handleTopTabChange = (tabCode: string) => {
    setSelectedTopTab(tabCode);
    const available = topMaterials.filter((m) => m.parent_code === tabCode);
    const nextMat = tabCode === "FRAME_ONLY" ? null : available[0]?.option_code || null;
    setSelectedTopMaterial(nextMat);

    updateUrlState({
      top_tab: tabCode,
      top_material: nextMat,
    });
  };

  const handleTopMaterialChange = (matCode: string) => {
    setSelectedTopMaterial(matCode);
    updateUrlState({ top_material: matCode });
  };

  const handleGaugeChange = (gCode: string) => {
    setSelectedGauge(gCode);
    updateUrlState({ gauge: gCode });
  };

  const handleFrameColorChange = (cCode: string) => {
    setSelectedFrameColor(cCode);
    updateUrlState({ frame_color: cCode });
  };

  const handleBuildTypeChange = (bCode: string) => {
    setSelectedBuildType(bCode);
    updateUrlState({ build_type: bCode });
  };

  const handleSizeChange = (sCode: string) => {
    setSelectedSize(sCode);
    updateUrlState({ size: sCode });
  };

  const handleAddonToggle = (addonCode: string) => {
    const next = selectedAddons.includes(addonCode)
      ? selectedAddons.filter((a) => a !== addonCode)
      : [...selectedAddons, addonCode];
    setSelectedAddons(next);
    updateUrlState({ addons: next.length > 0 ? next.join(",") : null });
  };

  const handleQuantityChange = (newQty: number) => {
    const clamped = Math.max(1, Math.min(500, newQty));
    setQuantity(clamped);
    updateUrlState({ quantity: clamped > 1 ? clamped.toString() : null });
  };

  const customLengthValue = parseCustomDimension(customLength);
  const customWidthValue = parseCustomDimension(customWidth);
  const customDimsValid = customLengthValue != null && customWidthValue != null;
  const urlPin = searchParams.get("pin") ?? "";
  const validPin = /^\d{6}$/.test(urlPin) ? urlPin : null;

  const handleCustomLengthChange = (value: string) => {
    setCustomLength(value.replace(/[^\d.]/g, "").slice(0, 4));
  };

  const handleCustomWidthChange = (value: string) => {
    setCustomWidth(value.replace(/[^\d.]/g, "").slice(0, 4));
  };

  const commitCustomLength = () => {
    const parsed = parseCustomDimension(customLength);
    updateUrlState({ custom_length_ft: parsed != null ? String(parsed) : null });
  };

  const commitCustomWidth = () => {
    const parsed = parseCustomDimension(customWidth);
    updateUrlState({ custom_width_ft: parsed != null ? String(parsed) : null });
  };

  const buildConfigPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      sku: product.sku,
      top_tab: selectedTopTab,
      top_material: selectedTopTab === "FRAME_ONLY" ? null : selectedTopMaterial,
      gauge: selectedGauge,
      frame_color: selectedFrameColor,
      build_type: selectedBuildType,
      size: selectedSize,
      addons: selectedAddons,
      quantity,
    };

    if (selectedSize === "CUSTOM") {
      payload.custom_length_ft = customLengthValue;
      payload.custom_width_ft = customWidthValue;
    }

    if (validPin) {
      payload.pin = validPin;
    }

    return payload;
  };

  const handleWhatsAppBook = async () => {
    if (selectedSize === "CUSTOM" && !customDimsValid) return;

    setWhatsappStatus("loading");
    setWhatsappError(null);

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const pendingWindow = isMobile ? null : window.open("", "_blank");

    try {
      const res = await fetch("/api/whatsapp-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConfigPayload()),
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
    if (selectedSize === "CUSTOM") return;

    setPdfStatus("loading");
    setPdfError(null);

    try {
      const res = await fetch("/api/quote-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConfigPayload()),
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

  // Resolve active image from visualVariants or product fallback
  const isSS = selectedGauge === "SS202" || selectedGauge === "SS304";
  const matchedVariant = visualVariants.find(
    (v) =>
      v.top_material_code === selectedTopMaterial &&
      (isSS ? true : v.frame_color === selectedFrameColor)
  );

  const mainImageUrl = matchedVariant?.preview_image_url || product.main_image_url;
  const activeImage =
    activeThumbnailIndex === 1 && product.hover_blueprint_img
      ? product.hover_blueprint_img
      : mainImageUrl;

  const currentTopOption = topMaterials.find((m) => m.option_code === selectedTopMaterial);

  // Group materials under active top tab by group_label
  const activeMaterials = topMaterials.filter((m) => m.parent_code === selectedTopTab);
  const materialGroups: Record<string, ConfigOption[]> = {};
  for (const mat of activeMaterials) {
    const group = mat.group_label || "Options";
    if (!materialGroups[group]) materialGroups[group] = [];
    materialGroups[group].push(mat);
  }

  // Durability badges
  const renderDurabilityBadges = () => {
    if (selectedTopTab === "STONE") {
      return [
        { icon: Flame, text: "100% Heat Proof (Hot Sambar/Tea Safe)" },
        { icon: Droplets, text: "100% Waterproof" },
        { icon: Layers, text: "Scratch & Stain Proof" },
        { icon: Shield, text: '+1" Steel Bumper Included' },
      ];
    }
    if (selectedTopTab === "WOOD") {
      if (selectedTopMaterial?.startsWith("PRELAM_")) {
        return [
          { icon: Laptop, text: "Best for Laptops & Dry Office" },
          { icon: Zap, text: "Free Wire Grommet Eligible" },
          { icon: AlertTriangle, text: "Indoor Use (Keep dry)" },
          { icon: Layers, text: "25mm Core + 2mm PVC Edge" },
        ];
      }
      if (selectedTopMaterial?.startsWith("WPC_")) {
        return [
          { icon: Droplets, text: "100% Weatherproof Outdoor" },
          { icon: Shield, text: "Termite & Borer Proof" },
          { icon: Flame, text: "UV-Resistant Surface" },
          { icon: Layers, text: "Solid Heavy Density Planks" },
        ];
      }
      if (selectedTopMaterial?.startsWith("BWR_")) {
        return [
          { icon: Droplets, text: "Boiling Water Resistant Ply" },
          { icon: Layers, text: "1mm High-Gloss Mica" },
          { icon: Shield, text: "Daily Wipe Down Safe" },
          { icon: AlertTriangle, text: "Commercial Dining Grade" },
        ];
      }
      // Rubberwood
      return [
        { icon: Layers, text: "100% Seasoned Grade-A Kerala Rubberwood" },
        { icon: Droplets, text: "Polyurethane Water Guard Seal" },
        { icon: Shield, text: "18mm Finger-Jointed Solid Hardwood" },
        { icon: Sparkles, text: "Natural Grain Architecture" },
      ];
    }
    if (selectedTopTab === "METAL") {
      return [
        { icon: Shield, text: "Indestructible Heavy Steel Top" },
        { icon: Flame, text: "Direct Spark & Heat Proof" },
        { icon: Droplets, text: isSS ? "100% Rust-Proof Sanitary" : "Industrial Powder-Coated" },
        { icon: Layers, text: "200 Kg Heavy Surface Load" },
      ];
    }
    // FRAME_ONLY
    return [
      { icon: Shield, text: "CO2 MIG Structural Heavy Frame" },
      { icon: Zap, text: "Top-Mount Hole Provisions Included" },
      { icon: Layers, text: "Pre-Leveled Alignment Bushes" },
      { icon: Sparkles, text: "Use with Custom Granite / Wood" },
    ];
  };

  const durabilityBadges = renderDurabilityBadges();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
      {/* ================= LEFT COLUMN: STICKY PRODUCT PREVIEW ================= */}
      <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-5">
        <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-[#F5F5F7]">
          <WatermarkedImage
            src={activeImage}
            alt={product.name}
            aspectRatio="square"
            priority
          />

          {/* Blueprint indicator tag */}
          {activeThumbnailIndex === 1 && (
            <div className="absolute top-3 left-3 z-20 pointer-events-none">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-600 text-white px-2.5 py-1 rounded shadow-xs">
                Blueprint & Dimension View
              </span>
            </div>
          )}

          {/* Swatch preview overlay chip */}
          {selectedTopTab !== "FRAME_ONLY" && currentTopOption && activeThumbnailIndex === 0 && (
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-neutral-300 shadow-xs backdrop-blur-xs">
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                style={{ backgroundColor: currentTopOption.swatch_color_hex || "#111" }}
              />
              <span className="text-[11px] font-bold text-neutral-800 tracking-tight">
                Top: {currentTopOption.label_en}
              </span>
            </div>
          )}

          {selectedTopTab === "FRAME_ONLY" && activeThumbnailIndex === 0 && (
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none px-3 py-1 rounded-full bg-black/85 text-white text-[11px] font-bold tracking-wider uppercase">
              Frame Only (No Top Surface)
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
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
            <WatermarkedImage src={mainImageUrl} alt="Main view" aspectRatio="square" />
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
              <WatermarkedImage
                src={product.hover_blueprint_img}
                alt="Blueprint dimensions"
                aspectRatio="square"
              />
              <span className="absolute bottom-1 inset-x-1 text-[9px] font-bold text-center bg-blue-700 text-white rounded-xs">
                Blueprint
              </span>
            </button>
          )}
        </div>

        {/* Product Spec Summary & Zero-Shake Highlight */}
        <div className="p-4 rounded-xl bg-[#F5F5F7] border border-neutral-200 space-y-2 text-xs text-neutral-600">
          <div className="flex items-center justify-between text-[#111111] font-bold">
            <span>SANRA Zero-Shake Telescopic Lock™</span>
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
              200 Kg Tested
            </span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Multi-directional structural joint containment engineered at SIDCO Kurichi. Zero wobble under dynamic load.
          </p>
        </div>

        {/* Surface Durability Badges */}
        <div className="border border-neutral-200 rounded-xl p-4 bg-white space-y-2.5">
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500">
            Surface Engineering Ratings
          </h4>
          <div className="grid grid-cols-2 gap-2.5 text-xs text-neutral-800 font-medium">
            {durabilityBadges.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-neutral-50">
                  <Icon className="w-4 h-4 text-neutral-700 shrink-0" />
                  <span className="text-[11px] leading-tight">{badge.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compare with local market toggle */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setIsCompareOpen(!isCompareOpen)}
            className="w-full flex items-center justify-between p-4 text-xs font-bold uppercase tracking-wider text-neutral-800 hover:bg-neutral-50 transition-colors"
          >
            <span>Compare with Local Welding Shop</span>
            {isCompareOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isCompareOpen && (
            <div className="p-4 pt-0 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-red-50/70 border border-red-200 space-y-1">
                <p className="font-bold text-red-900">Local Welding Shop</p>
                <p className="text-[11px] text-red-700 leading-snug">
                  20G thin-wall pipe + manual stick arc weld + no leveling bush = shakes in 6 months under commercial use.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                <p className="font-bold text-emerald-900">SANRA SIDCO Factory</p>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  16G Tata Structura pipe + robotic CO2 MIG bead + leveling bushes + 10-Yr MIG Warranty.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT COLUMN: CONFIGURATOR CONTROLS ================= */}
      <div className="lg:col-span-6 space-y-8">
        <div>
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-500 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full mb-2">
            Factory Customizer
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            {product.name}
          </h1>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">
            SKU: {product.sku} • Direct SIDCO Coimbatore Production
          </p>
        </div>

        {/* 1. TOP MATERIAL TABS */}
        <div className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
            1. Select Top Surface Type
          </label>

          {/* 4 Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {topTabs.map((tab) => {
              const isSelected = selectedTopTab === tab.option_code;
              return (
                <button
                  key={tab.option_code}
                  type="button"
                  onClick={() => handleTopTabChange(tab.option_code)}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all text-center ${
                    isSelected
                      ? "border-black bg-black text-white shadow-xs"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  {tab.label_en}
                </button>
              );
            })}
          </div>

          {/* Swatches under tab */}
          {selectedTopTab === "FRAME_ONLY" ? (
            <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">
              <p className="font-semibold text-neutral-800">Supply Your Own Top Slab</p>
              <p className="text-[11px] mt-1 leading-relaxed">
                Includes welded steel perimeter brackets pre-drilled with counter-sunk mounting holes. Ideal if you already have local marble, granite, or solid wood.
              </p>
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              {Object.entries(materialGroups).map(([groupTitle, mats]) => (
                <div key={groupTitle} className="space-y-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    {groupTitle}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mats.map((mat) => {
                      const isSelected = selectedTopMaterial === mat.option_code;
                      return (
                        <button
                          key={mat.option_code}
                          type="button"
                          onClick={() => handleTopMaterialChange(mat.option_code)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "border-black bg-neutral-50 ring-1 ring-black"
                              : "border-neutral-200 hover:border-neutral-400 bg-white"
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-black/20 shrink-0 shadow-2xs"
                            style={{ backgroundColor: mat.swatch_color_hex || "#111" }}
                          />
                          <span className="text-xs font-semibold text-neutral-900 leading-tight">
                            {mat.label_en}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-black ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Granite/Stone Protective Bumper Auto-Rule Notice */}
          {selectedTopTab === "STONE" && (
            <div className="p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-300 flex items-start gap-2.5 text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold">Safety upgrade included (Non-removable): </span>
                <span className="text-[11px] leading-snug">
                  +1-inch Protective Steel Bumper Frame + Center Cross-Support Pipe welded directly to protect granite edges against accidental chair collisions.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. PIPE GAUGE & FRAME COLOR */}
        <div className="space-y-4 pt-4 border-t border-neutral-200">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
            2. Structural Steel Gauge & Load Rating
          </label>

          <div className="space-y-2.5">
            {gauges.map((g) => {
              const isSelected = selectedGauge === g.option_code;
              return (
                <button
                  key={g.option_code}
                  type="button"
                  onClick={() => handleGaugeChange(g.option_code)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-black bg-neutral-50 ring-1 ring-black"
                      : "border-neutral-200 hover:border-neutral-400 bg-white"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#111111]">{g.label_en}</span>
                      {g.badge_text && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-neutral-900 text-white">
                          {g.badge_text}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                      <span>{g.warranty_text}</span>
                      <span>•</span>
                      <span>{g.spec_note}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-neutral-800">
                      {g.load_kg} Kg Tested
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Frame Color Swatches (Hidden for SS) */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Frame Color Finish
            </label>
            {isSS ? (
              <p className="text-xs text-neutral-600 bg-neutral-100 p-2.5 rounded border border-neutral-200">
                Natural Jindal Stainless Steel polished finish (No powder-coat applied on SS).
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {frameColors.map((col) => {
                  const isSelected = selectedFrameColor === col.option_code;
                  return (
                    <button
                      key={col.option_code}
                      type="button"
                      onClick={() => handleFrameColorChange(col.option_code)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                        isSelected
                          ? "border-black bg-neutral-50 ring-1 ring-black font-bold"
                          : "border-neutral-200 hover:border-neutral-400 bg-white"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-neutral-300 mb-1"
                        style={{ backgroundColor: col.swatch_color_hex || "#111" }}
                      />
                      <span className="text-[10px] text-neutral-800 leading-tight">
                        {col.label_en}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 3. SIZE SELECTION */}
        <div className="space-y-3 pt-4 border-t border-neutral-200">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
            3. Frame Dimensions
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sizes.map((s) => {
              const isSelected = selectedSize === s.option_code;
              return (
                <button
                  key={s.option_code}
                  type="button"
                  onClick={() => handleSizeChange(s.option_code)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-black bg-neutral-50 ring-1 ring-black font-bold text-black"
                      : "border-neutral-200 hover:border-neutral-400 bg-white text-neutral-700"
                  }`}
                >
                  <span className="block text-xs">{s.label_en}</span>
                  <span className="block text-[10px] text-neutral-500 font-normal line-clamp-1">
                    {s.spec_note}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedSize === "CUSTOM" && (
            <div className="p-4 rounded-lg bg-neutral-100 border border-neutral-300 text-xs space-y-3">
              <div>
                <p className="font-bold text-neutral-900">Custom Dimension Sizing</p>
                <p className="text-neutral-600 leading-relaxed text-[11px] mt-1">
                  Enter your required frame size. Our SIDCO works engineer will confirm the cut list and return a custom proforma quote on WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Length (ft)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    step={0.1}
                    value={customLength}
                    onChange={(event) => handleCustomLengthChange(event.target.value)}
                    onBlur={commitCustomLength}
                    placeholder="e.g. 5.5"
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                    Width (ft)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    step={0.1}
                    value={customWidth}
                    onChange={(event) => handleCustomWidthChange(event.target.value)}
                    onBlur={commitCustomWidth}
                    placeholder="e.g. 2.5"
                    className="w-full px-3 py-2 rounded-md border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </label>
              </div>

              <p className="text-[11px] text-neutral-600">
                Accepted range: 1 to 12 ft, up to one decimal place.
              </p>
              {!customDimsValid && (customLength !== "" || customWidth !== "") && (
                <p className="text-[11px] font-semibold text-red-600">
                  Enter a valid length and width between 1 and 12 ft (one decimal maximum).
                </p>
              )}
            </div>
          )}
        </div>

        {/* 4. BUILD TYPE */}
        <div className="space-y-3 pt-4 border-t border-neutral-200">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
            4. Delivery & Assembly Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {buildTypes.map((b) => {
              const isSelected = selectedBuildType === b.option_code;
              const isTempo = b.option_code === "WELDED";
              return (
                <button
                  key={b.option_code}
                  type="button"
                  onClick={() => handleBuildTypeChange(b.option_code)}
                  className={`p-3.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-black bg-neutral-50 ring-1 ring-black"
                      : "border-neutral-200 hover:border-neutral-400 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-black mb-1">
                    {isTempo ? <Truck className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                    <span>{b.label_en}</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">{b.spec_note}</p>
                </button>
              );
            })}
          </div>

          <PincodeEstimator
            selectedBuildType={selectedBuildType}
            onSelectFlatPack={() => handleBuildTypeChange("KNOCKDOWN")}
          />
        </div>

        {/* 5. ADD-ONS */}
        <div className="space-y-3 pt-4 border-t border-neutral-200">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
            5. Optional Factory Add-Ons
          </label>
          <div className="space-y-2">
            {addons.map((ad) => {
              const isChecked = selectedAddons.includes(ad.option_code);
              return (
                <button
                  key={ad.option_code}
                  type="button"
                  onClick={() => handleAddonToggle(ad.option_code)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    isChecked
                      ? "border-black bg-neutral-50 ring-1 ring-black font-semibold"
                      : "border-neutral-200 hover:border-neutral-400 bg-white text-neutral-700"
                  }`}
                >
                  <div>
                    <span className="block text-xs text-neutral-900">{ad.label_en}</span>
                    <span className="block text-[11px] text-neutral-500 font-normal">{ad.spec_note}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      isChecked ? "bg-black border-black text-white" : "border-neutral-300 bg-white"
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. QUANTITY & B2B TIER */}
        <div className="space-y-3 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
              6. Quantity & Wholesale Tier
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
              <span className="block text-[10px] text-emerald-700 font-bold">12% Wholesale</span>
            </button>
          </div>

          {/* Quantity Stepper Input */}
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
                value={quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value || "1", 10))}
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

        {/* ================= LIVE PRICE BLOCK ================= */}
        <div className="p-6 rounded-xl bg-[#F5F5F7] border border-neutral-300 space-y-4">
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
                Custom millimeter specifications are calculated directly by our SIDCO works engineer.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-[#111111] tracking-tight">
                  ₹{priceData.total_price?.toLocaleString("en-IN")}
                </span>
                {quantity > 1 && (
                  <span className="text-xs text-neutral-500">
                    (₹{priceData.unit_price?.toLocaleString("en-IN")} / unit)
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                +18% GST invoice provided for business input tax credit. Direct SIDCO Coimbatore ex-factory quote.
              </p>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleWhatsAppBook}
              disabled={
                whatsappStatus === "loading" ||
                (selectedSize === "CUSTOM" && !customDimsValid)
              }
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                whatsappStatus === "loading" ||
                (selectedSize === "CUSTOM" && !customDimsValid)
                  ? "bg-emerald-600/40 text-white cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              {whatsappStatus === "loading"
                ? "Opening WhatsApp..."
                : selectedSize === "CUSTOM"
                ? "📲 Request Custom Quote on WhatsApp"
                : "📲 Book This Configuration on WhatsApp"}
            </button>

            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={selectedSize === "CUSTOM" || pdfStatus === "loading"}
              className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                selectedSize === "CUSTOM" || pdfStatus === "loading"
                  ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                  : "bg-neutral-900 hover:bg-black text-white shadow-sm"
              }`}
            >
              <FileText className="w-4 h-4" />
              {pdfStatus === "loading"
                ? "Generating PDF..."
                : "📄 Download Instant Factory Quote (PDF)"}
            </button>

            {selectedSize === "CUSTOM" && (
              <p className="text-[11px] text-center text-neutral-500">
                Custom sizes are quoted on WhatsApp
              </p>
            )}

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

        {/* Complete the Set placeholder */}
        <div className="p-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 space-y-1 text-center">
          <span className="text-xs font-bold text-neutral-800">
            Complete the Set (Matching Chairs Combo)
          </span>
          <p className="text-[11px] text-neutral-500">
            Matching structural steel cafe chairs & industrial barstools can be added with coordinated frame finishes.
          </p>
        </div>
      </div>
    </div>
  );
}

