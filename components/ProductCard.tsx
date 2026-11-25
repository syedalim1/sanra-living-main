"use client";

import { useState } from "react";
import Link from "next/link";
import { Ruler } from "lucide-react";
import { productPath } from "@/lib/site";
import WatermarkedImage from "./WatermarkedImage";

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

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const [selectedView, setSelectedView] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const hasAlternate = Boolean(product.hover_blueprint_img);
  const alternate = hasAlternate && (selectedView ?? hovered);
  const image = alternate ? product.hover_blueprint_img : product.main_image_url;
  const href = productPath(product.sku);

  return (
    <article className="sanra-product-card">
      <div
        className="sanra-product-card-photo"
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
        onPointerLeave={() => setHovered(false)}
      >
        <Link href={href} className="block" aria-label={product.name}>
          <WatermarkedImage
            key={image ?? "catalog-image"}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 34vw"
            src={image}
            fallbackSrc={product.main_image_url}
            alt={alternate ? `${product.name}, alternate view` : product.name}
            aspectRatio="video"
            className="sanra-product-card-view"
          />
        </Link>
        {hasAlternate && (
          <button
            type="button"
            className="sanra-product-view-toggle"
            aria-label="Alternate product view"
            aria-pressed={alternate}
            onClick={() => setSelectedView(!alternate)}
          >
            <Ruler size={15} aria-hidden="true" />
            {alternate ? "Main photo" : "Alternate view"}
          </button>
        )}
      </div>
      <div className="sanra-product-card-copy">
        <p className="sanra-label">{product.category}</p>
        <h3><Link href={href}>{product.name}</Link></h3>
        {product.base_length_ft > 0 && product.base_width_ft > 0 && (
          <p className="sanra-product-dimensions">{product.base_length_ft} × {product.base_width_ft} ft</p>
        )}
        <div className="sanra-product-card-bottom">
          <strong>{product.from_price == null ? "On request" : `From ₹${product.from_price.toLocaleString("en-IN")}`}</strong>
          <Link href={href} className="sanra-text-link" aria-label={`Configure ${product.name}`}>Configure</Link>
        </div>
      </div>
    </article>
  );
}
