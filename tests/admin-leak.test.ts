import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC_SOURCES = [
  "app/layout.tsx",
  "app/(public)/page.tsx",
  "components/public/PublicSite.tsx",
  "components/public/FeaturedRange.tsx",
  "app/(public)/products/page.tsx",
  "app/(public)/products/[sku]/page.tsx",
  "app/(public)/contact/page.tsx",
  "components/Navbar.tsx",
  "components/Footer.tsx",
  "components/FloatingWhatsApp.tsx",
  "components/TypeConfigurator.tsx",
  "components/TrackOrderForm.tsx",
  "app/(public)/track/page.tsx",
  "app/api/price/route.ts",
  "app/api/track/route.ts",
  "app/api/warranty-pdf/route.ts",
  "app/api/whatsapp-link/route.ts",
  "app/api/quote-pdf/route.ts",
];

const FORBIDDEN = [
  "/admin",
  "ADMIN_EMAIL",
  "cost_per_unit",
  "base_pipe_weight_18g_kg",
  "labor_cost",
  "retail_margin_pct",
  "b2b_margin_pct",
  "product_pricing_rules",
  "admin_audit_log",
];

describe("public leak check", () => {
  it("never links to admin or exposes costing fields in public page/API source", () => {
    for (const relativePath of PUBLIC_SOURCES) {
      const fullPath = path.join(process.cwd(), relativePath);
      const source = readFileSync(fullPath, "utf8");

      for (const forbidden of FORBIDDEN) {
        expect(source, `${relativePath} contains ${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});
