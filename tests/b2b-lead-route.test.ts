import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetB2bRateLimitsForTests } from "../lib/b2b/rateLimit";

const { saveLead } = vi.hoisted(() => ({
  saveLead: vi.fn(async () => undefined),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("@/lib/b2b/leadSave", () => ({
  saveLead,
}));

import { POST } from "@/app/api/b2b/lead/route";

const validLead = {
  name: "Rakesh",
  phone: "9876543210",
  email: "rakesh@example.com",
  company: "Cafe Co",
  city: "Coimbatore",
  product: "IMS-CF-42",
  need: "MATERIAL_SWATCH",
  notes: "Need a teak swatch",
  website: "",
};

function request(body: unknown, ip: string) {
  return new Request("http://localhost/api/b2b/lead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetB2bRateLimitsForTests();
  saveLead.mockClear();
});

describe("B2B sample lead route", () => {
  it("returns only a success message and never returns lead data", async () => {
    const response = await POST(
      request(validLead, "198.51.100.31") as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body)).toEqual(["message"]);
    expect(body.message).toBe(
      "Request received. Our team will contact you on WhatsApp shortly."
    );
    expect(JSON.stringify(body)).not.toContain(validLead.phone);
    expect(JSON.stringify(body)).not.toContain(validLead.name);
    expect(saveLead).toHaveBeenCalledOnce();
  });

  it("rejects a filled honeypot without saving", async () => {
    const response = await POST(
      request({ ...validLead, website: "spam.example" }, "198.51.100.32") as never
    );

    expect(response.status).toBe(400);
    expect(saveLead).not.toHaveBeenCalled();
  });

  it("enforces five requests per hour per IP", async () => {
    const ip = "198.51.100.33";

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(request(validLead, ip) as never);
      expect(response.status).toBe(200);
    }

    const blocked = await POST(request(validLead, ip) as never);
    expect(blocked.status).toBe(429);
    expect(saveLead).toHaveBeenCalledTimes(5);
  });
});
