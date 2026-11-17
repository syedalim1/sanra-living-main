import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { company, GST_NOTE } from "@/lib/company";
import { formatINR } from "@/lib/format";

export interface BulkQuoteLine {
  item: string;
  configuration: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface BulkQuotePdfInput {
  reference: string;
  issueDate: Date;
  validUntil: Date;
  lines: BulkQuoteLine[];
  grandTotal: number;
  hasQuoteRows: boolean;
}

const BLACK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.42, 0.45, 0.5);
const LIGHT = rgb(0.84, 0.86, 0.88);
const ACCENT = rgb(0.02, 0.59, 0.41);

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const RIGHT = PAGE_WIDTH - MARGIN;
const BOTTOM_LIMIT = 150;

const COL_ITEM = MARGIN;
const COL_CONFIG = MARGIN + 118;
const COL_QTY = MARGIN + 350;
const COL_UNIT = MARGIN + 408;
const COL_TOTAL = RIGHT;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
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

async function loadFonts(
  pdfDoc: PDFDocument
): Promise<{ regular: PDFFont; bold: PDFFont }> {
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

function drawWatermark(page: PDFPage, bold: PDFFont): void {
  page.drawText("SANRA LIVING", {
    x: 105,
    y: PAGE_HEIGHT / 2 - 40,
    size: 62,
    font: bold,
    color: rgb(0.55, 0.55, 0.55),
    opacity: 0.06,
    rotate: degrees(32),
  });
}

function drawFooter(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  reference: string,
  pageNumber: number
): void {
  page.drawLine({
    start: { x: MARGIN, y: 64 },
    end: { x: RIGHT, y: 64 },
    thickness: 0.5,
    color: LIGHT,
  });
  page.drawText("Direct Factory Price • SIDCO Coimbatore", {
    x: MARGIN,
    y: 48,
    size: 8,
    font: bold,
    color: BLACK,
  });
  drawRight(
    page,
    `Bulk Quote ${reference} • Page ${pageNumber}`,
    RIGHT,
    48,
    regular,
    7.5,
    GREY
  );
}

function drawFirstHeader(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  input: BulkQuotePdfInput
): number {
  let y = PAGE_HEIGHT - 48;

  page.drawText("SANRA LIVING | Indian Make Steel Industries", {
    x: MARGIN,
    y,
    size: 15,
    font: bold,
    color: BLACK,
  });
  y -= 18;

  const addressLines = wrapText(company.address, regular, 8.5, 370);
  for (const line of addressLines) {
    page.drawText(line, { x: MARGIN, y, size: 8.5, font: regular, color: GREY });
    y -= 11;
  }

  page.drawText(`${company.phone}  |  GSTIN: ${company.gstin}`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: regular,
    color: GREY,
  });
  y -= 12;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: RIGHT, y },
    thickness: 2,
    color: ACCENT,
  });

  y -= 30;
  page.drawText("BULK FACTORY QUOTATION", {
    x: MARGIN,
    y,
    size: 19,
    font: bold,
    color: BLACK,
  });

  drawRight(page, `Quote Ref: ${input.reference}`, RIGHT, y + 10, bold, 9);
  drawRight(
    page,
    `Issue Date: ${formatDate(input.issueDate)}`,
    RIGHT,
    y - 4,
    regular,
    8.5,
    GREY
  );
  drawRight(
    page,
    `Valid Until: ${formatDate(input.validUntil)}`,
    RIGHT,
    y - 17,
    regular,
    8.5,
    GREY
  );

  return y - 34;
}

function drawContinuationHeader(
  page: PDFPage,
  bold: PDFFont,
  reference: string
): number {
  page.drawText("SANRA LIVING | Bulk Quotation continued", {
    x: MARGIN,
    y: PAGE_HEIGHT - 48,
    size: 12,
    font: bold,
    color: BLACK,
  });
  drawRight(page, reference, RIGHT, PAGE_HEIGHT - 48, bold, 9);
  return PAGE_HEIGHT - 78;
}

function drawTableHeader(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  y: number
): number {
  page.drawText("Item", { x: COL_ITEM, y, size: 8, font: bold, color: GREY });
  page.drawText("Configuration", { x: COL_CONFIG, y, size: 8, font: bold, color: GREY });
  page.drawText("Qty", { x: COL_QTY, y, size: 8, font: bold, color: GREY });
  drawRight(page, "Unit", COL_UNIT + 45, y, bold, 8, GREY);
  drawRight(page, "Line total", COL_TOTAL, y, bold, 8, GREY);
  page.drawLine({
    start: { x: MARGIN, y: y - 5 },
    end: { x: RIGHT, y: y - 5 },
    thickness: 0.7,
    color: BLACK,
  });
  return y - 16;
}

export async function buildBulkQuotePdf(
  input: BulkQuotePdfInput
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { regular, bold } = await loadFonts(pdfDoc);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let pageNumber = 1;
  drawWatermark(page, bold);

  let y = drawFirstHeader(page, regular, bold, input);
  y = drawTableHeader(page, regular, bold, y);

  for (const line of input.lines) {
    const itemLines = wrapText(line.item, regular, 8.5, 108);
    const configLines = wrapText(line.configuration, regular, 8, 220);
    const rowLines = Math.max(itemLines.length, configLines.length, 1);
    const rowHeight = rowLines * 10 + 8;

    if (y - rowHeight < BOTTOM_LIMIT) {
      drawFooter(page, regular, bold, input.reference, pageNumber);
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageNumber += 1;
      drawWatermark(page, bold);
      y = drawContinuationHeader(page, bold, input.reference);
      y = drawTableHeader(page, regular, bold, y);
    }

    itemLines.forEach((text, index) => {
      page.drawText(text, {
        x: COL_ITEM,
        y: y - index * 10,
        size: 8.5,
        font: regular,
        color: BLACK,
      });
    });

    configLines.forEach((text, index) => {
      page.drawText(text, {
        x: COL_CONFIG,
        y: y - index * 10,
        size: 8,
        font: regular,
        color: GREY,
      });
    });

    page.drawText(String(line.quantity), {
      x: COL_QTY,
      y,
      size: 8.5,
      font: bold,
      color: BLACK,
    });

    drawRight(
      page,
      line.unitPrice == null ? "Quote on WhatsApp" : `₹${formatINR(line.unitPrice)}`,
      COL_UNIT + 45,
      y,
      regular,
      8,
      line.unitPrice == null ? GREY : BLACK
    );
    drawRight(
      page,
      line.lineTotal == null ? "—" : `₹${formatINR(line.lineTotal)}`,
      COL_TOTAL,
      y,
      bold,
      8.5,
      BLACK
    );

    page.drawLine({
      start: { x: MARGIN, y: y - rowHeight + 3 },
      end: { x: RIGHT, y: y - rowHeight + 3 },
      thickness: 0.4,
      color: LIGHT,
    });

    y -= rowHeight;
  }

  if (y < 300) {
    drawFooter(page, regular, bold, input.reference, pageNumber);
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber += 1;
    drawWatermark(page, bold);
    y = PAGE_HEIGHT - 80;
  }

  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: RIGHT, y },
    thickness: 1,
    color: ACCENT,
  });
  y -= 24;

  page.drawText("GRAND TOTAL", {
    x: MARGIN + 280,
    y,
    size: 11,
    font: bold,
    color: BLACK,
  });
  drawRight(
    page,
    `₹${formatINR(input.grandTotal)}`,
    RIGHT,
    y,
    bold,
    15,
    BLACK
  );
  y -= 20;

  if (input.hasQuoteRows) {
    page.drawText(
      "Custom-size rows are quoted on WhatsApp and excluded from the grand total.",
      { x: MARGIN, y, size: 8, font: regular, color: GREY }
    );
    y -= 18;
  }

  page.drawText(`GST: ${GST_NOTE}`, {
    x: MARGIN,
    y,
    size: 8.5,
    font: regular,
    color: BLACK,
  });
  y -= 22;

  page.drawText("TERMS", {
    x: MARGIN,
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
    const lines = wrapText(term, regular, 8, RIGHT - MARGIN - 12);
    page.drawText("•", {
      x: MARGIN,
      y: y - 1,
      size: 8,
      font: regular,
      color: ACCENT,
    });
    lines.forEach((text, index) => {
      page.drawText(text, {
        x: MARGIN + 12,
        y: y - index * 10,
        size: 8,
        font: regular,
        color: GREY,
      });
    });
    y -= lines.length * 10 + 4;
  }

  drawFooter(page, regular, bold, input.reference, pageNumber);

  return pdfDoc.save();
}
