import { NextRequest, NextResponse } from "next/server";
import { checkSharedRateLimit } from "@/lib/rateLimit";
import { calculateSetPrice } from "@/lib/pricing/setPrice";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (
      !(await checkSharedRateLimit({
        scope: "set-price",
        ip,
        limit: 30,
        windowMs: 60_000,
      }))
    ) {
      return NextResponse.json(
        { error: "Too many price requests. Please wait a moment." },
        { status: 429, headers: NO_STORE }
      );
    }

    const body = await req.json();
    const result = await calculateSetPrice(body);

    return NextResponse.json(
      {
        unit_price: result.unit_price,
        total_price: result.total_price,
        requires_quote: result.requires_quote,
      },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to calculate set price." },
      { status: 400, headers: NO_STORE }
    );
  }
}
