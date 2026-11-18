import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { company, GST_NOTE } from "@/lib/company";
import { formatINR } from "@/lib/format";
import type { ConfigSummary } from "@/lib/configSummary";

export interface QuotePdfPrice {
  unit_price: number;
  total_price: number;
}

export interface QuotePdfInput {
  summary: ConfigSummary;
  price: QuotePdfPrice;
  reference: string;
  issueDate: Date;
  websiteName: string;
}

const BLACK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.42, 0.45, 0.5);
const LIGHT = rgb(0.84, 0.86, 0.88);
const ACCENT = rgb(0.02, 0.59, 0.41);

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

interface DrawWrappedOptions {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  lineHeight?: number;
}

function drawWrapped({
  page,
  text,
  x,
  y,
  maxWidth,
  font,
  size,
  color = BLACK,
  lineHeight = size + 3,
}: DrawWrappedOptions): number {
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * lineHeight, size, font, color });
  });
  return y - lines.length * lineHeight;
}

function drawRight(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = BLACK
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - width, y, size, font, color });
}

async function loadFonts(pdfDoc: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont }> {
  const fontDir = path.join(process.cwd(), "lib", "fonts");
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(fontDir, "NotoSans-Regular.ttf")),
    readFile(path.join(fontDir, "NotoSans-Bold.ttf")),
  ]);

  pdfDoc.registerFontkit(fontkit);

  return {
    regular: await pdfDoc.embedFont(regularBytes, { subset: true }),
    bold: await pdfDoc.embedFont(boldBytes, { subset: true }),
  };
}

export async function buildQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const { summary, price, reference, issueDate, websiteName } = input;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const { regular, bold } = await loadFonts(pdfDoc);
  const rightX = PAGE_WIDTH - MARGIN;

  page.drawText("SANRA LIVING", {
    x: 105,
    y: PAGE_HEIGHT / 2 - 40,
    size: 62,
    font: bold,
    color: rgb(0.55, 0.55, 0.55),
    opacity: 0.07,
    rotate: degrees(32),
  });

  let y = PAGE_HEIGHT - 48;

  page.drawText("SANRA LIVING | Indian Make Steel Industries", {
    x: MARGIN,
    y,
    size: 15,
    font: bold,
    color: BLACK,
  });
  y -= 18;

  y = drawWrapped({
    page,
    text: company.address,
    x: MARGIN,
    y,
    maxWidth: 370,
    font: regular,
    size: 8.5,
    color: GREY,
    lineHeight: 11,
  });
  y -= 4;

  const contactLine = [
    company.phone,
    company.email,
    company.gstin ? `GSTIN: ${company.gstin}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");

  if (contactLine) {
    page.drawText(contactLine, {
      x: MARGIN,
      y,
      size: 8.5,
      font: regular,
      color: GREY,
    });
  }
  y -= 12;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: rightX, y },
    thickness: 2,
    color: ACCENT,
  });

  y -= 34;
  page.drawText("FACTORY QUOTATION", {
    x: MARGIN,
    y,
    size: 20,
    font: bold,
    color: BLACK,
  });

  const validUntil = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  drawRight(page, `Quote Ref: ${reference}`, rightX, y + 12, bold, 9);
  drawRight(page, `Issue Date: ${formatDate(issueDate)}`, rightX, y - 2, regular, 8.5, GREY);
  drawRight(page, `Valid Until: ${formatDate(validUntil)}`, rightX, y - 15, regular, 8.5, GREY);

  y -= 30;

  const rows: Array<[string, string]> = [
    ["Product", `${summary.product_name} (${summary.sku})`],
  ];

  if (summary.product_type === "TABLE") {
    const gaugeParts = [summary.gauge_label];
    if (summary.gauge_load_kg != null) gaugeParts.push(`${summary.gauge_load_kg} Kg Tested`);
    if (summary.gauge_warranty) gaugeParts.push(summary.gauge_warranty);

    rows.push(
      ["Size", summary.size_label],
      ["Top material", summary.top_label],
      ["Pipe gauge", gaugeParts.join(" • ")],
      ["Frame color", summary.frame_color_label],
      ["Build type", summary.build_label],
      ["Add-ons", summary.addons_labels.length > 0 ? summary.addons_labels.join(", ") : "None"]
    );
  } else {
    for (const line of summary.selection_lines) {
      rows.push([line.label, line.value]);
    }
  }

  rows.push(["Quantity", String(summary.quantity)]);

  const labelX = MARGIN;
  const valueX = MARGIN + 110;
  const valueWidth = rightX - valueX;

  for (const [label, value] of rows) {
    const lines = wrapText(value, regular, 9.5, valueWidth);
    const rowHeight = Math.max(21, lines.length * 12 + 9);

    page.drawText(label, {
      x: labelX,
      y: y - 12,
      size: 8,
      font: bold,
      color: GREY,
    });

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: valueX,
        y: y - 12 - index * 12,
        size: 9.5,
        font: regular,
        color: BLACK,
      });
    });

    page.drawLine({
      start: { x: labelX, y: y - rowHeight },
      end: { x: rightX, y: y - rowHeight },
      thickness: 0.5,
      color: LIGHT,
    });

    y -= rowHeight;
  }

  y -= 22;

  page.drawLine({
    start: { x: labelX, y: y + 8 },
    end: { x: rightX, y: y + 8 },
    thickness: 0.8,
    color: BLACK,
  });

  const priceRows: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: "Unit price", value: `₹${formatINR(price.unit_price)}` },
    { label: "Quantity", value: String(summary.quantity) },
    { label: "TOTAL", value: `₹${formatINR(price.total_price)}`, strong: true },
  ];

  for (const row of priceRows) {
    const font = row.strong ? bold : regular;
    const size = row.strong ? 13 : 9.5;
    page.drawText(row.label, {
      x: labelX + 230,
      y,
      size: row.strong ? 11 : 9.5,
      font: row.strong ? bold : regular,
      color: row.strong ? BLACK : GREY,
    });
    drawRight(page, row.value, rightX, y, font, size, row.strong ? BLACK : BLACK);
    y -= row.strong ? 20 : 16;
  }

  page.drawLine({
    start: { x: labelX, y: y + 10 },
    end: { x: rightX, y: y + 10 },
    thickness: 1,
    color: ACCENT,
  });

  y -= 12;

  if (summary.is_stone) {
    page.drawText(
      "Includes +1-inch Protective Steel Bumper Frame and Center Cross-Support Pipe",
      {
        x: labelX,
        y,
        size: 9,
        font: bold,
        color: ACCENT,
      }
    );
    y -= 18;
  }

  if (
    summary.product_type === "CHAIR" ||
    summary.product_type === "STAND" ||
    summary.product_type === "RACK"
  ) {
    page.drawText("SANRA Zero-Shake Telescopic Lock™ (200 Kg Tested)", {
      x: labelX,
      y,
      size: 9,
      font: bold,
      color: BLACK,
    });
    y -= 18;
  }

  page.drawText(`GST: ${GST_NOTE}`, {
    x: labelX,
    y,
    size: 9,
    font: regular,
    color: BLACK,
  });
  y -= 24;

  page.drawText("TERMS", {
    x: labelX,
    y,
    size: 9,
    font: bold,
    color: BLACK,
  });
  y -= 14;

  const terms = [
    "Price valid for 7 days from the issue date.",
    "50% advance after size confirmation on WhatsApp; balance before dispatch.",
    "GST invoice available.",
    "Delivery charges extra unless stated.",
    "Custom sizes are quoted separately.",
    "Images are for reference; shade may vary slightly.",
  ];

  for (const term of terms) {
    const lines = wrapText(term, regular, 8.5, rightX - labelX - 12);
    page.drawText("•", {
      x: labelX,
      y: y - 1,
      size: 8.5,
      font: regular,
      color: ACCENT,
    });
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: labelX + 12,
        y: y - index * 11,
        size: 8.5,
        font: regular,
        color: GREY,
      });
    });
    y -= lines.length * 11 + 4;
  }

  page.drawLine({
    start: { x: MARGIN, y: 64 },
    end: { x: rightX, y: 64 },
    thickness: 0.5,
    color: LIGHT,
  });
  page.drawText("Direct Factory Price • SIDCO Coimbatore", {
    x: MARGIN,
    y: 48,
    size: 8.5,
    font: bold,
    color: BLACK,
  });
  drawRight(page, websiteName, rightX, 48, regular, 8.5, GREY);

  return pdfDoc.save();
}
