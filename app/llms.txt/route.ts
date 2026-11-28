import { NextResponse } from "next/server";
import { company } from "@/lib/company";
import { SITE_URL } from "@/lib/site";

export async function GET() {
  const content = [
    `# ${company.brand}`,
    ``,
    `> ${company.brand}, a brand of ${company.manufacturer} — manufacturer of mild-steel and stainless-steel chairs, tables, dining furniture, commercial furniture and institutional furniture at ${company.address}`,
    ``,
    `## Verified Business Identity`,
    `- Brand: ${company.brand}`,
    `- Manufacturer: ${company.manufacturer}`,
    `- Factory Address: ${company.address}`,
    `- Primary Phone: ${company.phone}`,
    `- Secondary Phone: ${company.secondaryPhone}`,
    `- Email: ${company.email}`,
    `- Official Website: ${SITE_URL}`,
    `- Primary Service Market: Coimbatore, Tiruppur, Pollachi, Erode, Salem, Tamil Nadu, South India, India`,
    ``,
    `## Canonical Public Sections`,
    `- Full Catalogue: ${SITE_URL}/products`,
    `- Configurable Dining Sets: ${SITE_URL}/sets`,
    `- Completed Projects: ${SITE_URL}/projects`,
    `- B2B & Bulk Procurement: ${SITE_URL}/b2b`,
    `- Factory Contact & Directions: ${SITE_URL}/contact`,
    ``,
    `## Commercial Categories`,
    `- Steel Chairs: ${SITE_URL}/collections/steel-chairs`,
    `- Stainless Steel Chairs: ${SITE_URL}/collections/stainless-steel-chairs`,
    `- Mild Steel Chairs: ${SITE_URL}/collections/mild-steel-chairs`,
    `- Steel Tables: ${SITE_URL}/collections/steel-tables`,
    `- Granite Dining Tables: ${SITE_URL}/collections/granite-dining-tables`,
    `- Dining Sets: ${SITE_URL}/collections/dining-sets`,
  ].join("\n");

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
