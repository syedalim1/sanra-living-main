export interface IndustryDefinition {
  slug: string;
  name: string;
  h1: string;
  seoTitle: string;
  metaDescription: string;
  intro: string;
  materialGuidance: string;
  customizationGuidance: string;
  useCaseCode: string;
  published: boolean;
}

export const INDUSTRY_PAGES: IndustryDefinition[] = [
  {
    slug: "restaurants",
    name: "Restaurants",
    h1: "Restaurant Chairs & Tables Manufacturer in Coimbatore",
    seoTitle: "Restaurant Furniture Manufacturer in Coimbatore | SANRA LIVING",
    metaDescription:
      "Factory-direct mild steel and stainless steel restaurant chairs, dining tables, and granite-top tables from Indian Make Steel Industries, SIDCO Coimbatore.",
    intro:
      "Commercial dining furniture built for daily restaurant service across Coimbatore, Tiruppur, Pollachi, Erode, Salem, and South India.",
    materialGuidance:
      "Choose Mild Steel (powder-coated) for indoor dining themes or Stainless Steel for high-moisture and easy-wash dining areas. Available in Economy, Standard, and Heavy Duty builds.",
    customizationGuidance:
      "Standard 2x2, 3x2, 4x2, and 4x3 ft footprints with rubberwood, plywood, or granite tops. Bulk ordering starts at 10 tables and 20 chairs, with custom quotations for 50+ units.",
    useCaseCode: "CAFE",
    published: true,
  },
  {
    slug: "hotels",
    name: "Hotels",
    h1: "Hotel Dining & Commercial Steel Furniture Supplier",
    seoTitle: "Hotel Furniture Supplier in Coimbatore | SANRA LIVING",
    metaDescription:
      "Supply hotel dining rooms, coffee shops, and common spaces with factory-direct steel chairs, tables, and dining sets.",
    intro:
      "Consistent finishes and coordinated chair-and-table sets for hotel dining floors and hospitality venues.",
    materialGuidance:
      "Pair stainless steel frames with natural granite or seasoned rubberwood tops for long-term commercial serviceability.",
    customizationGuidance:
      "Specify table dimensions, seating capacity, and surface finishes directly with our SIDCO Coimbatore manufacturing desk.",
    useCaseCode: "CAFE",
    published: true,
  },
  {
    slug: "cafes-and-bakeries",
    name: "Cafes and Bakeries",
    h1: "Cafe & Bakery Chairs and Tables Manufacturer",
    seoTitle: "Cafe & Bakery Furniture Manufacturer Coimbatore | SANRA LIVING",
    metaDescription:
      "Compact 2x2 and 3x2 steel cafe tables, pedestal bases, and cafe chairs built factory-direct in Coimbatore.",
    intro:
      "Space-efficient two-seater and four-seater steel tables and chairs tailored for quick-service cafes, bakeries, and tea bars.",
    materialGuidance:
      "Powder-coated mild steel frames in matte black or industrial grey paired with rubberwood, plywood, or granite tops.",
    customizationGuidance:
      "Order standard cafe sets or request custom table dimensions and bulk project pricing.",
    useCaseCode: "BAKERY",
    published: true,
  },
  {
    slug: "industrial-canteens",
    name: "Industrial Canteens",
    h1: "Industrial Canteen & Mess Tables Manufacturer",
    seoTitle: "Industrial Canteen Furniture Manufacturer Coimbatore | SANRA LIVING",
    metaDescription:
      "Stainless steel and mild steel canteen tables and seating built for factories, industrial mess halls, and staff dining rooms.",
    intro:
      "Practical, easy-to-clean canteen dining furniture designed for factory mess halls and high-volume staff dining.",
    materialGuidance:
      "Stainless steel frames and granite or metal-top configurations are preferred for wet-wash canteen floors.",
    customizationGuidance:
      "Available in 4-seater and 6-seater layouts with 10+ unit bulk pricing and 50+ custom project quotations.",
    useCaseCode: "CANTEEN",
    published: true,
  },
  {
    slug: "schools-and-colleges",
    name: "Schools and Colleges",
    h1: "School & College Steel Furniture Manufacturer",
    seoTitle: "School & College Steel Furniture Coimbatore | SANRA LIVING",
    metaDescription:
      "Institutional steel chairs, dining tables, and canteen seating for schools and colleges across Tamil Nadu.",
    intro:
      "Durable steel seating and dining tables manufactured for campus cafeterias, staff rooms, and institutional dining halls.",
    materialGuidance:
      "Heavy Duty and Standard mild steel or stainless steel builds suited to high-traffic campus environments.",
    customizationGuidance:
      "Institutional bulk quotations with GST invoicing and Pan-India dispatch.",
    useCaseCode: "SCHOOL",
    published: true,
  },
  {
    slug: "hostels",
    name: "Hostels",
    h1: "Hostel Mess & Dining Furniture Manufacturer",
    seoTitle: "Hostel Dining Furniture Manufacturer Coimbatore | SANRA LIVING",
    metaDescription:
      "Bulk hostel mess tables, stainless steel dining sets, and institutional chairs manufactured in SIDCO Coimbatore.",
    intro:
      "Coordinated hostel mess tables and seating built for student dining halls.",
    materialGuidance:
      "Stainless steel frames with granite tops simplify daily cleaning in busy hostel mess halls.",
    customizationGuidance:
      "Bulk institutional orders from 10+ tables or 20+ chairs with factory-direct GST invoices.",
    useCaseCode: "CANTEEN",
    published: true,
  },
  {
    slug: "marriage-and-banquet-halls",
    name: "Marriage and Banquet Halls",
    h1: "Banquet & Marriage Hall Furniture Manufacturer",
    seoTitle: "Marriage & Banquet Hall Furniture Coimbatore | SANRA LIVING",
    metaDescription:
      "Wholesale banquet chairs, dining tables, and granite-top dining sets for marriage halls and event venues in Tamil Nadu.",
    intro:
      "High-volume banquet seating and dining hall tables built for kalyana mandapams and event venues.",
    materialGuidance:
      "Choose Mild Steel or Stainless Steel frames in Standard or Heavy Duty configurations.",
    customizationGuidance:
      "Dedicated 50+ piece bulk quotation workflow for large hall fit-outs.",
    useCaseCode: "HALL",
    published: true,
  },
  {
    slug: "offices",
    name: "Offices",
    h1: "Office & Breakout Steel Furniture Manufacturer",
    seoTitle: "Commercial Office Steel Furniture Coimbatore | SANRA LIVING",
    metaDescription:
      "Modular steel workstations, breakout tables, and office chairs manufactured in Coimbatore.",
    intro:
      "Clean, functional mild steel tables and seating for office cafeterias, breakout zones, and workrooms.",
    materialGuidance:
      "Powder-coated mild steel frames with rubberwood or plywood surfaces.",
    customizationGuidance:
      "Custom lengths and bulk corporate quotations available.",
    useCaseCode: "OFFICE",
    published: true,
  },
];

export function getIndustryBySlug(slug: string): IndustryDefinition | undefined {
  return INDUSTRY_PAGES.find((i) => i.slug === slug && i.published);
}
