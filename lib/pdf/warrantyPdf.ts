import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { company, WARRANTY_TERMS } from "@/lib/company";
import { maskName } from "@/lib/tracking/mask";
import { toPublicProductLines } from "@/lib/tracking/service";
import type { TrackingOrder } from "@/lib/tracking/types";

export interface WarrantyPdfInput {
  order: TrackingOrder;
  issueDate: Date;
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

function formatDateValue(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return formatDate(date);
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

function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  color = BLACK,
  lineHeight = size + 3
): number {
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

export async function buildWarrantyPdf(
  input: WarrantyPdfInput
): Promise<Uint8Array> {
  const { order, issueDate } = input;
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

  y = drawWrapped(
    page,
    company.address,
    MARGIN,
    y,
    370,
    regular,
    8.5,
    GREY,
    11
  );
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
  page.drawText("DIGITAL WARRANTY CERTIFICATE", {
    x: MARGIN,
    y,
    size: 20,
    font: bold,
    color: BLACK,
  });

  drawRight(
    page,
    `Tracking Code: ${order.tracking_code}`,
    rightX,
    y + 12,
    bold,
    9
  );
  drawRight(page, `Issue Date: ${formatDate(issueDate)}`, rightX, y - 2, regular, 8.5, GREY);
  drawRight(
    page,
    `Warranty Expiry: ${formatDateValue(order.warranty_expiry_date)}`,
    rightX,
    y - 15,
    regular,
    8.5,
    GREY
  );

  y -= 34;

  const details: Array<[string, string]> = [
    ["Customer", maskName(order.customer_name_masked)],
    ["Warranty period", `${order.warranty_years} year${order.warranty_years === 1 ? "" : "s"}`],
    ["Warranty expiry", formatDateValue(order.warranty_expiry_date)],
  ];

  for (const [label, value] of details) {
    page.drawText(label, {
      x: MARGIN,
      y,
      size: 9,
      font: bold,
      color: GREY,
    });
    page.drawText(value, {
      x: MARGIN + 110,
      y,
      size: 9.5,
      font: regular,
      color: BLACK,
    });
    y -= 17;
  }

  y -= 10;

  page.drawText("PRODUCTS COVERED", {
    x: MARGIN,
    y,
    size: 9,
    font: bold,
    color: BLACK,
  });
  y -= 14;

  const lines = toPublicProductLines(order.configured_items_json).slice(0, 12);

  for (const line of lines) {
    page.drawText(line.name, {
      x: MARGIN,
      y,
      size: 9,
      font: regular,
      color: BLACK,
    });
    drawRight(page, `${line.size}  •  Qty ${line.quantity}`, rightX, y, regular, 8.5, GREY);
    y -= 14;
  }

  if (toPublicProductLines(order.configured_items_json).length > 12) {
    page.drawText("Additional products are listed in the order record.", {
      x: MARGIN,
      y,
      size: 8,
      font: regular,
      color: GREY,
    });
    y -= 14;
  }

  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: rightX, y },
    thickness: 0.6,
    color: LIGHT,
  });
  y -= 18;

  page.drawText(
    `Structural MIG weld warranty: ${order.warranty_years} year${order.warranty_years === 1 ? "" : "s"} from the recorded handover date.`,
    { x: MARGIN, y, size: 9, font: bold, color: BLACK }
  );
  y -= 16;

  y = drawWrapped(
    page,
    WARRANTY_TERMS,
    MARGIN,
    y,
    rightX - MARGIN,
    regular,
    9,
    BLACK,
    12
  );
  y -= 10;

  page.drawText("STANDARD EXCLUSIONS", {
    x: MARGIN,
    y,
    size: 9,
    font: bold,
    color: BLACK,
  });
  y -= 15;

  const exclusions = [
    "Misuse or use outside the intended purpose.",
    "Overloading beyond the rated load.",
    "Physical damage, alteration or unauthorized repair.",
    "Rust or corrosion from salt/acid exposure on non-stainless items.",
  ];

  for (const exclusion of exclusions) {
    page.drawText("•", {
      x: MARGIN,
      y,
      size: 8.5,
      font: regular,
      color: ACCENT,
    });
    const nextY = drawWrapped(
      page,
      exclusion,
      MARGIN + 12,
      y,
      rightX - MARGIN - 12,
      regular,
      8.5,
      GREY,
      11
    );
    y = Math.min(nextY - 3, y - 12);
  }

  page.drawLine({
    start: { x: MARGIN, y: 64 },
    end: { x: rightX, y: 64 },
    thickness: 0.5,
    color: LIGHT,
  });
  page.drawText("Direct SIDCO Coimbatore Factory", {
    x: MARGIN,
    y: 48,
    size: 8.5,
    font: bold,
    color: BLACK,
  });
  drawRight(
    page,
    `Issued ${formatDate(issueDate)}`,
    rightX,
    48,
    regular,
    8,
    GREY
  );

  return pdfDoc.save();
}
