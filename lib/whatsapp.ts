import { formatDimension, formatINR } from "@/lib/format";
import { stripCostFragments } from "@/lib/sanitize";
import type { ProductType } from "@/lib/productTypeConfig";

interface BookingMessageBase {
  reference: string;
  productName: string;
  sku: string;
  sizeLabel: string;
  topLabel: string;
  gaugeLabel: string;
  frameColorLabel: string;
  buildLabel: string;
  addons: string[];
  quantity: number;
  configUrl: string;
  productType?: ProductType;
  selectionLines?: Array<{ label: string; value: string }>;
}

export type BookingMessageInput = BookingMessageBase &
  (
    | {
        isCustom: true;
        customLengthFt: number;
        customWidthFt: number;
      }
    | {
        isCustom?: false;
        unitPrice: number;
        totalPrice: number;
      }
  );

export function buildBookingMessage(input: BookingMessageInput): string {
  const isNonTable = Boolean(input.productType && input.productType !== "TABLE");
  const lines = ["Hi SANRA LIVING, I'd like to book this configuration:"];

  lines.push(
    `Product: ${stripCostFragments(input.productName)} (${stripCostFragments(input.sku)})`
  );

  if (isNonTable) {
    for (const line of input.selectionLines ?? []) {
      lines.push(`${line.label}: ${stripCostFragments(line.value)}`);
    }
  } else {
    lines.push(`Size: ${stripCostFragments(input.sizeLabel)}`);
    lines.push(`Top: ${stripCostFragments(input.topLabel)}`);
    lines.push(
      `Pipe/Frame: ${stripCostFragments(input.gaugeLabel)} | ${stripCostFragments(input.frameColorLabel)}`
    );
    lines.push(`Build: ${stripCostFragments(input.buildLabel)}`);
    lines.push(
      `Add-ons: ${input.addons.length > 0 ? input.addons.map(stripCostFragments).join(", ") : "None"}`
    );
  }

  lines.push(`Quantity: ${input.quantity}`);

  if (input.isCustom) {
    lines.push(`Quote Ref: ${input.reference}`);
    lines.push(`Config link: ${input.configUrl}`);
    lines.push("");
    lines.push("Please share a custom quote for this exact size.");
    lines.push(
      `Required size: ${formatDimension(input.customLengthFt)} x ${formatDimension(input.customWidthFt)} ft`
    );
  } else {
    lines.push(
      `Quoted Price: ₹${formatINR(input.totalPrice)} (₹${formatINR(input.unitPrice)} each)`
    );
    lines.push(`Quote Ref: ${input.reference}`);
    lines.push(`Config link: ${input.configUrl}`);
    lines.push("");
    lines.push("Please confirm size and delivery details.");
  }

  return lines.join("\n");
}
