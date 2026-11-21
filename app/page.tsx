import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  Truck,
  Factory,
  ReceiptIndianRupee,
  UtensilsCrossed,
  Coffee,
  Cake,
  HeartHandshake,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import CategoryCard from "@/components/CategoryCard";
import WatermarkedImage from "@/components/WatermarkedImage";
import { company, whatsappHref, SOCIAL } from "@/lib/company";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getCachedFromPrices } from "@/lib/pricing/fromPrice";
import { calculateSetPrice } from "@/lib/pricing/setPrice";
import { supabaseServer } from "@/lib/supabase/server";

export const instant = false;

const HOME_TITLE =
  "SANRA LIVING | Factory-Direct MS & SS Steel Furniture in SIDCO Coimbatore";
const HOME_DESCRIPTION =
  "Buy heavy-duty MS and Stainless Steel chairs, granite & wood top tables, and dining sets direct from Indian Make Steel Industries, SIDCO Coimbatore. GST invoice, 3-Yr warranty & Pan-India delivery.";

const HAS_SUPABASE = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "SANRA LIVING factory-direct MS and SS steel furniture in SIDCO Coimbatore, Tamil Nadu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
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

  const setTypeLabel = (type: string, quantity: number) => {
    const labels: Record<string, [string, string]> = {
      TABLE: ["Table", "Tables"],
      CHAIR: ["Chair", "Chairs"],
      STAND: ["Stand", "Stands"],
      RACK: ["Rack", "Racks"],
      SS_UNIT: ["SS Unit", "SS Units"],
    };
    const pair = labels[type] ?? ["Item", "Items"];
    return `${quantity} ${quantity === 1 ? pair[0] : pair[1]}`;
  };

  let homeSets: Array<{
    id: string;
    sku: string;
    name: string;
    description: string | null;
    image: string | null;
    summary: string;
    price: number | null;
  }> = [];

  if (HAS_SUPABASE) {
    try {
      const { data: sets } = await supabaseServer
        .from("product_sets")
        .select("id, sku, name, short_description, main_image_url")
        .eq("is_active", true)
        .order("sort_order")
        .limit(4);

      if (sets && sets.length > 0) {
        const { data: setItems } = await supabaseServer
          .from("product_set_items")
          .select("set_id, product_id, quantity")
          .in(
            "set_id",
            sets.map((set) => set.id)
          );

        const productIds = [...new Set((setItems ?? []).map((item) => item.product_id))];
        const { data: setProducts } =
          productIds.length > 0
            ? await supabaseServer
                .from("products")
                .select("id, product_type")
                .in("id", productIds)
            : { data: [] as Array<{ id: string; product_type: string }> };

        const typeMap = new Map<string, string>(
          ((setProducts ?? []) as Array<{ id: string; product_type: string }>).map(
            (product) => [product.id, product.product_type]
          )
        );

        const prices = await Promise.all(
          sets.map(async (set) => {
            try {
              const result = await calculateSetPrice({ sku: set.sku, quantity: 1 });
              return result.requires_quote ? null : result.unit_price;
            } catch {
              return null;
            }
          })
        );

        homeSets = sets.map((set, index) => {
          const counts = new Map<string, number>();
          for (const item of setItems ?? []) {
            if (item.set_id !== set.id) continue;
            const type = typeMap.get(item.product_id);
            if (!type) continue;
            counts.set(type, (counts.get(type) ?? 0) + Number(item.quantity));
          }
          const summary = [...counts.entries()]
            .map(([type, quantity]) => setTypeLabel(type, quantity))
            .join(" + ");

          return {
            id: set.id,
            sku: set.sku,
            name: set.name,
            description: set.short_description,
            image: set.main_image_url,
            summary,
            price: prices[index],
          };
        });
      }
    } catch {
      homeSets = [];
    }
  }

  const categories = [
    {
      name: "SS & MS Chairs",
      imageSrc: "/images/cat-chairs-stools.jpg",
      imageAlt:
        "MS and stainless steel chairs manufactured by SANRA LIVING in SIDCO Coimbatore, Tamil Nadu",
      description:
        "Factory-welded MS and stainless steel seating for cafés, restaurants, dining halls, and high-footfall commercial spaces.",
      href: "/products?category=SS+%26+MS+Chairs",
    },
    {
      name: "SS & MS Tables",
      imageSrc: "/images/cat-tables.jpg",
      imageAlt:
        "Heavy-duty MS and SS cafe table with a wood top, built in SIDCO Coimbatore, Tamil Nadu",
      description:
        "Heavy-gauge MS & SS frames paired with seasoned hardwood, plywood, or natural granite tops.",
      href: "/products?category=SS+%26+MS+Tables",
    },
    {
      name: "SS & MS Chair & Table Sets",
      imageSrc: "/images/cat-sets.jpg",
      imageAlt:
        "Dining table and chair set from the SANRA LIVING steel furniture factory in SIDCO Coimbatore, Tamil Nadu",
      description:
        "Matching chair-and-table combinations for dining spaces, cafés, restaurants, and institutions.",
      href: "/products?category=SS+%26+MS+Chair+%26+Table+Sets",
    },
  ];

  const trustPoints = [
    {
      title: "Direct SIDCO Coimbatore Factory",
      detail: "11+ years of in-house steel furniture manufacturing.",
      icon: Factory,
    },
    {
      title: "Heavy-Duty MS & SS Build",
      detail: "3-Yr MS Welding Warranty | 3-Yr SS Replacement Guarantee",
      icon: ShieldCheck,
    },
    {
      title: "Local Coimbatore & Pan-India Dispatch",
      detail: "Factory delivery in Coimbatore and courier across India.",
      icon: Truck,
    },
    {
      title: "Direct Factory Price & GST Invoice",
      detail: "No showroom markup. GST invoice with every order.",
      icon: ReceiptIndianRupee,
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

  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": ["FurnitureStore", "LocalBusiness"],
    "@id": `${SITE_URL}/#store`,
    name: "SANRA LIVING - Indian Make Steel Industries",
    url: SITE_URL,
    telephone: "+91-9585745303",
    ...(company.email ? { email: company.email } : {}),
    image: `${SITE_URL}/og-default.png`,
    logo: `${SITE_URL}/og-default.png`,
    description:
      "Factory-direct manufacturer of heavy-duty MS and stainless steel chairs, tables, and dining sets in SIDCO Coimbatore, Tamil Nadu.",
    priceRange: "₹₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: "K6, Pollachi Main Rd, SIDCO Private Industrial Estate",
      addressLocality: "Coimbatore",
      addressRegion: "Tamil Nadu",
      postalCode: "641021",
      addressCountry: "IN",
    },
    openingHours: "Mo-Sa 09:00-19:00",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      opens: "09:00",
      closes: "19:00",
    },
    areaServed: "India",
    ...(Object.values(SOCIAL).filter(Boolean).length > 0
      ? { sameAs: Object.values(SOCIAL).filter(Boolean) }
      : {}),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(businessJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {/* 1. HERO */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20 lg:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
              SIDCO Coimbatore Factory • 11+ Years
            </span>

            <h1 className="mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#111111] tracking-tight leading-[1.08]">
              Factory-Direct MS &amp; SS Steel Furniture. Built Rock-Solid in SIDCO
              Coimbatore.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto">
              Heavy-duty MS &amp; SS chairs, tables, and dining sets — built direct in our
              SIDCO Coimbatore factory for hotels, restaurants, cafés, and institutions.
              GST invoicing and pan-India delivery.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#111111] hover:bg-neutral-800 text-white font-semibold text-sm uppercase tracking-wider rounded transition-colors shadow-sm min-h-[48px]"
              >
                Explore Catalog
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>

              <a
                href={whatsappHref(
                  "Hello SANRA LIVING, I would like to speak to the factory desk about your steel furniture."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm uppercase tracking-wider rounded transition-colors shadow-sm min-h-[48px]"
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                WhatsApp Factory Desk
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FACTORY TRUST STRIP */}
      <section
        aria-labelledby="factory-trust-heading"
        className="bg-white border-b border-neutral-200 py-10 md:py-12"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="factory-trust-heading" className="sr-only">
            Why buy direct from the SANRA LIVING factory
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {trustPoints.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="flex items-start gap-3">
                  <span className="shrink-0 w-10 h-10 rounded-lg bg-[#F5F5F7] border border-neutral-200 flex items-center justify-center text-[#111111]">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#111111] leading-snug">
                      {point.title}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                      {point.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. THREE CORE CATEGORIES */}
      <section className="bg-[#F5F5F7] py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            badge="Factory Catalog"
            title="Three Core Categories"
            subtitle="MS & SS chairs, tables, and complete dining sets — built in SIDCO Coimbatore with direct factory pricing and GST invoicing."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.name}
                name={cat.name}
                imageSrc={cat.imageSrc}
                imageAlt={cat.imageAlt}
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
        </div>
      </section>

      {homeSets.length > 0 && (
        <section className="bg-white py-16 md:py-24 border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
                  Sets &amp; Combos
                </h2>
                <p className="text-sm text-neutral-600 mt-2">
                  Ready-made sets from the factory, priced live.
                </p>
              </div>
              <Link
                href="/sets"
                className="text-[10px] font-bold uppercase tracking-wider text-neutral-700 underline underline-offset-2"
              >
                View all sets
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {homeSets.map((set) => (
                <Link
                  key={set.id}
                  href={`/sets/${encodeURIComponent(set.sku)}`}
                  className="group bg-white rounded-xl border border-neutral-200 overflow-hidden hover:border-neutral-400 transition-colors"
                >
                  <WatermarkedImage
                    src={set.image}
                    alt={`${set.name} — factory-direct steel furniture set from SIDCO Coimbatore`}
                    aspectRatio="video"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                      {set.sku}
                    </p>
                    <h3 className="text-sm font-bold text-[#111111] mt-1">
                      {set.name}
                    </h3>
                    {set.summary && (
                      <p className="text-[11px] text-neutral-600 mt-1">{set.summary}</p>
                    )}
                    <p className="text-sm font-black text-[#111111] mt-3">
                      {set.price != null
                        ? `From ₹${set.price.toLocaleString("en-IN")}`
                        : "Ask on WhatsApp"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. ABOUT SANRA LIVING & WHO WE SUPPLY */}
      <section className="bg-white py-16 md:py-24 border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111111]">
            About SANRA LIVING
          </h2>
          <p className="mt-5 text-sm sm:text-base text-neutral-600 leading-relaxed">
            SANRA LIVING is the brand of Indian Make Steel Industries, a steel furniture
            factory in SIDCO Coimbatore. For over 11 years, we have manufactured heavy-duty
            MS and stainless steel chairs, tables, and dining sets for hotels, restaurants,
            messes, canteens, bakeries, offices, and homes. You buy direct from the factory
            at factory prices, with a GST invoice.
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
                  <Icon className="w-4 h-4 text-neutral-600" aria-hidden="true" />
                  {chip.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. FINAL WHATSAPP CTA */}
      <section className="bg-[#111111] py-14 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 uppercase">
            Direct SIDCO Coimbatore Factory
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Need Live Factory Prices or Custom Steel Fabrication?
          </h2>
          <p className="text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto">
            Speak directly with our factory desk. Share your dimensions, drawings, or catalog
            selection for a direct factory quote.
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
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              WhatsApp Factory Desk
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
