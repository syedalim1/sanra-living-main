import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildBulkQuotePdf } from "../lib/pdf/bulkQuotePdf";

function line(index: number) {
  return {
    item: `Cafe Table ${index + 1}`,
    configuration:
      "Wood Tops • Natural Honey Teak Polish • 16 Gauge Heavy Commercial • Matte Black • 4 x 2 ft • Welded",
    quantity: 2,
    unitPrice: 4999,
    lineTotal: 9998,
  };
}

describe("bulk quote PDF", () => {
  it("renders a short bulk quote", async () => {
    const bytes = await buildBulkQuotePdf({
      reference: "Q-7K9P2X",
      issueDate: new Date("2026-11-17T00:00:00Z"),
      validUntil: new Date("2026-11-24T00:00:00Z"),
      lines: [line(0), line(1)],
      grandTotal: 19996,
      hasQuoteRows: false,
    });

    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe("%PDF");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it("adds pages for a long bulk sheet", async () => {
    const lines = Array.from({ length: 30 }).map((_, index) => line(index));
    const bytes = await buildBulkQuotePdf({
      reference: "Q-7K9P2X",
      issueDate: new Date("2026-11-17T00:00:00Z"),
      validUntil: new Date("2026-11-24T00:00:00Z"),
      lines,
      grandTotal: 299940,
      hasQuoteRows: true,
    });

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
