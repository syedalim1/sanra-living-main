import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildWarrantyPdf } from "../lib/pdf/warrantyPdf";
import type { TrackingOrder } from "../lib/tracking/types";

const order: TrackingOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  tracking_code: "SANRA-7K9P",
  customer_name_masked: "R***sh",
  phone_last_4: "5303",
  current_stage: "READY",
  configured_items_json: [
    { name: "Cafe Table", size: "4x2 ft", quantity: 2 },
    { name: "Cafe Chair", size: "Standard", quantity: 4 },
  ],
  warranty_years: 10,
  warranty_expiry_date: "2036-11-17",
  created_at: "2026-11-17T10:00:00.000Z",
  archived: false,
};

describe("warranty certificate PDF", () => {
  it("renders a one-page A4 certificate with the embedded font", async () => {
    const bytes = await buildWarrantyPdf({
      order,
      issueDate: new Date("2026-11-17T00:00:00Z"),
    });

    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe("%PDF");

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);

    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });
});
