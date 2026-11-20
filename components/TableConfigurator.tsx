"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import WatermarkedImage from "@/components/WatermarkedImage";
import {
  FRAME_MATERIAL_OPTIONS,
  MS_FRAME_COLOR_CODES,
  MS_GAUGE_CODES,
  SS_FRAME_COLOR_CODES,
  isFrameMaterial,
  type ConfigOption,
} from "@/lib/configuratorOptions";
import {
  ChevronDown,
  Sparkles,
  Flame,
  Droplets,
  Layers,
  Shield,
  Laptop,
  Zap,
  AlertTriangle,
  MessageSquare,
  FileText,
} from "lucide-react";

const CORE_TOP_TAB_CODES = new Set(["FRAME_ONLY", "WOOD", "STONE"]);
const CORE_TOP_MATERIAL_CODES = new Set([
  "RUBBER_HONEY_TEAK",
  "BWR_WARM_TEAK",
  "GRANITE_JET_BLACK_OPT",
  "GRANITE_GALAXY_OPT",
  "GRANITE_TAN_BROWN_OPT",
]);
const HIDDEN_ADDON_CODES = new Set(["GROMMET", "CPU_HOLDER", "CHAIRS4"]);

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
    base_height_ft?: number | null;
    pipe_spec?: string | null;
    combo_config?: Record<string, unknown> | null;
    top_category_images?: Record<string, string> | null;
  };
  options: ConfigOption[];
  visualVariants: VisualVariant[];
  topCategoryImages?: Record<string, string> | null;
  pipeSpec?: string | null;
  chairAddonPrice?: number | null;
}

export default function TableConfigurator({
  product,
  options,
  visualVariants,
  topCategoryImages,
  pipeSpec,
  chairAddonPrice,
}: TableConfiguratorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Group options by option_group
  const allowedTopCodes = product.allowed_top_categories
    .map((code) => (code === "GRANITE" ? "STONE" : code))
    .filter((code) => code !== "METAL");
  const allTopTabs = options.filter(
    (o) =>
      o.option_group === "TOP_TAB" && CORE_TOP_TAB_CODES.has(o.option_code)
  );
  const matchedTopTabs = allTopTabs.filter(
    (o) => allowedTopCodes.length === 0 || allowedTopCodes.includes(o.option_code)
  );
  const topTabs = matchedTopTabs.length > 0 ? matchedTopTabs : allTopTabs;

  const topMaterials = options.filter(
    (o) =>
      o.option_group === "TOP_MATERIAL" && CORE_TOP_MATERIAL_CODES.has(o.option_code)
  );
  const frameMaterials =
    options.filter((o) => o.option_group === "FRAME_MATERIAL").length > 0
      ? options.filter((o) => o.option_group === "FRAME_MATERIAL")
      : FRAME_MATERIAL_OPTIONS;
  const allGauges = options.filter((o) => o.option_group === "GAUGE");
  const msGauges = allGauges.filter((o) =>
    (MS_GAUGE_CODES as readonly string[]).includes(o.option_code)
  );
  const allFrameColors = options.filter((o) => o.option_group === "FRAME_COLOR");
  const buildTypes = options.filter((o) => o.option_group === "BUILD_TYPE");
  const sizes = options.filter((o) => o.option_group === "SIZE");
  const addons = options.filter(
    (o) =>
      o.option_group === "ADDON" && !HIDDEN_ADDON_CODES.has(o.option_code)
  );

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

  const urlFrameMaterial = searchParams.get("frame_material");
  const initialFrameMaterial: "MS" | "SS" = isFrameMaterial(urlFrameMaterial)
    ? urlFrameMaterial
    : "MS";

  const urlGauge = searchParams.get("gauge");
  const initialGauge =
    initialFrameMaterial === "SS"
      ? "SS202"
      : msGauges.some((g) => g.option_code === urlGauge)
      ? urlGauge!
      : "G16";

  const urlFrameColor = searchParams.get("frame_color");
  const frameColorCodes =
    initialFrameMaterial === "SS" ? SS_FRAME_COLOR_CODES : MS_FRAME_COLOR_CODES;
  const initialFrameColor = allFrameColors.some(
    (c) =>
      c.option_code === urlFrameColor &&
      (frameColorCodes as readonly string[]).includes(c.option_code)
  )
    ? urlFrameColor!
    : initialFrameMaterial === "SS"
    ? "SS_FINISH"
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
  const [selectedFrameMaterial, setSelectedFrameMaterial] = useState<"MS" | "SS">(
    initialFrameMaterial
  );
  const [selectedGauge, setSelectedGauge] = useState<string>(initialGauge);
  const [selectedFrameColor, setSelectedFrameColor] = useState<string>(initialFrameColor);
  const [selectedBuildType, setSelectedBuildType] = useState<string>(initialBuildType);
  const [selectedSize, setSelectedSize] = useState<string>(initialSize);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(initialAddons);
  const [quantity, setQuantity] = useState<number>(initialQuantity);

  const visibleFrameColorCodes =
    selectedFrameMaterial === "SS" ? SS_FRAME_COLOR_CODES : MS_FRAME_COLOR_CODES;
  const frameColors = allFrameColors.filter((option) =>
    (visibleFrameColorCodes as readonly string[]).includes(option.option_code)
  );
  const gauges = selectedFrameMaterial === "MS" ? msGauges : [];
  const isSS = selectedFrameMaterial === "SS";

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
  const [openSection, setOpenSection] = useState<string>(
    topTabs.length > 0
      ? "Top"
      : gauges.length > 0 || frameColors.length > 0
      ? "Frame"
      : sizes.length > 0
      ? "Size"
      : buildTypes.length > 0
      ? "Delivery"
      : "Extras"
  );
  const [pincodeOpen, setPincodeOpen] = useState(false);
  const [pincode, setPincode] = useState("");

  // Live pricing state
  const [priceData, setPriceData] = useState<{
    unit_price?: number;
    total_price?: number;
    bumper_included?: boolean;
    requires_quote?: boolean;
    discount_pct?: number;
  }>({
    bumper_included: false,
    requires_quote: false,
  });

  const [isCalculating, setIsCalculating] = useState<boolean>(true);

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
        router.replace(`₹${params.toString()}`, { scroll: false });
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
            frame_material: selectedFrameMaterial,
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
    selectedFrameMaterial,
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
    setActiveThumbnailIndex(0);
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

  const handleFrameMaterialChange = (material: "MS" | "SS") => {
    const nextColor = material === "SS" ? "SS_FINISH" : "MATTE_BLACK";
    const nextGauge = material === "SS" ? "SS202" : "G16";
    setSelectedFrameMaterial(material);
    setSelectedFrameColor(nextColor);
    setSelectedGauge(nextGauge);
    updateUrlState({
      frame_material: material,
      frame_color: nextColor,
      gauge: nextGauge,
    });
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
      frame_material: selectedFrameMaterial,
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
  const matchedVariant = visualVariants.find(
    (v) =>
      v.top_material_code === selectedTopMaterial &&
      (isSS ? true : v.frame_color === selectedFrameColor)
  );

  const topCategoryKey =
    selectedTopTab === "STONE"
      ? "STONE"
      : selectedTopTab === "WOOD"
      ? "WOOD"
      : selectedTopTab === "FRAME_ONLY"
      ? "FRAME_ONLY"
      : selectedTopTab;

  const readTopCategoryImage = (
    map: Record<string, string> | null | undefined,
    key: string
  ): string | null => {
    if (!map) return null;
    const direct = map[key];
    if (direct) return direct;
    const match = Object.entries(map).find(
      ([entryKey]) => entryKey.toUpperCase() === key.toUpperCase()
    );
    return match?.[1] ?? null;
  };

  const topVariantImage =
    readTopCategoryImage(topCategoryImages, topCategoryKey) ??
    readTopCategoryImage(product.top_category_images ?? null, topCategoryKey);

  const mainImageUrl =
    (activeThumbnailIndex === 0 ? topVariantImage : null) ||
    matchedVariant?.preview_image_url ||
    product.main_image_url;

  const blueprintImage = product.hover_blueprint_img ?? null;
  const lifestyleImages = [
    product.main_image_url,
    ...Object.values(topCategoryImages ?? {}),
    ...Object.values(product.top_category_images ?? {}),
  ].filter(Boolean);

  const hasDistinctBlueprint = Boolean(
    blueprintImage && !lifestyleImages.includes(blueprintImage)
  );

  const activeImage =
    activeThumbnailIndex === 1 && hasDistinctBlueprint && blueprintImage
      ? blueprintImage
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
        { icon: Shield, text: "Reinforced Edge Protection" },
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
        { icon: Layers, text: "100% Seasoned Grade-A Hardwood" },
        { icon: Droplets, text: "Polyurethane Water Guard Seal" },
        { icon: Shield, text: "18mm Finger-Jointed Solid Hardwood" },
        { icon: Sparkles, text: "Natural Grain Architecture" },
      ];
    }
    // FRAME_ONLY
    return [
      { icon: Shield, text: "Heavy Structural Frame" },
      { icon: Zap, text: "Top-Mount Hole Provisions Included" },
      { icon: Layers, text: "Stable Leveling Feet" },
      { icon: Sparkles, text: "Use with Custom Granite / Wood" },
    ];
  };

  const durabilityBadges = renderDurabilityBadges();
  const badgeLine = durabilityBadges
    .slice(0, 3)
    .map((badge) => badge.text)
    .join(" · ");

  const currentFrameMaterialOption = frameMaterials.find(
    (material) => material.option_code === selectedFrameMaterial
  );
  const currentGaugeOption = gauges.find((g) => g.option_code === selectedGauge);
  const currentFrameOption = frameColors.find(
    (c) => c.option_code === selectedFrameColor
  );
  const currentSizeOption = sizes.find((s) => s.option_code === selectedSize);
  const currentTopLabel =
    selectedTopTab === "FRAME_ONLY"
      ? "Frame Only"
      : topTabs.find((tab) => tab.option_code === selectedTopTab)?.label_en ??
        selectedTopTab;

  const gaugeLabel = (option: ConfigOption) => {
    const short = option.label_en.split("(")[0].trim();
    if (option.option_code === "G16") return "16G Recommended";
    return short.replace(" Gauge", "G");
  };

  const section = (
    key: string,
    label: string,
    summary: string,
    body: React.ReactNode
  ) => (
    <div className="border-b border-neutral-200 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpenSection(openSection === key ? "" : key)}
        aria-expanded={openSection === key}
        className="w-full min-h-[44px] flex items-center justify-between gap-4 py-3 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-neutral-800 font-medium truncate">
          <span className="truncate">{summary}</span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform ${
              openSection === key ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>
      {openSection === key && <div className="pb-4 space-y-3">{body}</div>}
    </div>
  );

  return (
    <div data-table-configurator className="pb-24 lg:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-neutral-200 bg-[#F5F5F7] aspect-square">
            {activeThumbnailIndex === 1 && !hasDistinctBlueprint ? (
              <div className="h-full w-full bg-white p-6 flex flex-col justify-center">
                <div className="rounded-md border border-neutral-300 p-5">
                  <p className="text-xs uppercase tracking-wider text-neutral-500">
                    Dimension drawing
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-neutral-800">
                    <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                      <span>Length</span>
                      <span>{Number(product.base_length_ft)} ft</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                      <span>Width</span>
                      <span>{Number(product.base_width_ft)} ft</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                      <span>Height</span>
                      <span>{Number(product.base_height_ft ?? 2.5)} ft</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pipe</span>
                      <span className="text-right max-w-[60%]">{pipeSpec || "Steel tube frame"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <WatermarkedImage
                src={activeImage}
                alt={product.name}
                aspectRatio="square"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveThumbnailIndex(0)}
              aria-label="Product photo"
              className={`min-h-[44px] px-3 rounded-md border text-xs font-semibold ${
                activeThumbnailIndex === 0
                  ? "border-neutral-900 text-neutral-900"
                  : "border-neutral-200 text-neutral-500"
              }`}
            >
              Photo
            </button>
            <button
              type="button"
              onClick={() => setActiveThumbnailIndex(1)}
              aria-label="Blueprint and dimensions"
              className={`min-h-[44px] px-3 rounded-md border text-xs font-semibold ${
                activeThumbnailIndex === 1
                  ? "border-neutral-900 text-neutral-900"
                  : "border-neutral-200 text-neutral-500"
              }`}
            >
              Blueprint
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111]">
              {product.name}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-wider text-neutral-500">
              {product.sku} · Direct SIDCO Coimbatore production
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Direct Factory Price • GST Invoice Available
            </p>

            <div>
              {priceData.requires_quote ? (
                <p className="text-2xl font-black text-[#111111]">Ask on WhatsApp</p>
              ) : priceData.total_price != null ? (
                <p className="text-3xl font-black tracking-tight text-[#111111]">
                  ₹{priceData.total_price.toLocaleString("en-IN")}
                </p>
              ) : (
                <p className="text-sm font-semibold text-neutral-600">
                  {isCalculating ? "Calculating price…" : "Ask on WhatsApp"}
                </p>
              )}

              {quantity > 1 && priceData.unit_price != null && (
                <p className="mt-1 text-xs text-neutral-500">
                  ₹{priceData.unit_price.toLocaleString("en-IN")} per unit
                </p>
              )}

              {quantity >= 4 && !priceData.requires_quote && (
                <p className="mt-1.5 text-xs text-neutral-500">
                  Bulk discount available. Confirm best price on WhatsApp.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleWhatsAppBook}
                disabled={
                  whatsappStatus === "loading" ||
                  pdfStatus === "loading" ||
                  (selectedSize === "CUSTOM" && !customDimsValid)
                }
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                <MessageSquare className="w-4 h-4" />
                {whatsappStatus === "loading" ? "Opening…" : "Book on WhatsApp"}
              </button>
              <button
                type="button"
                onClick={handlePdfDownload}
                disabled={
                  whatsappStatus === "loading" ||
                  pdfStatus === "loading" ||
                  (selectedSize === "CUSTOM" && !customDimsValid)
                }
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] text-white text-sm font-semibold disabled:opacity-60"
              >
                <FileText className="w-4 h-4" />
                {pdfStatus === "loading" ? "Preparing…" : "Download Quote PDF"}
              </button>
            </div>

            {whatsappStatus === "error" && whatsappError && (
              <p aria-live="polite" className="text-xs text-red-700">
                {whatsappError}
              </p>
            )}
            {pdfStatus === "error" && pdfError && (
              <p aria-live="polite" className="text-xs text-red-700">
                {pdfError}
              </p>
            )}
          </div>

          <div className="border-t border-neutral-200">
            {section(
              "Top",
              "Top",
              selectedTopTab === "FRAME_ONLY"
                ? "Frame Only"
                : currentTopOption?.label_en ?? currentTopLabel,
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="Top type">
                  {topTabs.map((tab) => {
                    const shortLabel =
                      tab.option_code === "WOOD"
                        ? "Wood"
                        : tab.option_code === "STONE"
                        ? "Granite"
                        : "Frame Only";
                    return (
                      <button
                        key={tab.option_code}
                        type="button"
                        role="tab"
                        aria-selected={selectedTopTab === tab.option_code}
                        onClick={() => handleTopTabChange(tab.option_code)}
                        className={`min-h-[44px] rounded-md border text-xs font-semibold px-1 ${
                          selectedTopTab === tab.option_code
                            ? "border-neutral-900 text-neutral-900"
                            : "border-neutral-200 text-neutral-600"
                        }`}
                      >
                        {shortLabel}
                      </button>
                    );
                  })}
                </div>

                {selectedTopTab === "FRAME_ONLY" ? (
                  <p className="text-sm text-neutral-600">
                    Bring your own top. Mounting brackets included.
                  </p>
                ) : (
                  <>
                    {Object.entries(materialGroups).map(([groupName, items]) => (
                      <div key={groupName}>
                        <p className="text-xs uppercase tracking-wider text-neutral-400">
                          {groupName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label={groupName}>
                          {items.map((mat) => (
                            <button
                              key={mat.option_code}
                              type="button"
                              role="radio"
                              aria-checked={selectedTopMaterial === mat.option_code}
                              aria-label={mat.label_en}
                              onClick={() => handleTopMaterialChange(mat.option_code)}
                              className="w-11 h-11 flex items-center justify-center"
                            >
                              <span
                                className={`w-10 h-10 rounded-full border ${
                                  selectedTopMaterial === mat.option_code
                                    ? "border-neutral-900 ring-2 ring-neutral-900"
                                    : "border-neutral-300"
                                }`}
                                style={{ backgroundColor: mat.swatch_color_hex || "#E5E5EA" }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-sm text-neutral-900">
                      {currentTopOption?.label_en ?? ""}
                    </p>
                    {badgeLine && (
                      <p className="text-xs text-neutral-500">{badgeLine}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {section(
              "Frame",
              "Frame",
              `${currentFrameMaterialOption?.label_en ?? selectedFrameMaterial} · ${
                currentFrameOption?.label_en ?? ""
              }`,
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Frame material">
                  {frameMaterials.map((material) => {
                    const selected = selectedFrameMaterial === material.option_code;
                    return (
                      <button
                        key={material.option_code}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          handleFrameMaterialChange(
                            material.option_code === "SS" ? "SS" : "MS"
                          )
                        }
                        className={`min-h-[44px] rounded-md border text-xs font-semibold px-2 py-2 ${
                          selected
                            ? "border-neutral-900 text-neutral-900 ring-1 ring-neutral-900"
                            : "border-neutral-200 text-neutral-600"
                        }`}
                      >
                        <span className="block">{material.label_en}</span>
                        {material.badge_text && (
                          <span className="mt-1 inline-block text-[8px] font-extrabold uppercase px-1 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {material.badge_text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedFrameMaterial === "MS" && (
                  <>
                    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Pipe gauge">
                      {gauges.map((gauge) => (
                        <button
                          key={gauge.option_code}
                          type="button"
                          role="radio"
                          aria-checked={selectedGauge === gauge.option_code}
                          onClick={() => handleGaugeChange(gauge.option_code)}
                          className={`min-h-[44px] rounded-md border text-xs font-semibold px-1 ${
                            selectedGauge === gauge.option_code
                              ? "border-neutral-900 text-neutral-900"
                              : "border-neutral-200 text-neutral-600"
                          }`}
                        >
                          {gaugeLabel(gauge)}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500">
                      {currentGaugeOption?.load_kg
                        ? `${currentGaugeOption.load_kg} Kg tested · `
                        : ""}
                      {currentGaugeOption?.warranty_text || product.warranty_text} · Cafe,
                      hotel, IT office
                    </p>
                  </>
                )}

                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Frame colour">
                  {frameColors.map((colour) => (
                    <button
                      key={colour.option_code}
                      type="button"
                      role="radio"
                      aria-checked={selectedFrameColor === colour.option_code}
                      aria-label={colour.label_en}
                      onClick={() => handleFrameColorChange(colour.option_code)}
                      className="min-h-[44px] px-2 flex items-center gap-1.5 rounded-md border border-neutral-200"
                    >
                      <span
                        className={`w-6 h-6 rounded-full border ${
                          selectedFrameColor === colour.option_code
                            ? "border-neutral-900 ring-2 ring-neutral-900"
                            : "border-neutral-300"
                        }`}
                        style={{ backgroundColor: colour.swatch_color_hex || "#E5E5EA" }}
                      />
                      <span className="text-[10px] font-semibold text-neutral-800">
                        {colour.label_en}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">
                  {currentFrameMaterialOption?.warranty_text ||
                    (selectedFrameMaterial === "SS"
                      ? "3-Yr SS Replacement Guarantee"
                      : "3-Yr Welding Warranty")}
                </p>
              </div>
            )}

            {section(
              "Size",
              "Size",
              currentSizeOption?.label_en ?? selectedSize,
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Size">
                  {sizes.map((size) => (
                    <button
                      key={size.option_code}
                      type="button"
                      role="radio"
                      aria-checked={selectedSize === size.option_code}
                      onClick={() => handleSizeChange(size.option_code)}
                      className={`min-h-[44px] px-3 rounded-md border text-xs font-semibold ${
                        selectedSize === size.option_code
                          ? "border-neutral-900 text-neutral-900"
                          : "border-neutral-200 text-neutral-600"
                      }`}
                    >
                      {size.label_en}
                    </button>
                  ))}
                </div>
                {selectedSize === "CUSTOM" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs uppercase tracking-wider text-neutral-500">
                      Length (ft)
                      <input
                        type="number"
                        min="1"
                        max="12"
                        step="0.1"
                        value={customLength}
                        onChange={(event) => handleCustomLengthChange(event.target.value)}
                        onBlur={commitCustomLength}
                        className="mt-1 w-full min-h-[44px] rounded-md border border-neutral-300 px-3 text-sm font-normal text-neutral-900"
                      />
                    </label>
                    <label className="text-xs uppercase tracking-wider text-neutral-500">
                      Width (ft)
                      <input
                        type="number"
                        min="1"
                        max="12"
                        step="0.1"
                        value={customWidth}
                        onChange={(event) => handleCustomWidthChange(event.target.value)}
                        onBlur={commitCustomWidth}
                        className="mt-1 w-full min-h-[44px] rounded-md border border-neutral-300 px-3 text-sm font-normal text-neutral-900"
                      />
                    </label>
                    {!customDimsValid && (
                      <p className="col-span-2 text-xs text-red-700">
                        Enter a length and width between 1 and 12 ft.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    {currentSizeOption?.spec_note || "Standard factory size"}
                  </p>
                )}
              </div>
            )}

            {section(
              "Delivery",
              "Delivery",
              buildTypes.find((b) => b.option_code === selectedBuildType)?.label_en ?? "Select",
              <div className="space-y-3">
                <div className="space-y-1.5" role="radiogroup" aria-label="Delivery type">
                  {buildTypes.map((build) => (
                    <label
                      key={build.option_code}
                      className="min-h-[44px] flex items-start gap-2 rounded-md border border-neutral-200 px-3 py-2"
                    >
                      <input
                        type="radio"
                        name="delivery-type"
                        checked={selectedBuildType === build.option_code}
                        onChange={() => handleBuildTypeChange(build.option_code)}
                        className="mt-1 accent-black"
                      />
                      <span>
                        <span className="block text-sm text-neutral-900">{build.label_en}</span>
                        {build.spec_note && (
                          <span className="block text-xs text-neutral-500">
                            {build.spec_note}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setPincodeOpen((open) => !open)}
                  aria-expanded={pincodeOpen}
                  className="min-h-[44px] text-sm text-neutral-700 underline underline-offset-2"
                >
                  Check delivery to my pincode
                </button>
                {pincodeOpen && (
                  <input
                    value={pincode}
                    onChange={(event) =>
                      setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    placeholder="6-digit pincode"
                    className="w-full min-h-[44px] rounded-md border border-neutral-300 px-3 text-sm"
                  />
                )}
                {pincode.length === 6 && (
                  <p className="text-xs text-neutral-500">
                    Delivery estimate confirmed on WhatsApp.
                  </p>
                )}
              </div>
            )}

            {addons.length > 0 &&
              section(
                "Extras",
                "Optional add-ons",
                quantity > 1 ? `${quantity} units` : "Optional",
                <div className="space-y-1.5">
                  {addons.map((addon) => {
                    const isChair = addon.option_code === "CHAIRS4";
                    const label = isChair
                      ? `+ ₹${(chairAddonPrice ?? 4600).toLocaleString("en-IN")} for 4 matching chairs`
                      : addon.label_en;
                    return (
                      <label
                        key={addon.option_code}
                        className="min-h-[44px] flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-sm text-neutral-900">
                          <input
                            type="checkbox"
                            checked={selectedAddons.includes(addon.option_code)}
                            onChange={() => handleAddonToggle(addon.option_code)}
                            className="accent-black"
                          />
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

            <div className="border-b border-neutral-200 last:border-b-0">
              <div className="min-h-[44px] flex items-center justify-between gap-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Quantity
                </span>
                <div className="flex items-center rounded-md border border-neutral-300">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    aria-label="Decrease quantity"
                    className="w-11 h-11 text-lg"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    aria-label="Increase quantity"
                    className="w-11 h-11 text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Complete the Set
            </p>
            <div className="flex gap-2 overflow-x-auto">
              <Link
                href="/products?category=SS+%26+MS+Chairs"
                className="min-w-[140px] min-h-[64px] rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 flex items-center"
              >
                Matching chairs
              </Link>
              <Link
                href="/sets"
                className="min-w-[140px] min-h-[64px] rounded-md border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-800 flex items-center"
              >
                Ready-made sets
              </Link>
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            SANRA Zero-Shake Telescopic Lock™ (200 Kg Tested)
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-neutral-200 bg-white px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black text-[#111111] truncate">
            {priceData.requires_quote
              ? "Ask on WhatsApp"
              : priceData.total_price != null
              ? `₹${priceData.total_price.toLocaleString("en-IN")}`
              : "Calculating…"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleWhatsAppBook}
          disabled={
            whatsappStatus === "loading" ||
            (selectedSize === "CUSTOM" && !customDimsValid)
          }
          className="min-h-[44px] px-4 rounded-md bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 shrink-0"
        >
          Book on WhatsApp
        </button>
      </div>
    </div>
  );
}