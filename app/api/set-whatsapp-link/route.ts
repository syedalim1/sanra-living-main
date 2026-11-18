import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkSharedRateLimit } from "@/lib/rateLimit";
import { buildSetSummary } from "@/lib/pricing/setSummary";
import { generateQuoteRef } from "@/lib/quoteRef";
import { whatsappHref } from "@/lib/company";
import { SITE_URL } from "@/lib/site";

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
        scope: "set-whatsapp",
        ip,
        limit: 20,
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
    const link = `${SITE_URL}/sets/${encodeURIComponent(summary.sku)}`;

    const lines = [
      "Hi SANRA LIVING, I'd like to book this set:",
      `Set: ${summary.name} (${summary.sku})`,
      "",
    ];

    for (const item of summary.items) {
      lines.push(`${item.quantity} x ${item.name} (${item.sku})`);
      for (const selection of item.selections) {
        lines.push(`  ${selection.group}: ${selection.option}`);
      }
    }

    lines.push("");
    lines.push(
      summary.requires_quote
        ? "Total: Please confirm on WhatsApp"
        : `Total: Rs. ${summary.total_price.toLocaleString("en-IN")}`
    );
    lines.push(`Quote ref: ${quoteRef}`);
    lines.push(`Link: ${link}`);

    return NextResponse.json(
      { url: whatsappHref(lines.join("\n")) },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to prepare WhatsApp message." },
      { status: 400, headers: NO_STORE }
    );
  }
}
