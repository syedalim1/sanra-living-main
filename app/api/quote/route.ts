import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateProductPrice } from "@/lib/pricing";
import { checkSharedRateLimit } from "@/lib/rateLimit";

const NO_STORE = { "Cache-Control": "no-store" };

const QuoteRequestSchema = z
  .object({
    productId: z.string().trim().min(1).max(100),
    topMaterialCode: z.string().trim().min(1).max(60).optional(),
    frameMaterialCode: z.string().trim().min(1).max(60).optional(),
    sizeMultiplier: z.coerce.number().finite().min(0.1).max(20).optional(),
    customerType: z.enum(["RETAIL", "B2B"]).optional(),
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
        scope: "quote",
        ip,
        limit: 20,
        windowMs: 60_000,
      }))
    ) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a moment." },
        { status: 429, headers: NO_STORE }
      );
    }

    const body = await req.json();
    const parsed = QuoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid quote request." },
        { status: 400, headers: NO_STORE }
      );
    }

    const pricing = await calculateProductPrice({
      productId: parsed.data.productId,
      topMaterialCode: parsed.data.topMaterialCode,
      frameMaterialCode: parsed.data.frameMaterialCode,
      sizeMultiplier: parsed.data.sizeMultiplier ?? 1.0,
      customerType: parsed.data.customerType ?? "RETAIL",
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          finalPrice: pricing.finalPrice,
          gstAmount: pricing.gstAmount,
          totalWithGst: pricing.totalWithGst,
          customerType: pricing.customerType,
          topMaterialName: pricing.topMaterialName,
          topMaterialCode: pricing.topMaterialCode,
          frameMaterialName: pricing.frameMaterialName,
          isCustomQuoteRequired: pricing.isCustomQuoteRequired,
        },
      },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate live factory price quote",
      },
      { status: 500, headers: NO_STORE }
    );
  }
}
