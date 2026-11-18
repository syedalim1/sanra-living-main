import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkSharedRateLimit } from "@/lib/rateLimit";
import { buildSetSummary } from "@/lib/pricing/setSummary";
import { generateQuoteRef } from "@/lib/quoteRef";
import { buildSetQuotePdf } from "@/lib/pdf/setQuotePdf";

const NO_STORE = { "Cache-Control": "no-store" };

const InputSchema = z.object({
  sku: z.string().min(1).max(60),
  quantity: z.number().int().min(1).max(50).default(1),
  item_selections: z
    .record(z.string(), z.record(z.string(), z.string()))
    .optional()
    .default({}),
});

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (
      !(await checkSharedRateLimit({
        scope: "set-pdf",
        ip,
        limit: 10,
        windowMs: 60_000,
      }))
    ) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429, headers: NO_STORE }
      );
    }

    const parsed = InputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid set." }, { status: 400, headers: NO_STORE });
    }

    const summary = await buildSetSummary(
      parsed.data.sku,
      parsed.data.item_selections,
      parsed.data.quantity
    );
    const quoteRef = generateQuoteRef();
    const pdf = await buildSetQuotePdf(summary, quoteRef);

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SANRA-${summary.sku}-${quoteRef}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to build set quote." },
      { status: 400, headers: NO_STORE }
    );
  }
}
