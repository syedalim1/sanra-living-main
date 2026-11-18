import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { buildQuotePdf } from "../lib/pdf/quotePdf";
import type { ConfigSummary } from "../lib/configSummary";

const summary: ConfigSummary = {
  product_type: "TABLE",
  selection_lines: [],
  product_name: "Commercial Heavy-Gauge Cafe Table (4x2 ft)",
  sku: "IMS-CF-42",
  size_label: "4 x 2 ft",
  top_tab_label: "Granite & Marble Tops",
  top_material_label: "Absolute Jet Black",
  top_label: "Granite & Marble Tops — Absolute Jet Black",
  gauge_code: "G16",
  gauge_label: "16 Gauge Heavy Commercial (1.6mm Tata Structura)",
  gauge_load_kg: 250,
  gauge_warranty: "10 Years Structural MIG Warranty",
  frame_color_label: "Matte Black Powder Coated",
  build_label: "5-Min Flat-Pack Knock-Down (Pan-India Courier)",
  addons_labels: ["Laptop Wire Grommet Hole"],
  quantity: 2,
  is_stone: true,
  is_stainless: false,
};

describe("PDF quote", () => {
  it("renders a one-page A4 PDF with the embedded rupee font", async () => {
    const bytes = await buildQuotePdf({
      summary,
      price: { unit_price: 7199, total_price: 14398 },
      reference: "Q-7K9P2X",
      issueDate: new Date("2026-11-17T00:00:00Z"),
      websiteName: "sanraliving.example",
    });

    expect(Buffer.from(bytes.slice(0, 4)).toString()).toBe("%PDF");

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);

    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it("bundles fonts that contain the rupee glyph", () => {
    const fontDir = path.join(process.cwd(), "lib", "fonts");

    for (const file of ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"]) {
      const font = fontkit.create(readFileSync(path.join(fontDir, file)));
      expect(font.hasGlyphForCodePoint(0x20b9)).toBe(true);
    }
  });
});
