"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, ShieldCheck, Check, Truck, Package, Info } from "lucide-react";

interface VariantOption {
  materialCode: string;
  name: string;
  category: "WOOD" | "STONE" | "METAL";
}

interface ProductConfiguratorProps {
  productId: string;
  productName: string;
  sku: string;
  defaultBasePrice?: number;
  availableSizes?: { label: string; multiplier: number }[];
  isKnockdownAvailable?: boolean;
}

const TOP_OPTIONS: VariantOption[] = [
  {
    materialCode: "WOOD_RUBBER_18",
    name: "100% Seasoned Grade-A Kerala Rubberwood",
    category: "WOOD",
  },
  {
    materialCode: "GRANITE_JET_BLACK",
    name: "18mm Export-Grade Krishnagiri Jet Black Granite",
    category: "STONE",
  },
  {
    materialCode: "PRELAM_25",
    name: "25mm Prelam High-Density Board",
    category: "WOOD",
  },
];

const FRAME_COLORS = [
  { code: "MATTE_BLACK", label: "Matte Black", hex: "#111111" },
  { code: "GREY", label: "Industrial Grey", hex: "#4B5563" },
  { code: "WHITE", label: "Pure White", hex: "#F3F4F6" },
  { code: "SS", label: "Jindal SS Brushed", hex: "#D1D5DB" },
];

export default function ProductConfigurator({
  productId,
  productName,
  sku,
  defaultBasePrice = 3450,
  availableSizes = [
    { label: "Standard Size (1.0x)", multiplier: 1.0 },
    { label: "Large Frame (1.25x)", multiplier: 1.25 },
  ],
  isKnockdownAvailable = true,
}: ProductConfiguratorProps) {
  const [selectedTop, setSelectedTop] = useState(TOP_OPTIONS[0]);
  const [selectedFrame, setSelectedFrame] = useState(FRAME_COLORS[0]);
  const [selectedSize, setSelectedSize] = useState(availableSizes[0]);
  const [deliveryType, setDeliveryType] = useState<"TEMPO" | "FLATPACK">("FLATPACK");
  const [customerTier, setCustomerTier] = useState<"RETAIL" | "B2B">("RETAIL");

  const [priceData, setPriceData] = useState<{
    finalPrice: number;
    gstAmount: number;
    totalWithGst: number;
  }>({
    finalPrice: defaultBasePrice,
    gstAmount: Math.round(defaultBasePrice * 0.18),
    totalWithGst: Math.round(defaultBasePrice * 1.18),
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function fetchLiveQuote() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            topMaterialCode: selectedTop.materialCode,
            frameMaterialCode: selectedFrame.code === "SS" ? "SS_304" : "MS_CR",
            sizeMultiplier: selectedSize.multiplier,
            customerType: customerTier,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && !isCancelled) {
            setPriceData({
              finalPrice: json.data.finalPrice,
              gstAmount: json.data.gstAmount,
              totalWithGst: json.data.totalWithGst,
            });
          }
        }
      } catch (err) {
        // graceful fallback to local formula
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    fetchLiveQuote();

    return () => {
      isCancelled = true;
    };
  }, [productId, selectedTop, selectedFrame, selectedSize, customerTier]);

  // Construct structured WhatsApp message
  const whatsappText = `Hello SANRA LIVING Factory Desk,
I would like to place an order / receive an official proforma invoice for:

• Product: ${productName} (SKU: ${sku})
• Top Material: ${selectedTop.name}
• Frame Color: ${selectedFrame.label}
• Size Spec: ${selectedSize.label}
• Customer Type: ${customerTier === "B2B" ? "B2B / Architect" : "Retail Commercial"}
• Delivery Preference: ${
    deliveryType === "TEMPO"
      ? "Fully Welded (Local Coimbatore Tempo)"
      : "5-Min Flat-Pack Knock-Down (Pan-India Courier)"
  }
• Factory Price (excl. GST): ₹${priceData.finalPrice.toLocaleString("en-IN")}
• Total Incl. 18% GST: ₹${priceData.totalWithGst.toLocaleString("en-IN")}

Please confirm dispatch timeline and payment proforma invoice.`;

  const whatsappUrl = `https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-500">
            Interactive Configurator
          </span>
          <h3 className="text-xl font-black text-[#111111] tracking-tight">
            Configure Your Frame
          </h3>
        </div>

        {/* Customer Tier Toggle */}
        <div className="inline-flex p-1 bg-neutral-100 rounded-lg border border-neutral-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCustomerTier("RETAIL")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              customerTier === "RETAIL"
                ? "bg-white text-black shadow-xs font-bold"
                : "text-neutral-500 hover:text-black"
            }`}
          >
            Direct Retail
          </button>
          <button
            type="button"
            onClick={() => setCustomerTier("B2B")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              customerTier === "B2B"
                ? "bg-black text-white shadow-xs font-bold"
                : "text-neutral-500 hover:text-black"
            }`}
          >
            B2B / Volume
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Size Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2.5">
            Frame Dimension
          </label>
          <div className="grid grid-cols-2 gap-3">
            {availableSizes.map((size) => (
              <button
                key={size.label}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`flex items-center justify-between p-3.5 rounded-lg border text-left text-xs font-semibold transition-all ${
                  selectedSize.label === size.label
                    ? "border-black bg-neutral-50 ring-1 ring-black text-black"
                    : "border-neutral-200 hover:border-neutral-400 text-neutral-700 bg-white"
                }`}
              >
                <span>{size.label}</span>
                {selectedSize.label === size.label && (
                  <Check className="w-4 h-4 text-black shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Top Surface Material */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2.5">
            Top Surface Sourcing
          </label>
          <div className="space-y-2">
            {TOP_OPTIONS.map((top) => (
              <button
                key={top.materialCode}
                type="button"
                onClick={() => setSelectedTop(top)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-all ${
                  selectedTop.materialCode === top.materialCode
                    ? "border-black bg-neutral-50 ring-1 ring-black font-bold text-black"
                    : "border-neutral-200 hover:border-neutral-400 text-neutral-700 bg-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full border border-black/20 ${
                      top.category === "WOOD"
                        ? "bg-amber-700"
                        : top.category === "STONE"
                        ? "bg-neutral-900"
                        : "bg-neutral-400"
                    }`}
                  />
                  <span>{top.name}</span>
                </div>
                {selectedTop.materialCode === top.materialCode && (
                  <Check className="w-4 h-4 text-black shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Frame Finish */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2.5">
            Frame Powder-Coat & Material Finish
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {FRAME_COLORS.map((col) => (
              <button
                key={col.code}
                type="button"
                onClick={() => setSelectedFrame(col)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                  selectedFrame.code === col.code
                    ? "border-black bg-neutral-50 ring-1 ring-black font-bold text-black"
                    : "border-neutral-200 hover:border-neutral-400 text-neutral-700 bg-white"
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full border border-neutral-300 mb-1.5"
                  style={{ backgroundColor: col.hex }}
                />
                <span className="text-[11px] leading-tight">{col.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Delivery Method */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2.5">
            Assembly & Dispatch Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryType("FLATPACK")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                deliveryType === "FLATPACK"
                  ? "border-black bg-neutral-50 ring-1 ring-black"
                  : "border-neutral-200 hover:border-neutral-400 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-black mb-1">
                <Package className="w-4 h-4" />
                <span>5-Min Flat-Pack Knock-Down</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Pan-India courier crate dispatch. SANRA Zero-Shake Telescopic Lock™.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryType("TEMPO")}
              className={`p-3.5 rounded-lg border text-left transition-all ${
                deliveryType === "TEMPO"
                  ? "border-black bg-neutral-50 ring-1 ring-black"
                  : "border-neutral-200 hover:border-neutral-400 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs text-black mb-1">
                <Truck className="w-4 h-4" />
                <span>Fully Welded (Tempo)</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-snug">
                Direct factory tempo dispatch in Coimbatore & surrounding districts.
              </p>
            </button>
          </div>
        </div>

        {/* Live Factory Pricing Box */}
        <div className="p-5 rounded-xl bg-[#F5F5F7] border border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-neutral-600 bg-neutral-200 px-2 py-0.5 rounded mb-1">
                Direct Factory Price • GST Invoice Available
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-[#111111] tracking-tight">
                  ₹{priceData.finalPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-neutral-500 font-medium">excl. GST</span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                +18% GST (₹{priceData.gstAmount.toLocaleString("en-IN")}) ={" "}
                <strong className="text-black">
                  ₹{priceData.totalWithGst.toLocaleString("en-IN")}
                </strong>{" "}
                with tax invoice
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                SIDCO Factory Live Rate
              </span>
            </div>
          </div>
        </div>

        {/* Strict Content Rule: WhatsApp Enquiry Only */}
        <div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider transition-colors shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            Enquire & Order on WhatsApp
          </a>
          <p className="text-[11px] text-center text-neutral-500 mt-2">
            No upfront online checkout. All proforma invoices and dispatch dates are confirmed directly via our factory WhatsApp desk.
          </p>
        </div>

        {/* Guarantees */}
        <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-3 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>10-Yr Structural MIG Warranty</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>200 Kg Load Tested Lock</span>
          </div>
        </div>
      </div>
    </div>
  );
}
