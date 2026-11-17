import { NextRequest, NextResponse } from "next/server";
import {
  calculateConfigPrice,
  getProductTypeForSku,
  parseNonTableConfig,
} from "@/lib/pricing/configPrice";
import { getConfigSummary, type ConfigSummaryInput } from "@/lib/configSummary";
import { generateQuoteRef } from "@/lib/quoteRef";
import { whatsappHref } from "@/lib/company";
import {
  ConfigEnvelopeSchema,
  WhatsAppLinkInputSchema,
  type ConfigPriceInput,
  type NonTableConfigInput,
} from "@/lib/schemas";
import { buildBookingMessage } from "@/lib/whatsapp";
import { selectionParam } from "@/lib/productTypeConfig";
import { checkSharedRateLimit } from "@/lib/rateLimit";
import { productPath } from "@/lib/site";

function getOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.nextUrl.protocol.replace(":", "");

  return host ? `${protocol}://${host}` : req.nextUrl.origin;
}

function tableConfigUrl(
  origin: string,
  input: ConfigPriceInput,
  customLength?: number,
  customWidth?: number,
  pin?: string
): string {
  const params = new URLSearchParams();
  params.set("top_tab", input.top_tab);
  if (input.top_material) params.set("top_material", input.top_material);
  params.set("gauge", input.gauge);
  params.set("frame_color", input.frame_color);
  params.set("build_type", input.build_type);
  params.set("size", input.size);
  if (input.addons.length > 0) params.set("addons", input.addons.join(","));
  params.set("quantity", String(input.quantity));
  if (input.size === "CUSTOM" && customLength != null && customWidth != null) {
    params.set("custom_length_ft", String(customLength));
    params.set("custom_width_ft", String(customWidth));
  }
  if (pin) params.set("pin", pin);
  return `${origin}${productPath(input.sku)}?${params.toString()}`;
}

function nonTableConfigUrl(
  origin: string,
  input: NonTableConfigInput,
  pin?: string
): string {
  const params = new URLSearchParams();
  for (const [group, code] of Object.entries(input.selections)) {
    params.set(selectionParam(group), code);
  }
  params.set("quantity", String(input.quantity));
  if (pin) params.set("pin", pin);
  return `${origin}${productPath(input.sku)}?${params.toString()}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (
      !(await checkSharedRateLimit({
        scope: "whatsapp",
        ip,
        limit: 20,
        windowMs: 60_000,
      }))
    ) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await req.json();
    const envelope = ConfigEnvelopeSchema.safeParse(body);

    if (!envelope.success) {
      return NextResponse.json(
        { error: "Please check the configuration and try again." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const productType = await getProductTypeForSku(envelope.data.sku);
    const reference = generateQuoteRef();
    const origin = getOrigin(req);

    if (productType === "TABLE") {
      const parsed = WhatsAppLinkInputSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Please check the configuration and try again." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      const input = parsed.data;
      const price = await calculateConfigPrice(input);

      if (input.size !== "CUSTOM" && (price.unit_price == null || price.total_price == null)) {
        return NextResponse.json(
          { error: "Unable to prepare this configuration right now." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      if (
        input.size === "CUSTOM" &&
        (input.custom_length_ft == null || input.custom_width_ft == null)
      ) {
        return NextResponse.json(
          { error: "Please enter a valid custom length and width." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      const summaryInput: ConfigSummaryInput = { productType: "TABLE", tableInput: input };
      const summary = await getConfigSummary(summaryInput);
      const configUrl = tableConfigUrl(
        origin,
        input,
        input.custom_length_ft,
        input.custom_width_ft,
        envelope.data.pin
      );

      const baseMessage = {
        reference,
        productType: "TABLE" as const,
        productName: summary.product_name,
        sku: summary.sku,
        sizeLabel: summary.size_label,
        topLabel: summary.top_label,
        gaugeLabel: summary.gauge_label,
        frameColorLabel: summary.frame_color_label,
        buildLabel: summary.build_label,
        addons: summary.addons_labels,
        quantity: summary.quantity,
        configUrl,
        selectionLines: summary.selection_lines,
      };

      const message =
        input.size === "CUSTOM"
          ? buildBookingMessage({
              ...baseMessage,
              isCustom: true,
              customLengthFt: input.custom_length_ft as number,
              customWidthFt: input.custom_width_ft as number,
            })
          : buildBookingMessage({
              ...baseMessage,
              isCustom: false,
              unitPrice: price.unit_price as number,
              totalPrice: price.total_price as number,
            });

      return NextResponse.json(
        { url: whatsappHref(message) },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const input = await parseNonTableConfig(body);
    const price = await calculateConfigPrice(input);

    if (price.unit_price == null || price.total_price == null) {
      return NextResponse.json(
        { error: "Unable to prepare this configuration right now." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const summaryInput: ConfigSummaryInput = {
      productType: input.product_type,
      nonTableInput: input,
    };
    const summary = await getConfigSummary(summaryInput);
    const configUrl = nonTableConfigUrl(origin, input, envelope.data.pin);

    const message = buildBookingMessage({
      reference,
      productType: input.product_type,
      productName: summary.product_name,
      sku: summary.sku,
      sizeLabel: summary.size_label,
      topLabel: summary.top_label,
      gaugeLabel: summary.gauge_label,
      frameColorLabel: summary.frame_color_label,
      buildLabel: summary.build_label,
      addons: summary.addons_labels,
      quantity: summary.quantity,
      configUrl,
      selectionLines: summary.selection_lines,
      isCustom: false,
      unitPrice: price.unit_price,
      totalPrice: price.total_price,
    });

    return NextResponse.json(
      { url: whatsappHref(message) },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to prepare the WhatsApp message. Please try again." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
