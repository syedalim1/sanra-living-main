import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Factory,
  FileCheck2,
  MessageCircle,
  Package,
  ShieldCheck,
} from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import SampleRequestForm from "@/components/b2b/SampleRequestForm";
import B2BOrderToolsLoader from "@/components/b2b/B2BOrderToolsLoader";
import B2BPriceGate from "@/components/b2b/B2BPriceGate";
import CadDownloads from "@/components/b2b/CadDownloads";
import { supabaseServer } from "@/lib/supabase/server";
import { company, whatsappHref } from "@/lib/company";
import { FALLBACK_OPTIONS, type ConfigOption } from "@/lib/configuratorOptions";
import {
  FALLBACK_GROUPS,
  PRODUCT_TYPES,
  isProductType,
  type OptionGroupRow,
} from "@/lib/productTypeConfig";
import type { B2BCadFile, B2BProduct } from "@/lib/b2b/types";

export const instant = false;

export const metadata: Metadata = {
  title: "Projects & B2B | SANRA LIVING",
  description:
    "Factory-direct steel furniture for cafes, offices, hostels, hospitals and architects. Request samples, estimate room layouts, build a bulk order sheet and download CAD models.",
  alternates: { canonical: "/b2b" },
  openGraph: {
    title: "Projects & B2B | SANRA LIVING",
    description: "Samples, room estimates, bulk order sheets and CAD models for commercial furniture projects.",
    url: "/b2b",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "SANRA LIVING projects desk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Projects & B2B | SANRA LIVING",
    description: "Samples, room estimates, bulk order sheets and CAD models for commercial furniture projects.",
    images: ["/og-default.png"],
  },
};

const FALLBACK_PRODUCTS: B2BProduct[] = [
  { id: "fb-cafe", sku: "IMS-CF-42", name: "Commercial Heavy-Gauge Cafe Table (4x2 ft)", product_type: "TABLE", allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"] },
  { id: "fb-ws", sku: "IMS-WS-425", name: "Zero-Shake Modular Office Workstation (4x2.5 ft)", product_type: "TABLE", allowed_top_categories: ["FRAME_ONLY", "WOOD", "METAL"] },
  { id: "fb-dining", sku: "IMS-DN-63", name: "Industrial Grade 6-Seater Dining Table (6x3 ft)", product_type: "TABLE", allowed_top_categories: ["FRAME_ONLY", "WOOD", "STONE"] },
  { id: "fb-chair", sku: "IMS-CH-01", name: "Cafe Chair", product_type: "CHAIR", allowed_top_categories: [] },
  { id: "fb-bar", sku: "IMS-CH-BS", name: "Bar Stool", product_type: "CHAIR", allowed_top_categories: [] },
  { id: "fb-stand", sku: "IMS-ST-12", name: "12-inch Stool", product_type: "STAND", allowed_top_categories: [] },
  { id: "fb-inverter", sku: "IMS-ST-INV", name: "Inverter Stand", product_type: "STAND", allowed_top_categories: [] },
  { id: "fb-kadai", sku: "IMS-ST-KD", name: "Kadai Stand", product_type: "STAND", allowed_top_categories: [] },
  { id: "fb-rack", sku: "IMS-RK-01", name: "Boutique Garment Rack", product_type: "RACK", allowed_top_categories: [] },
  { id: "fb-ss", sku: "IMS-SS-CT", name: "SS Canteen Table", product_type: "SS_UNIT", allowed_top_categories: [] },
];

const WHY_CARDS = [
  {
    icon: Factory,
    title: "Direct SIDCO Coimbatore Factory",
    body: "One production line from cutting to finishing, without showroom layers.",
  },
  {
    icon: FileCheck2,
    title: "GST Invoice Available",
    body: "Commercial GST invoicing for business procurement.",
  },
  {
    icon: ShieldCheck,
    title: "Steel pipe options",
    body: "Material choices with a 3-Yr welding warranty on qualifying MS frames.",
  },
  {
    icon: Package,
    title: "Flat-Pack for Pan-India projects",
    body: "Knock-down options for multi-city rollouts and courier-friendly dispatch.",
  },
];

export default async function B2BPage() {
  await connection();

  const [productResult, groupResult, optionResult, cadResult, pricingResult] = await Promise.all([
    supabaseServer
      .from("products")
      .select("id, sku, name, product_type, allowed_top_categories")
      .eq("is_active", true)
      .order("sort_order"),
    supabaseServer
      .from("product_type_option_groups")
      .select("*")
      .order("sort_order"),
    supabaseServer
      .from("configurator_options")
      .select(
        "option_group, option_code, parent_code, label_en, swatch_color_hex, warranty_text, badge_text, sort_order"
      )
      .eq("is_active", true)
      .order("sort_order"),
    supabaseServer
      .from("cad_files")
      .select("id, title, description, file_type, product_sku")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabaseServer.from("product_pricing_rules").select("product_id"),
  ]);

  const products: B2BProduct[] =
    productResult.data && productResult.data.length > 0
      ? productResult.data
          .filter((row) => isProductType(row.product_type))
          .map((row) => ({
            id: row.id,
            sku: row.sku,
            name: row.name,
            product_type: row.product_type,
            allowed_top_categories: Array.isArray(row.allowed_top_categories)
              ? row.allowed_top_categories
              : [],
          }))
      : FALLBACK_PRODUCTS;

  const pricedProductIds = new Set(
    (pricingResult.data ?? []).map((row) => row.product_id as string)
  );
  const bulkProducts =
    !pricingResult.error && productResult.data && productResult.data.length > 0
      ? products.filter((product) => pricedProductIds.has(product.id))
      : products;

  const groups: OptionGroupRow[] =
    groupResult.data && groupResult.data.length > 0
      ? (groupResult.data as OptionGroupRow[])
      : PRODUCT_TYPES.flatMap((type) => FALLBACK_GROUPS[type]);

  const options: ConfigOption[] =
    optionResult.data && optionResult.data.length > 0
      ? (optionResult.data as ConfigOption[])
      : FALLBACK_OPTIONS;

  const productNames = new Map(
    products.map((product) => [product.sku, product.name])
  );

  const cadFiles: B2BCadFile[] =
    cadResult.data && cadResult.data.length > 0
      ? cadResult.data.map((file) => ({
          id: file.id,
          title: file.title,
          description: file.description ?? null,
          file_type: file.file_type as "SKP" | "DWG",
          product_sku: file.product_sku ?? null,
          product_name: file.product_sku
            ? productNames.get(file.product_sku) ?? file.product_sku
            : null,
        }))
      : [];

  const projectWhatsApp = whatsappHref(
    "Hi SANRA LIVING, I'd like to talk to your project team about a bulk furniture requirement."
  );

  return (
    <div className="sanra-subpage min-h-[70vh]">
      <div className="sanra-container py-8 md:py-12">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-black uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>

        <section className="sanra-trade-masthead">
          <div className="max-w-3xl space-y-5 relative z-10">
            <span className="sanra-label flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Projects & Commercial
            </span>
            <h1 className="sanra-display">
              Trade &amp; projects.
            </h1>
            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl">
              One factory desk for samples, room estimates, bulk pricing and CAD
              references. Built in SIDCO Coimbatore for projects across India.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="#sample"
                className="sanra-button sanra-button--paper"
              >
                Request Sample
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="#bulk"
                className="sanra-button sanra-button--rust"
              >
                Build Bulk Quote
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-12">
          <SectionHeading
            badge="Project Advantages"
            title="Why SANRA for projects"
            subtitle="Straight factory coordination, clear commercial documents and project-ready dispatch options."
            align="left"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {WHY_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="sanra-trade-benefit space-y-3"
                >
                  <Icon className="w-6 h-6 text-neutral-800" />
                  <h3 className="text-sm font-bold text-[#111111]">{card.title}</h3>
                  <p className="text-[11px] text-neutral-600 leading-relaxed">
                    {card.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="sample" className="scroll-mt-24 pb-10 md:pb-12">
          <SectionHeading
            badge="Express Sample Request"
            title="See and feel the material first"
            subtitle="Tell us what you need. Express sample requests are prioritized."
            align="left"
          />
          <div className="mt-6 bg-white rounded-xl border border-neutral-200 p-5 sm:p-7">
            <SampleRequestForm
              products={products}
              whatsappNumber={company.whatsappNumber}
            />
          </div>
        </section>

        <div className="space-y-8 pb-10 md:pb-12">
          <B2BPriceGate>
            <B2BOrderToolsLoader
              products={bulkProducts}
              groups={groups}
              options={options}
              whatsappNumber={company.whatsappNumber}
            />
          </B2BPriceGate>
        </div>

        <section id="cad" className="scroll-mt-24 pb-10 md:pb-12">
          <SectionHeading
            badge="CAD Library"
            title="Free 3D CAD / SketchUp Models"
            subtitle="Use our models as a design starting point for your drawings and layouts."
            align="left"
          />
          <div className="mt-6">
            <CadDownloads
              files={cadFiles}
              whatsappNumber={company.whatsappNumber}
            />
          </div>
        </section>

        <section className="sanra-quote p-6 sm:p-8 text-center space-y-4">
          <MessageCircle className="w-8 h-8 mx-auto" />
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Need a project conversation?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-50 max-w-xl mx-auto leading-relaxed">
            Share your room list, BOQ or drawing set with our project team on
            WhatsApp.
          </p>
          <a
            href={projectWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-emerald-800 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-50"
          >
            <MessageCircle className="w-4 h-4" />
            Talk to our project team
          </a>
        </section>
      </div>
    </div>
  );
}
