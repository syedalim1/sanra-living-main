import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Flame,
  Boxes,
  ShieldAlert,
  ScanLine,
  UtensilsCrossed,
  Coffee,
  Cake,
  HeartHandshake,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import TrustBar from "@/components/TrustBar";
import SectionHeading from "@/components/SectionHeading";
import CategoryCard from "@/components/CategoryCard";
import WatermarkedImage from "@/components/WatermarkedImage";
import { company, whatsappHref, SOCIAL } from "@/lib/company";
import { SITE_URL } from "@/lib/site";
import { getCachedFromPrices } from "@/lib/pricing/fromPrice";
import { supabaseServer } from "@/lib/supabase/server";

export const instant = false;

const HAS_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const metadata: Metadata = {
  title: "SANRA LIVING | Direct Steel Furniture Factory, SIDCO Coimbatore",
  description:
    "Shop factory-direct steel tables, workstations, chairs, stands and racks built in SIDCO Coimbatore. Live pricing, GST invoicing and pan-India dispatch.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SANRA LIVING | Direct Steel Furniture Factory",
    description: "Factory-direct steel furniture for cafes, offices, hostels, hospitals and projects.",
    url: "/",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "SANRA LIVING factory steel furniture" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SANRA LIVING | Direct Steel Furniture Factory",
    description: "Factory-direct steel furniture for cafes, offices, hostels, hospitals and projects.",
    images: ["/og-default.png"],
  },
};

export default async function Home() {
  await connection();

  const lowestByCategory = new Map<string, number>();
  if (HAS_SUPABASE) {
    try {
      const [productResult, priceMap] = await Promise.all([
        supabaseServer.from("products").select("id, category").eq("is_active", true),
        getCachedFromPrices(),
      ]);

      for (const product of productResult.data ?? []) {
        const price = priceMap[product.id];
        if (price == null) continue;
        const current = lowestByCategory.get(product.category);
        if (current == null || price < current) {
          lowestByCategory.set(product.category, price);
        }
      }
    } catch {
      // Show "View Range" when live prices are unavailable.
    }
  }

  const categories = [
    {
      name: "Cafe & Dining Tables",
      imageSrc: "/images/cat-dining-tables.svg",
      description: "Heavy gauge MS & SS frames paired with 100% Seasoned Grade-A Kerala Rubberwood or 18mm Export-Grade Krishnagiri Granite.",
      href: "/products?category=Cafe+%26+Dining+Tables",
    },
    {
      name: "Office & Workstation Tables",
      imageSrc: "/images/cat-workstations.svg",
      description: "Industrial grade ergonomic steel desks designed for commercial IT workspaces, call centres, and corporate offices.",
      href: "/products?category=Office+%26+Workstation+Tables",
    },
    {
      name: "SS & MS Chairs / Bar Stools",
      imageSrc: "/images/cat-chairs-stools.svg",
      description: "TIG-welded structural seating built for cafes, dining chains, and high-footfall commercial spaces.",
      href: "/products?category=SS+%26+MS+Chairs+%2F+Bar+Stools",
    },
    {
      name: "Home Utility Stands",
      imageSrc: "/images/cat-utility-stands.svg",
      description: "High-capacity washing machine, water dispenser, microwave, and heavy cylinder stands built from structural steel.",
      href: "/products?category=Home+Utility+Stands",
    },
    {
      name: "Boutique & Showroom Racks",
      imageSrc: "/images/cat-boutique-racks.svg",
      description: "Minimalist modern steel garment racks, display island shelving, and custom retail presentation units.",
      href: "/products?category=Boutique+%26+Showroom+Racks",
    },
    {
      name: "Hospital, Canteen & Lab SS",
      imageSrc: "/images/cat-hospital-lab.svg",
      description: "Anti-corrosion Jindal SS tables, medical trolley stands, and institutional kitchen workbenches.",
      href: "/products?category=Hospital%2C+Canteen+%26+Lab+SS",
    },
  ];

  const supplyChips = [
    { label: "Hotels & Restaurants", use: "CAFE", icon: UtensilsCrossed },
    { label: "Messes & Canteens", use: "CANTEEN", icon: Coffee },
    { label: "Bakeries & Juice Shops", use: "BAKERY", icon: Cake },
    { label: "Marriage Halls", use: "HALL", icon: HeartHandshake },
    { label: "Schools", use: "SCHOOL", icon: GraduationCap },
    { label: "Offices & Homes", use: "OFFICE", icon: Briefcase },
  ];

  const factoryBays = [
    {
      title: "CO2 MIG & Argon TIG Welding",
      description: "Continuous deep-penetration structural joints for permanent rigidity.",
      icon: Flame,
      imageSrc: "/images/bay-welding.svg",
    },
    {
      title: "Tata MS & Jindal SS Pipe Stock",
      description: "High-yield structural steel tubes from Tata MS and Jindal SS stock, inspected for wall thickness integrity.",
      icon: Boxes,
      imageSrc: "/images/bay-pipe-stock.svg",
    },
    {
      title: "Protective Steel Bumper Frame Fitting",
      description: "Heavy perimeter bumper frames integrated into edges to prevent transit shock and industrial abrasion.",
      icon: ShieldAlert,
      imageSrc: "/images/bay-bumper-frame.svg",
    },
    {
      title: "200 Kg Surface Plate QA Inspection",
      description: "Each production run is aligned on precision surface plates and tested to ensure true zero-wobble level.",
      icon: ScanLine,
      imageSrc: "/images/bay-qa-plate.svg",
    },
  ];

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: company.name,
    url: SITE_URL,
    ...(company.phone ? { telephone: company.phone } : {}),
    ...(company.email ? { email: company.email } : {}),
    ...(company.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: company.address,
            addressCountry: "IN",
          },
        }
      : {}),
    ...(Object.values(SOCIAL).filter(Boolean).length > 0
      ? { sameAs: Object.values(SOCIAL).filter(Boolean) }
      : {}),
    areaServed: "India",
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      {/* 1. TOP TRUST BAR */}
      <TrustBar />

      {/* 2. HERO SECTION */}
      <section className="bg-[#FFFFFF] py-12 md:py-20 lg:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111] text-white text-[11px] font-bold uppercase tracking-wider">
                <span>🏆</span>
                11+ Years of Manufacturing Experience
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Factory Direct Pricing • Direct SIDCO Coimbatore Unit
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#111111] tracking-tight leading-[1.1]">
                Factory-Direct Steel Furniture. Built Rock-Solid in SIDCO Coimbatore.
              </h1>

              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl font-normal">
                Cut out showroom markups. Order heavy-duty MS and Jindal SS furniture straight from our manufacturing line. Commercial tables, ergonomic workstations, and custom frames engineered with our proprietary Zero-Shake lock.
              </p>

              {/* Price & GST Note Badge */}
              <div className="pt-1">
                <span className="inline-block bg-[#F5F5F7] border border-neutral-300 text-neutral-900 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded">
                  Direct Factory Price • GST Invoice Available
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#111111] hover:bg-neutral-800 text-white font-semibold text-sm uppercase tracking-wider rounded transition-colors shadow-sm"
                >
                  Explore Products & Live Prices
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/b2b"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#F5F5F7] hover:bg-neutral-200 text-[#111111] border border-neutral-300 font-semibold text-sm uppercase tracking-wider rounded transition-colors"
                >
                  B2B / Architect Portal
                </Link>
              </div>

              {/* Quick Trust Highlights */}
              <div className="pt-4 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>10-Yr MIG Warranty</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>3-Yr SS Replacement</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>200 Kg Tested Lock</span>
                </div>
              </div>
            </div>

            {/* Right Hero Image */}
            <div className="lg:col-span-5">
              <div className="rounded-xl overflow-hidden border border-neutral-200 shadow-sm bg-[#F5F5F7] p-2">
                <WatermarkedImage
                  src="/images/hero-workstation.svg"
                  alt="SANRA LIVING Factory Direct Steel Workstation and Dining Frame"
                  priority={true}
                  aspectRatio="square"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="rounded-lg"
                />
                <div className="p-3 text-center">
                  <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">
                    SIDCO Industrial Estate Unit • Heavy MIG Structural Assembly
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SIX CORE CATEGORIES GRID */}
      <section className="bg-[#F5F5F7] py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Factory Catalog"
            title="Six Core Structural Categories"
            subtitle="Engineered for institutional durability and modern minimalism. Each item comes with our direct factory price badge and GST invoice."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.name}
                name={cat.name}
                imageSrc={cat.imageSrc}
                priceBadge={
                  lowestByCategory.has(cat.name)
                    ? `From ₹${lowestByCategory
                        .get(cat.name)!
                        .toLocaleString("en-IN")}`
                    : undefined
                }
                description={cat.description}
                href={cat.href}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#111111] hover:bg-neutral-800 text-white font-semibold text-sm uppercase tracking-wider rounded transition-colors shadow-sm"
            >
              View Full Factory Price List
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3B. ABOUT SANRA LIVING & WHO WE SUPPLY */}
      <section className="bg-[#FFFFFF] py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
            About SANRA LIVING
          </h2>
          <p className="mt-5 text-sm sm:text-base text-neutral-600 leading-relaxed">
            SANRA LIVING is the brand of Indian Make Steel Industries, a steel furniture
            factory in SIDCO Coimbatore. For over 11 years we have been making steel and
            stainless steel chairs, tables and furniture for hotels, restaurants, messes,
            canteens, bakeries and homes. You buy direct from the factory at factory
            prices, with a GST invoice.
          </p>

          <h3 className="mt-12 text-xs font-extrabold uppercase tracking-widest text-neutral-500">
            Who We Supply
          </h3>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {supplyChips.map((chip) => {
              const Icon = chip.icon;
              return (
                <Link
                  key={chip.label}
                  href={`/products?use=${chip.use}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#F5F5F7] border border-neutral-200 text-xs font-semibold text-neutral-800 hover:border-neutral-400 hover:bg-neutral-100 transition-colors min-h-[44px]"
                >
                  <Icon className="w-4 h-4 text-neutral-600" />
                  {chip.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. SANRA ZERO-SHAKE TELESCOPIC LOCK (200 KG TESTED) */}
      <section className="bg-[#FFFFFF] py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Proprietary Technology"
            title="SANRA Zero-Shake Telescopic Lock™ (200 Kg Tested)"
            subtitle="The fundamental difference between retail furniture that wobbles within months and industrial-grade steel furniture that stays rock steady for a decade."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch mt-8">
            {/* Conventional Flat Plate Joint */}
            <div className="bg-[#F5F5F7] rounded-xl border border-red-200/60 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded">
                    Conventional Market Build
                  </span>
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-[#111111] mb-2">
                  Flat-Plate Joint (Wobble-Prone)
                </h3>
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  Standard market furniture relies on a simple flat-plate joint welded on top of the leg. Under dynamic weight, lateral force stresses the single contact plane, resulting in noticeable table wobble and frame fatigue over time.
                </p>
                <div className="rounded-lg overflow-hidden border border-neutral-300 mb-6 bg-white">
                  <WatermarkedImage
                    src="/images/joint-standard.svg"
                    alt="Conventional Flat Plate Joint"
                    aspectRatio="video"
                  />
                </div>
                <ul className="space-y-2.5 text-xs text-neutral-700">
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>Single-plane point load with high flex vulnerability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>Gradual lateral play under daily vibration and dining use</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>Requires constant manual retightening</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* SANRA Telescopic Lock */}
            <div className="bg-[#FFFFFF] rounded-xl border-2 border-[#111111] p-6 md:p-8 flex flex-col justify-between shadow-md relative">
              <div className="absolute -top-3.5 right-6 bg-[#111111] text-white text-[11px] font-extrabold px-3 py-1 uppercase tracking-widest rounded">
                Factory Engineered
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded">
                    SANRA Engineering
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-[#111111] mb-2">
                  SANRA Zero-Shake Telescopic Lock™
                </h3>
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  Our SANRA Zero-Shake Telescopic Lock™ (200 Kg Tested) keeps the structure steady in daily commercial use.
                </p>
                <div className="rounded-lg overflow-hidden border border-neutral-300 mb-6 bg-neutral-50">
                  <WatermarkedImage
                    src="/images/joint-sanra.svg"
                    alt="SANRA Zero-Shake Telescopic Lock"
                    aspectRatio="video"
                  />
                </div>
                <ul className="space-y-2.5 text-xs text-neutral-900 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>200 Kg load tested</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>SANRA Zero-Shake Telescopic Lock™ (200 Kg Tested)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Backed by 10-Year structural MIG warranty</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TWO-WAY DELIVERY CARD */}
      <section className="bg-[#F5F5F7] py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Logistics Options"
            title="Two Flexible Ways We Dispatch From SIDCO"
            subtitle="Whether you are outfitting a cafe down the street in Coimbatore or furnishing an IT office in Delhi, we have a dispatch model built for your timeline."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Option A */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-[#111111]">
                  <Truck className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Option A • Local Factory Direct
                </span>
                <h3 className="text-xl font-bold text-[#111111] mt-1 mb-3">
                  Fully Welded (Local Factory Tempo Delivery, Coimbatore)
                </h3>
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  Delivered 100% pre-welded and surface-finished directly from our SIDCO factory floor via dedicated transport. Zero assembly required on-site—just unwrap and place.
                </p>
                <div className="rounded-lg overflow-hidden border border-neutral-200 mb-6">
                  <WatermarkedImage
                    src="/images/delivery-tempo.svg"
                    alt="Fully Welded Factory Delivery Coimbatore"
                    aspectRatio="video"
                  />
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-neutral-100 text-xs text-neutral-600">
                <p>• Direct tempo dispatch within Coimbatore & surrounding industrial districts</p>
                <p>• Ideal for cafes, commercial kitchens, labs, and pre-scheduled turnkeys</p>
              </div>
            </div>

            {/* Option B */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center mb-5 text-[#111111]">
                  <Package className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Option B • Pan-India Standard
                </span>
                <h3 className="text-xl font-bold text-[#111111] mt-1 mb-3">
                  5-Min Flat-Pack Knock-Down (Pan-India Courier)
                </h3>
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  Precision modular units featuring our SANRA Zero-Shake Telescopic Lock™. Packed in reinforced corrugated export crates and delivered anywhere in India. Sets up in under 5 minutes with zero special tools.
                </p>
                <div className="rounded-lg overflow-hidden border border-neutral-200 mb-6">
                  <WatermarkedImage
                    src="/images/delivery-flatpack.svg"
                    alt="5-Min Flat-Pack Knock-Down Courier"
                    aspectRatio="video"
                  />
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-neutral-100 text-xs text-neutral-600">
                <p>• Doorstep courier dispatch to any pincode across India</p>
                <p>• Protected with corner guards, bubble sleeves, and heavy-gauge carton crates</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INSIDE OUR SIDCO FACTORY (4 BAYS) */}
      <section className="bg-[#FFFFFF] py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Manufacturing Excellence"
            title="Inside Our SIDCO Factory"
            subtitle="Four specialized production bays dedicated to steel craftsmanship, high-penetration structural welding, and rigorous load testing."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {factoryBays.map((bay, idx) => {
              const Icon = bay.icon;
              return (
                <div
                  key={bay.title}
                  className="bg-[#F5F5F7] rounded-lg border border-neutral-200 overflow-hidden flex flex-col hover:border-neutral-400 transition-colors"
                >
                  <div className="relative">
                    <WatermarkedImage
                      src={bay.imageSrc}
                      alt={bay.title}
                      aspectRatio="video"
                    />
                    <div className="absolute top-2 left-2 z-20">
                      <span className="text-[10px] font-extrabold bg-[#111111] text-white px-2 py-0.5 rounded uppercase tracking-wider">
                        Bay 0{idx + 1}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="w-8 h-8 rounded bg-white border border-neutral-200 flex items-center justify-center mb-3 text-[#111111]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-[#111111] mb-2 leading-snug">
                      {bay.title}
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed mt-auto">
                      {bay.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sourcing Clarification Box */}
          <div className="mt-12 p-6 rounded-lg bg-[#F5F5F7] border border-neutral-200 text-center max-w-3xl mx-auto">
            <h4 className="text-sm font-bold text-[#111111] uppercase tracking-wider mb-2">
              Authentic Direct Sourcing Guarantee
            </h4>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              We manufacture on-site at SIDCO Kurichi using prime structural steel pipes. Table tops are paired exclusively with <strong>100% Seasoned Grade-A Kerala Rubberwood</strong> and genuine <strong>18mm Export-Grade Krishnagiri Granite</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL WHATSAPP CTA BANNER */}
      <section className="bg-[#111111] py-14 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 uppercase">
            Direct SIDCO Coimbatore Factory Access
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Need Live Factory Quotes or Custom Steel Fabrications?
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto">
            Connect directly with our factory floor engineering desk. Send us your dimensional drawings or select from our standard catalog for immediate pricing.
          </p>
          <div className="pt-2">
            <a
              href={whatsappHref(
                "Hello SANRA LIVING, I would like to request live factory pricing."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm uppercase tracking-wider transition-colors shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              Chat on WhatsApp for Live Quotes
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
