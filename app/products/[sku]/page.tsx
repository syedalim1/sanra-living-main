import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WatermarkedImage from "@/components/WatermarkedImage";
import TableConfigurator from "@/components/TableConfigurator";
import { supabaseServer } from "@/lib/supabase/server";
import { FALLBACK_OPTIONS, ConfigOption } from "@/lib/configuratorOptions";

interface SkuPageProps {
  params: Promise<{ sku: string }>;
}

// Fallback known products for offline / pre-seed verification
const KNOWN_PRODUCTS: Record<
  string,
  {
    id: string;
    sku: string;
    name: string;
    category: string;
    product_type: string;
    base_length_ft: number;
    base_width_ft: number;
    main_image_url: string;
    hover_blueprint_img?: string | null;
    warranty_text: string;
    is_knockdown_available: boolean;
    allowed_top_categories: string[];
    top_overlay_note?: string | null;
  }
> = {
  "IMS-CF-42": {
    id: "fb-cafe-42",
    sku: "IMS-CF-42",
    name: "Commercial Heavy-Gauge Cafe Table (4x2 ft)",
    category: "Cafe & Dining Tables",
    product_type: "TABLE",
    base_length_ft: 4.0,
    base_width_ft: 2.0,
    main_image_url: "/images/cat-dining-tables.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"],
    top_overlay_note: "Paired with 18mm Kerala Rubberwood or 18mm Export Krishnagiri Granite",
  },
  "IMS-WS-425": {
    id: "fb-ws-425",
    sku: "IMS-WS-425",
    name: "Zero-Shake Modular Office Workstation (4x2.5 ft)",
    category: "Office & Workstation Tables",
    product_type: "TABLE",
    base_length_ft: 4.0,
    base_width_ft: 2.5,
    main_image_url: "/images/cat-workstations.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "METAL"],
    top_overlay_note: "Engineered for dual-monitor setups with cable management channel",
  },
  "IMS-DN-63": {
    id: "fb-dn-63",
    sku: "IMS-DN-63",
    name: "Industrial Grade 6-Seater Dining Table (6x3 ft)",
    category: "Cafe & Dining Tables",
    product_type: "TABLE",
    base_length_ft: 6.0,
    base_width_ft: 3.0,
    main_image_url: "/images/hero-workstation.svg",
    hover_blueprint_img: "/images/hero-workstation.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
    allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"],
    top_overlay_note: "Heavy-duty cross-braced frame supporting up to 200 Kg load",
  },
};

export async function generateMetadata({ params }: SkuPageProps): Promise<Metadata> {
  const { sku } = await params;
  const upperSku = sku.toUpperCase();
  const fallback = KNOWN_PRODUCTS[upperSku];
  const name = fallback?.name ?? upperSku;
  return {
    title: `${name} | SANRA LIVING Factory Direct`,
    description: `Configure ${name} with live factory prices. Heavy structural steel frames made in SIDCO Coimbatore with 10-Yr MIG Warranty.`,
  };
}

export default async function SkuPage({ params }: SkuPageProps) {
  const { sku } = await params;
  const upperSku = sku.toUpperCase();

  let product: any = null;
  let visualVariants: any[] = [];
  let configuratorOptions: ConfigOption[] = FALLBACK_OPTIONS;

  try {
    const { data: prodData } = await supabaseServer
      .from("products")
      .select("*")
      .eq("sku", upperSku)
      .eq("is_active", true)
      .maybeSingle();

    if (prodData) {
      product = {
        id: prodData.id,
        sku: prodData.sku,
        name: prodData.name,
        category: prodData.category,
        product_type: prodData.product_type,
        base_length_ft: Number(prodData.base_length_ft),
        base_width_ft: Number(prodData.base_width_ft),
        main_image_url: prodData.main_image_url,
        hover_blueprint_img: prodData.hover_blueprint_img,
        warranty_text: prodData.warranty_text,
        is_knockdown_available: prodData.is_knockdown_available,
        allowed_top_categories: Array.isArray(prodData.allowed_top_categories)
          ? prodData.allowed_top_categories
          : ["FRAME_ONLY", "WOOD", "STONE"],
        top_overlay_note: prodData.top_overlay_note,
      };

      const { data: vData } = await supabaseServer
        .from("product_visual_variants")
        .select("top_material_code, frame_color, preview_image_url, size_option")
        .eq("product_id", prodData.id);

      if (vData) {
        visualVariants = vData;
      }

      const { data: oData } = await supabaseServer
        .from("configurator_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (oData && oData.length > 0) {
        configuratorOptions = oData;
      }
    }
  } catch {
    // Fail silently to fallbacks
  }

  // Pre-seed fallback
  if (!product && KNOWN_PRODUCTS[upperSku]) {
    product = KNOWN_PRODUCTS[upperSku];
  }

  // Unknown SKU -> 404
  if (!product) {
    notFound();
  }

  // SCOPE CHECK: Only product_type === 'TABLE' gets the interactive configurator
  const isTable = product.product_type === "TABLE";

  return (
    <div className="bg-[#FFFFFF] min-h-[70vh] py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-8 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-black transition-colors">
            Catalog
          </Link>
          <span>/</span>
          <span className="text-neutral-800">{product.sku}</span>
        </div>

        {isTable ? (
          /* ================= INTERACTIVE TABLE CONFIGURATOR ================= */
          <TableConfigurator
            product={product}
            options={configuratorOptions}
            visualVariants={visualVariants}
          />
        ) : (
          /* ================= NON-TABLE PLACEHOLDER VIEW ================= */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <div className="rounded-xl overflow-hidden border border-neutral-200 bg-[#F5F5F7]">
                <WatermarkedImage
                  src={product.main_image_url}
                  alt={product.name}
                  aspectRatio="square"
                  priority
                />
              </div>
              <p className="mt-3 text-center text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
                SKU: {product.sku} • SIDCO Coimbatore Factory Unit
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full">
                  {product.category}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 text-sm font-semibold text-neutral-600">
                <span>Standard size: {product.base_length_ft} × {product.base_width_ft} ft</span>
                <span className="text-neutral-300">|</span>
                <span>Custom sizes available</span>
              </div>

              <div className="p-5 rounded-xl bg-[#111111] text-white text-center">
                <span className="block text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-2">
                  Configurator Coming Soon
                </span>
                <p className="text-sm font-semibold text-neutral-200 leading-relaxed">
                  Interactive customizer for {product.category.toLowerCase()} is being engineered for direct SIDCO dispatch.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black uppercase tracking-wider transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Full Catalog
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
