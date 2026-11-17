import { NextRequest, NextResponse } from "next/server";
import { calculateConfigPrice } from "@/lib/pricing/configPrice";
import { getConfigSummary } from "@/lib/configSummary";
import { generateQuoteRef } from "@/lib/quoteRef";
import { ConfigPriceInputSchema } from "@/lib/schemas";
import { buildQuotePdf } from "@/lib/pdf/quotePdf";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (entry.count >= 10) {
    return false;
  }

  entry.count += 1;
  return true;
}

function getWebsiteName(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return forwardedHost || req.headers.get("host") || req.nextUrl.host || "SANRA LIVING";
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
    const parsed = ConfigPriceInputSchema.safeParse(body);

    if (!parsed.success || parsed.data.size === "CUSTOM") {
      return NextResponse.json(
        { error: "This configuration cannot be generated as a PDF." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const price = await calculateConfigPrice(parsed.data);

    if (
      price.requires_quote ||
      price.unit_price == null ||
      price.total_price == null ||
      price.discount_pct == null
    ) {
      return NextResponse.json(
        { error: "This configuration cannot be generated as a PDF." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const summary = await getConfigSummary(parsed.data);
    const reference = generateQuoteRef();
    const pdfBytes = await buildQuotePdf({
      summary,
      price: {
        unit_price: price.unit_price,
        total_price: price.total_price,
        discount_pct: price.discount_pct,
      },
      reference,
      issueDate: new Date(),
      websiteName: getWebsiteName(req),
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SANRA-Quote-${reference}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate the quote PDF. Please try again." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
