import { NextRequest, NextResponse } from "next/server";
import { calculateConfigPrice } from "@/lib/pricing/configPrice";
import { getConfigSummary } from "@/lib/configSummary";
import { generateQuoteRef } from "@/lib/quoteRef";
import { whatsappHref } from "@/lib/company";
import { WhatsAppLinkInputSchema } from "@/lib/schemas";
import { buildBookingMessage } from "@/lib/whatsapp";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (entry.count >= 20) {
    return false;
  }

  entry.count += 1;
  return true;
}

function getOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.nextUrl.protocol.replace(":", "");

  return host ? `${protocol}://${host}` : req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const body = await req.json();
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

    if (input.size === "CUSTOM" && (input.custom_length_ft == null || input.custom_width_ft == null)) {
      return NextResponse.json(
        { error: "Please enter a valid custom length and width." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const summary = await getConfigSummary(input);
    const reference = generateQuoteRef();

    const params = new URLSearchParams();
    params.set("top_tab", input.top_tab);
    if (input.top_material) params.set("top_material", input.top_material);
    params.set("gauge", input.gauge);
    params.set("frame_color", input.frame_color);
    params.set("build_type", input.build_type);
    params.set("size", input.size);
    if (input.addons.length > 0) params.set("addons", input.addons.join(","));
    params.set("quantity", String(input.quantity));
    if (input.size === "CUSTOM") {
      params.set("custom_length_ft", String(input.custom_length_ft));
      params.set("custom_width_ft", String(input.custom_width_ft));
    }
    if (input.pin) params.set("pin", input.pin);

    const configUrl = `${getOrigin(req)}/products/${encodeURIComponent(input.sku)}?${params.toString()}`;

    const baseMessage = {
      reference,
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
    };

    let message: string;
    if (input.size === "CUSTOM") {
      message = buildBookingMessage({
        ...baseMessage,
        isCustom: true,
        customLengthFt: input.custom_length_ft as number,
        customWidthFt: input.custom_width_ft as number,
      });
    } else {
      message = buildBookingMessage({
        ...baseMessage,
        isCustom: false,
        unitPrice: price.unit_price as number,
        totalPrice: price.total_price as number,
      });
    }

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
