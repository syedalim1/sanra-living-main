import { formatDimension, formatINR } from "@/lib/format";
import { stripCostFragments } from "@/lib/sanitize";

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
  const lines = [
    "Hi SANRA LIVING, I'd like to book this configuration:",
    `Product: ${stripCostFragments(input.productName)} (${stripCostFragments(input.sku)})`,
    `Size: ${stripCostFragments(input.sizeLabel)}`,
    `Top: ${stripCostFragments(input.topLabel)}`,
    `Pipe/Frame: ${stripCostFragments(input.gaugeLabel)} | ${stripCostFragments(input.frameColorLabel)}`,
    `Build: ${stripCostFragments(input.buildLabel)}`,
    `Add-ons: ${input.addons.length > 0 ? input.addons.map(stripCostFragments).join(", ") : "None"}`,
    `Quantity: ${input.quantity}`,
  ];

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
