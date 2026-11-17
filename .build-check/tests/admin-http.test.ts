import { describe, expect, it } from "vitest";

const baseUrl = process.env.ADMIN_TEST_BASE_URL;
const describeHttp = baseUrl ? describe : describe.skip;

describeHttp("admin HTTP protection", () => {
  it("redirects /admin/* without a session", async () => {
    const response = await fetch(`${baseUrl}/admin/rates`, { redirect: "manual" });

    expect([302, 303, 307, 308, 401]).toContain(response.status);
    if (response.status >= 300 && response.status < 400) {
      expect(response.headers.get("location") ?? "").toContain("/admin/login");
    }
  }, 30000);

  it("rejects /api/admin/* without a session", async () => {
    const response = await fetch(`${baseUrl}/api/admin/health`, {
      redirect: "manual",
      headers: { Accept: "application/json" },
    });

    expect([302, 303, 307, 308, 401]).toContain(response.status);
    if (response.status === 401) {
      const body = (await response.json()) as { error?: string };
      expect(body.error).toBe("Unauthorized");
    }
  }, 30000);

  it("keeps admin links, admin email and costing fields out of public HTML", async () => {
    const pages = ["/", "/products", "/products/IMS-CF-42", "/contact"];

    for (const page of pages) {
      const response = await fetch(`${baseUrl}${page}`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html.toLowerCase()).not.toContain("/admin");
      expect(html).not.toContain("cost_per_unit");
      expect(html).not.toContain("base_pipe_weight_18g_kg");
      expect(html).not.toContain("product_pricing_rules");
      expect(html).not.toContain("admin_audit_log");

      if (process.env.ADMIN_EMAIL) {
        expect(html.toLowerCase()).not.toContain(process.env.ADMIN_EMAIL.toLowerCase());
      }
    }
  }, 30000);

  it("keeps public price API response fields unchanged", async () => {
    const response = await fetch(`${baseUrl}/api/price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: "IMS-CF-42",
        top_tab: "WOOD",
        top_material: "RUBBER_HONEY_TEAK",
        gauge: "G16",
        frame_color: "MATTE_BLACK",
        build_type: "WELDED",
        size: "4x2",
        addons: [],
        quantity: 1,
      }),
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    const allowed = new Set([
      "unit_price",
      "total_price",
      "discount_pct",
      "bumper_included",
      "requires_quote",
    ]);

    for (const key of Object.keys(body)) {
      expect(allowed.has(key), `unexpected public field ${key}`).toBe(true);
    }
  }, 30000);
});
