import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/tracking/ip";
import { checkBulkPriceRateLimit } from "@/lib/b2b/rateLimit";
import { BulkPriceRequestSchema } from "@/lib/b2b/bulk";
import { priceBulkRequest } from "@/lib/b2b/bulkPricing";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (!checkBulkPriceRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many price requests. Please wait a moment." },
      { status: 429, headers: NO_STORE }
    );
  }

  try {
    const body = await req.json();
    const parsed = BulkPriceRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Check the bulk sheet rows and try again." },
        { status: 400, headers: NO_STORE }
      );
    }

    const priced = await priceBulkRequest(parsed.data.rows);
    return NextResponse.json(priced, { status: 200, headers: NO_STORE });
  } catch {
    return NextResponse.json(
      { error: "Unable to price this bulk list. Please check the rows." },
      { status: 400, headers: NO_STORE }
    );
  }
}
