import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateConfigPrice } from "@/lib/pricing/configPrice";
import { calculateVariantPrice } from "@/lib/pricing/variantPricingEngine";
import { checkSharedRateLimit } from "@/lib/rateLimit";

const NO_STORE = { "Cache-Control": "no-store" };

const VariantPriceRequestSchema = z
  .object({
    variant_id: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(10_000).default(1),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (
      !(await checkSharedRateLimit({
        scope: "price",
        ip,
        limit: 30,
        windowMs: 60_000,
      }))
    ) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: NO_STORE }
      );
    }

    const body = await req.json();

    if (body && typeof body === "object" && "variant_id" in body) {
      const parsed = VariantPriceRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid variant pricing request." },
          { status: 400, headers: NO_STORE }
        );
      }

      const result = await calculateVariantPrice({
        variantId: parsed.data.variant_id,
        quantity: parsed.data.quantity,
      });

      return NextResponse.json(
        {
          variant_id: result.variant_id,
          variant_code: result.variant_code,
          quantity: result.quantity,
          unit_price: result.unit_price,
          total_price: result.total_price,
          price_basis: result.price_basis,
          gst_rate: result.gst_rate,
          gst_amount: result.gst_amount,
          availability: result.availability,
          lead_time_days: result.lead_time_days,
          requires_quote: result.requires_quote,
          quote_reason: result.quote_reason,
        },
        { status: 200, headers: NO_STORE }
      );
    }

    const result = await calculateConfigPrice(body);
    return NextResponse.json(
      {
        unit_price: result.unit_price,
        total_price: result.total_price,
        discount_pct: result.discount_pct,
        bumper_included: result.bumper_included,
        requires_quote: result.requires_quote,
      },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    // Strictly generic error messages, never leaking stacks or pricing logic
    return NextResponse.json(
      { error: "Unable to calculate configuration price." },
      { status: 400, headers: NO_STORE }
    );
  }
}
