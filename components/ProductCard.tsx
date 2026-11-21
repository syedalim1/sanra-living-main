"use client";

import React, { useState } from "react";
import Link from "next/link";
import { productPath } from "@/lib/site";
import WatermarkedImage from "./WatermarkedImage";
import { ArrowRight, RefreshCw } from "lucide-react";

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  product_type: string;
  base_length_ft: number;
  base_width_ft: number;
  main_image_url: string | null;
  hover_blueprint_img?: string | null;
  from_price: number | null;
  use_cases?: string[];
  material_tags?: string[];
}

interface ProductCardProps {
  product: CatalogProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [touchBlueprintActive, setTouchBlueprintActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasBlueprint = Boolean(product.hover_blueprint_img);

  // Active image depending on hover (desktop) or touch toggle (mobile)
  const showBlueprint = hasBlueprint && (isHovered || touchBlueprintActive);
  const currentImage =
    showBlueprint && product.hover_blueprint_img
      ? product.hover_blueprint_img
      : product.main_image_url;

  return (
    <div
      className="group bg-white rounded-lg border border-neutral-200 overflow-hidden flex flex-col hover:border-neutral-400 hover:shadow-md transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container with 2-Photo Swap */}
      <div className="relative overflow-hidden bg-neutral-100 aspect-video select-none">
        <Link href={productPath(product.sku)} className="block w-full h-full">
          <WatermarkedImage
            key={currentImage ?? "catalog-image"}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={currentImage}
            fallbackSrc={product.main_image_url}
            alt={product.name}
            aspectRatio="video"
            className="w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>

        {/* Blueprint Indicator Tag when active */}
        {showBlueprint && (
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded shadow-xs">
              Blueprint View
            </span>
          </div>
        )}

        {/* Touch Devices: Toggle Dimensions Button */}
        {hasBlueprint && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTouchBlueprintActive(!touchBlueprintActive);
            }}
            className="md:hidden absolute bottom-2.5 right-2.5 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-white/95 text-neutral-800 rounded-md border border-neutral-300 shadow-sm backdrop-blur-xs active:bg-neutral-100"
            aria-label="Toggle dimension blueprint"
          >
            <RefreshCw className="w-3 h-3 text-neutral-600" />
            <span>{touchBlueprintActive ? "Main Photo" : "Dimensions"}</span>
          </button>
        )}
      </div>

      {/* Card Details */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          {/* Direct Factory Badge */}
          <div className="mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Direct Factory Price • GST Invoice Available
            </span>
          </div>

          {/* Product Name */}
          <h3 className="text-base font-bold text-[#111111] tracking-tight group-hover:text-neutral-700 transition-colors line-clamp-2">
            <Link href={productPath(product.sku)}>{product.name}</Link>
          </h3>

          {/* Size line */}
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-neutral-500">
            <span>
              {product.base_length_ft} x {product.base_width_ft} ft
            </span>
            <span>•</span>
            <span>{product.category}</span>
          </div>

          {/* Large Price Display */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-baseline gap-1.5">
            {product.from_price !== null ? (
              <>
                <span className="text-xs uppercase font-extrabold tracking-wider text-neutral-500">
                  From
                </span>
                <span className="text-2xl font-black text-[#111111] tracking-tight">
                  ₹{product.from_price.toLocaleString("en-IN")}
                </span>
              </>
            ) : (
              <span className="text-sm font-bold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded">
                Ask on WhatsApp
              </span>
            )}
          </div>
        </div>

        {/* Primary Action Button linking to /products/[sku] */}
        <div className="mt-5 pt-3">
          <Link
            href={productPath(product.sku)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#111111] hover:bg-neutral-800 text-white font-semibold text-xs uppercase tracking-wider rounded transition-colors shadow-xs"
          >
            <span>Customize & See Live Price</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
