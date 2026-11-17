import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare, ShieldCheck, Truck, Package } from "lucide-react";
import WatermarkedImage from "@/components/WatermarkedImage";
import { supabaseServer } from "@/lib/supabase/server";

interface SkuPageProps {
  params: Promise<{ sku: string }>;
}

// Known fallback SKUs so the page doesn't 404 before DB is seeded
const KNOWN_SKUS: Record<string, {
  name: string;
  category: string;
  base_length_ft: number;
  base_width_ft: number;
  main_image_url: string;
  warranty_text: string;
  is_knockdown_available: boolean;
}> = {
  "IMS-CF-42": {
    name: "Commercial Heavy-Gauge Cafe Table (4x2 ft)",
    category: "Cafe & Dining Tables",
    base_length_ft: 4.0,
    base_width_ft: 2.0,
    main_image_url: "/images/cat-dining-tables.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
  },
  "IMS-WS-425": {
    name: "Zero-Shake Modular Office Workstation (4x2.5 ft)",
    category: "Office & Workstation Tables",
    base_length_ft: 4.0,
    base_width_ft: 2.5,
    main_image_url: "/images/cat-workstations.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
  },
  "IMS-DN-63": {
    name: "Industrial Grade 6-Seater Dining Table (6x3 ft)",
    category: "Cafe & Dining Tables",
    base_length_ft: 6.0,
    base_width_ft: 3.0,
    main_image_url: "/images/hero-workstation.svg",
    warranty_text: "10-Yr MIG Structural Warranty",
    is_knockdown_available: true,
  },
};

export async function generateMetadata({ params }: SkuPageProps): Promise<Metadata> {
  const { sku } = await params;
  const fallback = KNOWN_SKUS[sku.toUpperCase()];
  const name = fallback?.name ?? sku;
  return {
    title: `${name} | SANRA LIVING Factory Direct`,
    description: `Configure and get a live factory price for ${name}. Manufactured in SIDCO Coimbatore with 10-Yr MIG Warranty. Direct WhatsApp enquiry.`,
  };
}

export default async function SkuPage({ params }: SkuPageProps) {
  const { sku } = await params;
  const upperSku = sku.toUpperCase();

  // Try to fetch from DB first
  let product: {
    id: string;
    sku: string;
    name: string;
    category: string;
    base_length_ft: number;
    base_width_ft: number;
    main_image_url: string;
    warranty_text: string;
    is_knockdown_available: boolean;
  } | null = null;

  try {
    const { data, error } = await supabaseServer
      .from("products")
      .select(
        "id, sku, name, category, base_length_ft, base_width_ft, main_image_url, warranty_text, is_knockdown_available"
      )
      .eq("sku", upperSku)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      product = {
        id: data.id,
        sku: data.sku,
        name: data.name,
        category: data.category,
        base_length_ft: Number(data.base_length_ft),
        base_width_ft: Number(data.base_width_ft),
        main_image_url: data.main_image_url,
        warranty_text: data.warranty_text,
        is_knockdown_available: data.is_knockdown_available,
      };
    }
  } catch {
    // Fallthrough to fallback
  }

  // Fall back to hardcoded list (for pre-seed or offline)
  if (!product && KNOWN_SKUS[upperSku]) {
    product = {
      id: `fallback-${upperSku}`,
      sku: upperSku,
      ...KNOWN_SKUS[upperSku],
    };
  }

  // Unknown SKU — proper 404
  if (!product) {
    notFound();
  }

  const whatsappText = `Hello SANRA LIVING Factory Desk,\nI am interested in: ${product.name} (SKU: ${product.sku})\nPlease share live pricing and availability.`;
  const whatsappUrl = `https://wa.me/91XXXXXXXXXX?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="bg-[#FFFFFF] min-h-[70vh] py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Product Image */}
          <div>
            <div className="rounded-xl overflow-hidden border border-neutral-200 bg-[#F5F5F7]">
              <WatermarkedImage
                src={product.main_image_url}
                alt={product.name}
                aspectRatio="square"
                priority
              />
            </div>
            {/* SKU badge */}
            <p className="mt-3 text-center text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
              SKU: {product.sku} • SIDCO Coimbatore Factory Unit
            </p>
          </div>

          {/* Product Details & Configurator Placeholder */}
          <div className="space-y-6">
            {/* Category Tag */}
            <div>
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full">
                {product.category}
              </span>
            </div>

            {/* Product Name */}
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Dimensions */}
            <div className="flex items-center gap-3 text-sm font-semibold text-neutral-600">
              <span>Base size: {product.base_length_ft} × {product.base_width_ft} ft</span>
              <span className="text-neutral-300">|</span>
              <span>Custom sizes available</span>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 p-3 bg-[#F5F5F7] rounded-lg border border-neutral-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#111111]">{product.warranty_text}</p>
                  <p className="text-[11px] text-neutral-500">Structural MIG weld guarantee</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3 bg-[#F5F5F7] rounded-lg border border-neutral-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#111111]">200 Kg Tested Lock</p>
                  <p className="text-[11px] text-neutral-500">SANRA Zero-Shake Telescopic Lock™</p>
                </div>
              </div>
              {product.is_knockdown_available && (
                <div className="flex items-start gap-2.5 p-3 bg-[#F5F5F7] rounded-lg border border-neutral-200">
                  <Package className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-[#111111]">5-Min Flat-Pack</p>
                    <p className="text-[11px] text-neutral-500">Pan-India courier dispatch</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5 p-3 bg-[#F5F5F7] rounded-lg border border-neutral-200">
                <Truck className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#111111]">Fully Welded Tempo</p>
                  <p className="text-[11px] text-neutral-500">Local Coimbatore delivery</p>
                </div>
              </div>
            </div>

            {/* Configurator Coming Next Banner */}
            <div className="p-5 rounded-xl bg-[#111111] text-white text-center">
              <span className="block text-[11px] font-extrabold uppercase tracking-widest text-neutral-400 mb-2">
                Configurator Coming Soon
              </span>
              <p className="text-sm font-semibold text-neutral-200 leading-relaxed">
                Our live price configurator — material picker, size selector, frame finish chooser and instant WhatsApp quote — is being built for this page.
              </p>
              <p className="mt-1.5 text-xs text-neutral-500">
                In the meantime, get an instant quote directly from our SIDCO factory desk.
              </p>
            </div>

            {/* WhatsApp CTA */}
            <div className="space-y-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider transition-colors shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                Get Live Factory Quote on WhatsApp
              </a>
              <p className="text-[11px] text-center text-neutral-500">
                Direct Factory Price • GST Invoice Available • No online checkout
              </p>
            </div>

            {/* Back to Catalog */}
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
      </div>
    </div>
  );
}
