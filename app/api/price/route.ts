import { NextRequest, NextResponse } from "next/server";
import { calculateConfigPrice } from "@/lib/pricing/configPrice";
import { checkSharedRateLimit } from "@/lib/rateLimit";
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
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const body = await req.json();
    const result = await calculateConfigPrice(body);
    return NextResponse.json(
      {
        unit_price: result.unit_price,
        total_price: result.total_price,
        discount_pct: result.discount_pct,
        bumper_included: result.bumper_included,
        requires_quote: result.requires_quote,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    // Strictly generic error messages, never leaking stacks or pricing logic
    return NextResponse.json(
      { error: "Unable to calculate configuration price." },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

