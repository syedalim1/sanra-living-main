import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { ArrowRight, ArrowUpRight, Factory, ReceiptIndianRupee, ShieldCheck, Truck } from "lucide-react";
import DiningGallery from "@/components/public/DiningGallery";
import FeaturedRange from "@/components/public/FeaturedRange";
import PublishedProjectsPreview from "@/components/public/PublishedProjectsPreview";
import { company, whatsappHref, SOCIAL } from "@/lib/company";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const HOME_TITLE =
  "SANRA LIVING | Factory-Direct MS & SS Steel Furniture in SIDCO Coimbatore";
const HOME_DESCRIPTION =
  "Buy heavy-duty MS and Stainless Steel chairs, granite & wood top tables, and dining sets direct from Indian Make Steel Industries, SIDCO Coimbatore. GST invoice, 3-Yr warranty & Pan-India delivery.";

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

const chairsUrl = "/products?category=SS+%26+MS+Chairs";
const tablesUrl = "/products?category=SS+%26+MS+Tables";
const diningUrl = "/products?category=SS+%26+MS+Chair+%26+Table+Sets";
const diningPhoto = "/images/sanra-granite-dining-set.webp";
const framePhoto = "/images/sanra-pedestal-frame.webp";
const businessListing = SOCIAL.google_maps || "https://www.justdial.com/Coimbatore/Indian-Make-Steel-Industries-Rathinam-College-Of-Arts-Science-Near-Eachanari/0422PX422-X422-210619221515-B2I7_BZDET";

const assurances = [
  { title: "Factory direct", detail: "SIDCO, Coimbatore", icon: Factory },
  { title: "3-year structural cover", detail: "MS welding · SS replacement", icon: ShieldCheck },
  { title: "GST invoicing", detail: "With every order", icon: ReceiptIndianRupee },
  { title: "Pan-India dispatch", detail: "Local delivery available", icon: Truck },
];

const industries = [
  { title: "Hotels, restaurants & cafés", detail: "Dining floors, bar seating and café tables", use: "CAFE" },
  { title: "Bakeries & juice bars", detail: "Compact tables and quick-service seating", use: "BAKERY" },
  { title: "Canteens & mess halls", detail: "Coordinated seating for shared dining", use: "CANTEEN" },
  { title: "Schools & colleges", detail: "Furniture for campuses and dining halls", use: "SCHOOL" },
  { title: "Banquet & event venues", detail: "Seating and tables for large gatherings", use: "HALL" },
  { title: "Offices & shared spaces", detail: "Breakout areas, meeting and dining spaces", use: "OFFICE" },
];

const process = [
  { title: "Specify the build", detail: "Start with the footprint, finish, material and quantities your space needs." },
  { title: "Fabricate the frame", detail: "Mild or stainless steel is cut and welded to the selected specification." },
  { title: "Fit the surfaces", detail: "Frames are finished and paired with the selected seat or tabletop material." },
  { title: "Prepare for dispatch", detail: "Completed pieces are checked and packed for local delivery or transport across India." },
];

export default function Home() {
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
    <div className="sanra-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(businessJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="sanra-hero" aria-labelledby="hero-heading">
        <div className="sanra-container sanra-hero-inner">
          <div className="sanra-hero-copy">
            <p className="sanra-label sanra-hero-location">Steel furniture manufacturers · Coimbatore</p>
            <h1 id="hero-heading">
              <span>Steel furniture</span>{" "}
              <span>for spaces</span>{" "}
              <span><em>that work.</em></span>
            </h1>
            <p className="sanra-hero-description">Chairs, tables and dining sets built in mild and stainless steel for hospitality, workplaces and institutions.</p>
            <div className="sanra-actions">
              <Link className="sanra-button sanra-button--rust" href="/b2b#bulk">Get a bulk quote</Link>
              <a className="sanra-text-link" href="#collections">Explore collections</a>
            </div>
          </div>
          <figure className="sanra-hero-figure">
            <div className="sanra-hero-photo">
              <Image
                src={diningPhoto}
                alt="SANRA six-seater dining set with a granite top and stainless steel frames"
                fill
                preload
                sizes="(max-width: 760px) 94vw, (max-width: 1320px) 45vw, 590px"
              />
            </div>
            <figcaption>
              <span>Six-seater granite dining set</span>
              <Link href={diningUrl} aria-label="Explore the granite dining set collection"><ArrowUpRight size={18} aria-hidden="true" /></Link>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="sanra-assurance" aria-label="Factory buying information">
        <ul className="sanra-container">
          {assurances.map(({ title, detail, icon: Icon }) => (
            <li key={title}>
              <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
              <div><strong>{title}</strong><span>{detail}</span></div>
            </li>
          ))}
        </ul>
      </section>

      <section id="collections" className="sanra-collections sanra-container" aria-labelledby="collections-heading">
        <header className="sanra-section-intro sanra-rise">
          <div>
            <p className="sanra-label">Collections</p>
            <h2 id="collections-heading" className="sanra-display">Built for daily use.</h2>
          </div>
          <Link className="sanra-text-link" href="/products">View full catalog</Link>
        </header>

        <div className="sanra-collection-pair">
          <article className="sanra-chairs sanra-rise">
            <div className="sanra-chairs-copy">
              <p className="sanra-label">Stainless &amp; mild steel</p>
              <h3>Chairs</h3>
              <p>Welded steel seating for dining floors, cafés and other high-traffic spaces.</p>
              <Link className="sanra-text-link" href={chairsUrl}>Explore chairs</Link>
            </div>
            <figure>
              <div className="sanra-chairs-photo">
                <Image src={diningPhoto} alt="Detail of the stainless steel chair backs and wood seats from a SANRA dining set" fill sizes="(max-width: 760px) 90vw, 42vw" />
              </div>
              <figcaption>Chair detail from the six-seater dining set</figcaption>
            </figure>
          </article>

          <article className="sanra-tables sanra-rise">
            <figure className="sanra-tables-photo">
              <Image src={framePhoto} alt="SANRA black welded mild steel pedestal table base" fill sizes="(max-width: 760px) 92vw, 44vw" />
            </figure>
            <div className="sanra-tables-copy">
              <p className="sanra-label">Stainless &amp; mild steel</p>
              <h3>Tables</h3>
              <p>Steel bases with hardwood, plywood and natural granite top options.</p>
              <Link className="sanra-text-link" href={tablesUrl}>Explore tables</Link>
            </div>
          </article>
        </div>

        <article className="sanra-sets sanra-rise">
          <DiningGallery src={diningPhoto} />
          <div className="sanra-sets-copy">
            <p className="sanra-label">Chairs &amp; tables together</p>
            <h3>Dining sets</h3>
            <p>Matching chairs and tables make it easier to specify a whole dining room and keep finishes consistent across a bulk order.</p>
            <Link className="sanra-button sanra-button--ink" href={diningUrl}>Explore dining sets</Link>
            <Link className="sanra-text-link" href="/sets">Configurable sets</Link>
          </div>
        </article>
      </section>

      <Suspense fallback={null}>
        <FeaturedRange />
      </Suspense>

      <section
        className="sanra-container py-10 border-t border-neutral-200"
        aria-labelledby="materials-heading"
      >
        <header className="sanra-section-intro mb-6">
          <div>
            <p className="sanra-label">Materials</p>
            <h2 id="materials-heading" className="sanra-display">
              Stainless Steel &amp; Mild Steel collections.
            </h2>
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link
            href="/products?material=SS"
            className="p-6 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition-colors flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                SS Collection
              </p>
              <h3 className="text-lg font-extrabold text-[#111111] mt-1">
                Stainless Steel Furniture
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Available in Economy, Standard, and Heavy Duty configurations for kitchens, canteens, and dining rooms.
              </p>
            </div>
            <ArrowUpRight className="w-5 h-5 shrink-0 text-neutral-700" />
          </Link>
          <Link
            href="/products?material=MS"
            className="p-6 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition-colors flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                MS Collection
              </p>
              <h3 className="text-lg font-extrabold text-[#111111] mt-1">
                Mild Steel Powder-Coated Furniture
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Available in Economy, Standard, and Heavy Duty configurations for cafés, offices, and institutions.
              </p>
            </div>
            <ArrowUpRight className="w-5 h-5 shrink-0 text-neutral-700" />
          </Link>
        </div>
      </section>

      <section className="sanra-industries" aria-labelledby="industries-heading">
        <div className="sanra-container sanra-industries-inner">
          <div className="sanra-rise">
            <p className="sanra-label">Commercial &amp; institutional</p>
            <h2 className="sanra-display" id="industries-heading">Furniture for your floor plan.</h2>
            <p>Specify seating and tables for how your space runs, from a small café to a college dining hall.</p>
            <div className="sanra-actions">
              <Link className="sanra-text-link" href="/projects">See our projects</Link>
              <Link className="sanra-text-link" href="/b2b">Plan a trade project</Link>
            </div>
          </div>
          <ul className="sanra-industry-list">
            {industries.map(({ title, detail, use }) => (
              <li key={use}>
                <Link href={`/products?use=${use}`}>
                  <span><strong>{title}</strong><small>{detail}</small></span>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sanra-factory" aria-labelledby="factory-heading">
        <div className="sanra-container sanra-factory-inner">
          <header className="sanra-rise">
            <p className="sanra-label">Indian Make Steel Industries</p>
            <h2 className="sanra-display" id="factory-heading">Made in SIDCO.</h2>
            <p>Over 11 years manufacturing steel furniture in Coimbatore. Work directly with the factory from material selection through dispatch.</p>
            <Link className="sanra-text-link" href="/contact">Find our factory</Link>
            <a className="sanra-text-link" href={businessListing} target="_blank" rel="noopener noreferrer">Business listing &amp; reviews</a>
          </header>
          <ol className="sanra-process">
            {process.map(({ title, detail }) => (
              <li key={title} className="sanra-rise"><h3>{title}</h3><p>{detail}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <Suspense fallback={null}>
        <PublishedProjectsPreview />
      </Suspense>

      <section className="sanra-container sanra-trade sanra-rise" aria-labelledby="trade-heading">
        <div>
          <p className="sanra-label">Dealers · Designers · Procurement teams</p>
          <h2 className="sanra-display" id="trade-heading">Work directly with the factory.</h2>
          <p>Source for a fit-out or a repeat order. Request samples, estimate seating capacity and prepare a bulk quotation in the trade portal.</p>
        </div>
        <nav aria-label="Trade tools">
          <Link href="/b2b#sample">Request a material sample <ArrowUpRight size={19} aria-hidden="true" /></Link>
          <Link href="/b2b#calculator">Open the room size calculator <ArrowUpRight size={19} aria-hidden="true" /></Link>
          <Link href="/b2b#cad">Explore the CAD library <ArrowUpRight size={19} aria-hidden="true" /></Link>
        </nav>
      </section>

      <section className="sanra-quote" aria-labelledby="quote-heading">
        <div className="sanra-container sanra-quote-inner">
          <div>
            <h2 className="sanra-display" id="quote-heading">Let’s quote your project.</h2>
            <p>Share your quantities, room dimensions or drawings with the factory desk.</p>
          </div>
          <div className="sanra-actions">
            <Link className="sanra-button sanra-button--paper" href="/b2b#bulk">Build a bulk quote</Link>
            {company.whatsappNumber && (
              <a className="sanra-text-link" href={whatsappHref("Hello SANRA LIVING, I would like a bulk quotation for steel furniture.")} target="_blank" rel="noopener noreferrer">
                Ask on WhatsApp <ArrowRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </section>

      <section
        className="sanra-container py-10 border-t border-neutral-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        aria-labelledby="location-heading"
      >
        <div>
          <p className="sanra-label">Factory Contact &amp; Location</p>
          <h2 id="location-heading" className="text-lg font-extrabold text-[#111111] mt-1">
            Indian Make Steel Industries — SIDCO Coimbatore
          </h2>
          <p className="text-xs text-neutral-600 mt-1">
            {company.address} · {company.phone}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="sanra-text-link" href="/contact">
            Directions &amp; Factory Contact <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
