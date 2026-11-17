import { describe, expect, it, vi } from "vitest";

const { fakeStore } = vi.hoisted(() => {
  const order = {
    id: "11111111-1111-4111-8111-111111111111",
    tracking_code: "SANRA-AAAA",
    customer_name_masked: "R***sh",
    phone_last_4: "5303",
    current_stage: "WELDED",
    configured_items_json: [{ name: "Cafe Table", size: "4x2 ft", quantity: 1 }],
    warranty_years: 10,
    warranty_expiry_date: "2036-11-17",
    created_at: "2026-11-17T10:00:00.000Z",
    archived: false,
  };

  return {
    fakeStore: {
      async findOrderByCode(code: string) {
        return code === order.tracking_code ? order : null;
      },
      async countRecentFailures() {
        return 0;
      },
      async logAttempt() {},
      async getStageEvents() {
        return [];
      },
      async getVisiblePhotos() {
        return [];
      },
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/tracking/supabaseStore", () => ({
  createTrackingStore: vi.fn(() => fakeStore),
}));

describe("warranty PDF route", () => {
  it("refuses to issue a warranty certificate before READY", async () => {
    const { POST } = await import("@/app/api/warranty-pdf/route");

    const request = new Request("http://localhost/api/warranty-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.201",
      },
      body: JSON.stringify({
        tracking_code: "SANRA-AAAA",
        phone_last_4: "5303",
      }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Warranty certificate is not available yet.",
    });
  });
});
