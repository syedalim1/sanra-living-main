import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { company } from "@/lib/company";
import type { SetSummary } from "@/lib/pricing/setSummary";

const MARGIN = 48;
const BLACK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.42, 0.45, 0.5);

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function text(
  page: PDFPage,
  font: PDFFont,
  value: string,
  x: number,
  y: number,
  size: number,
  color = BLACK
) {
  page.drawText(value, { x, y, size, font, color });
}

export async function buildSetQuotePdf(
  summary: SetSummary,
  quoteRef: string
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const width = 595 - MARGIN * 2;
  let y = 800;

  text(page, bold, "SANRA LIVING", MARGIN, y, 18);
  y -= 16;
  text(page, regular, "Indian Make Steel Industries", MARGIN, y, 9, GREY);
  y -= 12;
  if (company.address) {
    for (const line of wrap(company.address, regular, 8, width)) {
      text(page, regular, line, MARGIN, y, 8, GREY);
      y -= 10;
    }
  }
  const contactLine = [company.phone, company.email, company.gstin ? `GSTIN: ${company.gstin}` : ""]
    .filter(Boolean)
    .join("  |  ");
  if (contactLine) {
    text(page, regular, contactLine, MARGIN, y, 8, GREY);
    y -= 10;
  }

  y -= 12;
  text(page, bold, "SET QUOTE", MARGIN, y, 14);
  y -= 18;
  text(page, bold, summary.name, MARGIN, y, 12);
  y -= 14;
  text(page, regular, `Set code: ${summary.sku}`, MARGIN, y, 9, GREY);
  y -= 10;
  text(page, regular, `Quote ref: ${quoteRef}`, MARGIN, y, 9, GREY);
  y -= 20;

  for (const item of summary.items) {
    text(page, bold, `${item.quantity} x ${item.name} (${item.sku})`, MARGIN, y, 10);
    y -= 12;
    for (const selection of item.selections) {
      const line = `${selection.group}: ${selection.option}`;
      for (const wrapped of wrap(line, regular, 8, width - 12)) {
        text(page, regular, wrapped, MARGIN + 12, y, 8, GREY);
        y -= 9;
      }
    }
    y -= 4;
  }

  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: 595 - MARGIN, y },
    thickness: 0.7,
    color: GREY,
  });
  y -= 18;

  text(
    page,
    bold,
    summary.requires_quote
      ? "Total: Confirm on WhatsApp"
      : `Total: Rs. ${summary.total_price.toLocaleString("en-IN")}`,
    MARGIN,
    y,
    13
  );

  y -= 22;
  text(
    page,
    regular,
    "Pricing confirmed on WhatsApp. GST invoice provided as applicable.",
    MARGIN,
    y,
    8,
    GREY
  );

  return await pdf.save();
}
