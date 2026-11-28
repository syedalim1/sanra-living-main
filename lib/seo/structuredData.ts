import { company, SOCIAL } from "@/lib/company";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export function buildOrganizationJsonLd() {
  const sameAs = Object.values(SOCIAL).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: company.brand,
    legalName: company.manufacturer,
    url: SITE_URL,
    logo: absoluteUrl("/og-default.png"),
    email: company.email,
    telephone: company.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "K-6, SIDCO Industrial Estate, Kurichi",
      addressLocality: "Coimbatore",
      addressRegion: "Tamil Nadu",
      postalCode: "641021",
      addressCountry: "IN",
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ProductSchemaVariantInput {
  variant_code: string;
  frame_material: "SS" | "MS";
  build_category_label: string;
  surface_label: string | null;
  size_label: string;
  availability: string;
  unit_price: number | null;
  image_url: string | null;
}

export function buildProductStructuredData(params: {
  sku: string;
  name: string;
  description: string | null;
  category: string;
  canonicalUrl: string;
  mainImageUrl: string;
  fromPrice: number | null;
  variants: ProductSchemaVariantInput[];
}) {
  const {
    sku,
    name,
    description,
    category,
    canonicalUrl,
    mainImageUrl,
    fromPrice,
    variants,
  } = params;

  const brandAndManufacturer = {
    brand: { "@type": "Brand", name: SITE_NAME },
    manufacturer: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: company.manufacturer,
    },
  };

  if (variants.length > 0) {
    const priced = variants
      .map((v) => v.unit_price)
      .filter((p): p is number => p != null && p > 0);
    const lowPrice = priced.length > 0 ? Math.min(...priced) : fromPrice;
    const highPrice = priced.length > 0 ? Math.max(...priced) : fromPrice;

    return {
      "@context": "https://schema.org",
      "@type": "ProductGroup",
      "@id": `${canonicalUrl}#product-group`,
      name,
      ...(description ? { description } : {}),
      productGroupID: sku,
      category,
      url: canonicalUrl,
      image: [absoluteUrl(mainImageUrl)],
      variesBy: [
        "https://schema.org/material",
        "https://schema.org/size",
      ],
      ...brandAndManufacturer,
      hasVariant: variants.slice(0, 12).map((v) => ({
        "@type": "Product",
        sku: v.variant_code,
        name: `${name} — ${v.frame_material === "SS" ? "Stainless Steel" : "Mild Steel"} ${v.build_category_label}${v.surface_label ? ` / ${v.surface_label}` : ""} (${v.size_label})`,
        material:
          v.frame_material === "SS" ? "Stainless Steel" : "Mild Steel",
        size: v.size_label,
        image: absoluteUrl(v.image_url || mainImageUrl),
        ...(v.unit_price != null && v.unit_price > 0
          ? {
              offers: {
                "@type": "Offer",
                url: canonicalUrl,
                priceCurrency: "INR",
                price: v.unit_price,
                availability:
                  v.availability === "IN_STOCK"
                    ? "https://schema.org/InStock"
                    : v.availability === "UNAVAILABLE"
                      ? "https://schema.org/OutOfStock"
                      : "https://schema.org/MadeToOrder",
                seller: {
                  "@type": "Organization",
                  name: SITE_NAME,
                },
              },
            }
          : {}),
      })),
      ...(lowPrice != null && highPrice != null
        ? {
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "INR",
              lowPrice,
              highPrice,
              offerCount: priced.length || 1,
            },
          }
        : {}),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    name,
    ...(description ? { description } : {}),
    image: [absoluteUrl(mainImageUrl)],
    sku,
    category,
    url: canonicalUrl,
    ...brandAndManufacturer,
    ...(fromPrice != null
      ? {
          offers: {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "INR",
            price: fromPrice,
            availability: "https://schema.org/MadeToOrder",
            seller: {
              "@type": "Organization",
              name: SITE_NAME,
            },
          },
        }
      : {}),
  };
}
