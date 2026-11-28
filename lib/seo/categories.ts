export interface CategoryDefinition {
  slug: string;
  name: string;
  h1: string;
  seoTitle: string;
  metaDescription: string;
  description: string;
  productTypes: string[];
  requiredMaterial?: "SS" | "MS";
  requiredKeyword?: string;
  relatedSlugs: string[];
}

export const SEO_CATEGORIES: CategoryDefinition[] = [
  {
    slug: "steel-chairs",
    name: "Steel Chairs",
    h1: "Steel Chairs Manufacturer in Coimbatore",
    seoTitle: "Steel Chairs Manufacturer in Coimbatore | SANRA LIVING",
    metaDescription:
      "Factory-direct mild steel and stainless steel chairs in Coimbatore for restaurants, cafes, canteens, and institutions. Available in Economy, Standard, and Heavy Duty.",
    description:
      "Commercial mild steel and stainless steel chairs fabricated at Indian Make Steel Industries, SIDCO Coimbatore for dining halls, restaurants, cafes, and institutions.",
    productTypes: ["CHAIR"],
    relatedSlugs: ["stainless-steel-chairs", "mild-steel-chairs", "cushion-chairs", "dining-sets"],
  },
  {
    slug: "stainless-steel-chairs",
    name: "Stainless Steel Chairs",
    h1: "Stainless Steel Chairs Manufacturer | Coimbatore",
    seoTitle: "Stainless Steel Chairs Manufacturer in Coimbatore | SANRA LIVING",
    metaDescription:
      "Buy commercial stainless steel chairs direct from our Coimbatore factory. Ideal for canteens, restaurants, and high-hygiene dining rooms.",
    description:
      "Corrosion-resistant stainless steel chairs built for commercial kitchens, canteens, hostels, and restaurants across Tamil Nadu and South India.",
    productTypes: ["CHAIR"],
    requiredMaterial: "SS",
    relatedSlugs: ["steel-chairs", "mild-steel-chairs", "stainless-steel-tables"],
  },
  {
    slug: "mild-steel-chairs",
    name: "Mild Steel Chairs",
    h1: "Mild Steel Chairs Manufacturer | Coimbatore",
    seoTitle: "Mild Steel Chairs Manufacturer in Coimbatore | SANRA LIVING",
    metaDescription:
      "Powder-coated mild steel chairs manufactured in SIDCO Coimbatore for cafes, restaurants, offices, and banquet halls.",
    description:
      "Powder-coated mild steel chairs available in Economy, Standard, and Heavy Duty builds with cushion, rubberwood, or metal seats.",
    productTypes: ["CHAIR"],
    requiredMaterial: "MS",
    relatedSlugs: ["steel-chairs", "cushion-chairs", "mild-steel-tables"],
  },
  {
    slug: "cushion-chairs",
    name: "Cushion Chairs",
    h1: "Steel Cushion Chairs for Commercial Use",
    seoTitle: "Commercial Steel Cushion Chairs | SANRA LIVING Coimbatore",
    metaDescription:
      "Commercial steel-frame cushion chairs for restaurants, cafes, hotels, and banquet venues. Factory-direct bulk pricing from Coimbatore.",
    description:
      "Steel-frame chairs paired with commercial cushion and upholstery seating for hospitality dining floors and banquet spaces.",
    productTypes: ["CHAIR"],
    requiredKeyword: "cushion",
    relatedSlugs: ["steel-chairs", "mild-steel-chairs", "dining-sets"],
  },
  {
    slug: "steel-tables",
    name: "Steel Tables",
    h1: "Steel Tables Manufacturer in Coimbatore",
    seoTitle: "Steel Tables Manufacturer in Coimbatore | SANRA LIVING",
    metaDescription:
      "Factory-direct mild steel and stainless steel tables with rubberwood, plywood, particle board, and granite tops. Custom sizes and bulk quotes.",
    description:
      "Commercial steel tables engineered for restaurants, cafes, canteens, and offices with configurable sizes and tabletop surfaces.",
    productTypes: ["TABLE"],
    relatedSlugs: ["stainless-steel-tables", "mild-steel-tables", "granite-dining-tables", "table-bases"],
  },
  {
    slug: "stainless-steel-tables",
    name: "Stainless Steel Tables",
    h1: "Stainless Steel Tables Manufacturer | Coimbatore",
    seoTitle: "Stainless Steel Tables Manufacturer in Coimbatore | SANRA LIVING",
    metaDescription:
      "Commercial stainless steel dining and canteen tables built in SIDCO Coimbatore. Available in Economy, Standard, and Heavy Duty.",
    description:
      "Stainless steel tables for industrial canteens, hotels, hostels, and food-service operations requiring easy-clean frames.",
    productTypes: ["TABLE", "SS_UNIT"],
    requiredMaterial: "SS",
    relatedSlugs: ["steel-tables", "granite-dining-tables", "stainless-steel-chairs"],
  },
  {
    slug: "mild-steel-tables",
    name: "Mild Steel Tables",
    h1: "Mild Steel Tables Manufacturer | Coimbatore",
    seoTitle: "Mild Steel Tables Manufacturer in Coimbatore | SANRA LIVING",
    metaDescription:
      "Powder-coated mild steel tables for cafes, restaurants, and offices. Pair with rubberwood, plywood, or granite tops.",
    description:
      "Powder-coated mild steel tables fabricated at our SIDCO Coimbatore facility with multiple tabletop options and commercial sizes.",
    productTypes: ["TABLE"],
    requiredMaterial: "MS",
    relatedSlugs: ["steel-tables", "table-bases", "mild-steel-chairs"],
  },
  {
    slug: "granite-dining-tables",
    name: "Granite Dining Tables",
    h1: "Granite Top Steel Dining Tables | SANRA LIVING",
    seoTitle: "Granite Top Steel Dining Tables | SANRA LIVING Coimbatore",
    metaDescription:
      "Heavy-duty granite top dining tables with stainless steel or mild steel frames. Built in Coimbatore for hotels, canteens, and dining rooms.",
    description:
      "Natural granite tabletops mounted on reinforced mild steel or stainless steel frames for high-traffic dining rooms and commercial venues.",
    productTypes: ["TABLE", "CHAIR_TABLE_SET"],
    requiredKeyword: "granite",
    relatedSlugs: ["steel-tables", "dining-sets", "stainless-steel-tables"],
  },
  {
    slug: "table-bases",
    name: "Table Bases",
    h1: "Commercial Steel Table Bases | Coimbatore",
    seoTitle: "Steel Pedestal & Frame Table Bases | SANRA LIVING Coimbatore",
    metaDescription:
      "Factory-direct mild steel and stainless steel table bases and pedestal frames for restaurants, cafes, and custom tabletops.",
    description:
      "Welded steel pedestal and four-leg table bases ready to pair with your choice of tabletop or ordered as frame-only units.",
    productTypes: ["TABLE"],
    requiredKeyword: "base",
    relatedSlugs: ["steel-tables", "mild-steel-tables", "granite-dining-tables"],
  },
  {
    slug: "dining-sets",
    name: "Dining Sets",
    h1: "Commercial Steel Dining Sets | SANRA LIVING",
    seoTitle: "Steel Chair & Table Dining Sets | SANRA LIVING Coimbatore",
    metaDescription:
      "Coordinated steel chairs and dining tables with granite or wood tops for restaurants, canteens, hostels, and homes.",
    description:
      "Matched chair and table dining sets manufactured in SIDCO Coimbatore for consistent finishes across bulk and institutional orders.",
    productTypes: ["CHAIR_TABLE_SET"],
    relatedSlugs: ["steel-chairs", "steel-tables", "granite-dining-tables"],
  },
];

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  return SEO_CATEGORIES.find((c) => c.slug === slug);
}
