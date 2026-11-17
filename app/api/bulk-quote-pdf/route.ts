import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/tracking/ip";
import { checkBulkPdfRateLimit } from "@/lib/b2b/rateLimit";
import {
  BulkQuoteRequestSchema,
  describeBulkRow,
} from "@/lib/b2b/bulk";
import { priceBulkRequest } from "@/lib/b2b/bulkPricing";
import { saveLead } from "@/lib/b2b/leadSave";
import { generateQuoteRef, isValidQuoteRef } from "@/lib/quoteRef";
import { buildBulkQuotePdf } from "@/lib/pdf/bulkQuotePdf";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (!(await checkBulkPdfRateLimit(ip))) {
    return NextResponse.json(
      { error: "Too many quote downloads. Please wait a moment." },
      { status: 429, headers: NO_STORE }
    );
  }

  try {
    const body = await req.json();
    const parsed = BulkQuoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Check the bulk sheet rows and lead details." },
        { status: 400, headers: NO_STORE }
      );
    }

    const priced = await priceBulkRequest(parsed.data.rows);
    const reference =
      parsed.data.reference && isValidQuoteRef(parsed.data.reference)
        ? parsed.data.reference
        : generateQuoteRef();

    const db = createServerClient();

    try {
      await saveLead(db, {
        kind: "BULK_QUOTE",
        name: parsed.data.lead.name,
        phone: parsed.data.lead.phone,
        details: {
          quote_reference: reference,
          configurations: parsed.data.rows.map((row) => ({
            sku: row.sku,
            quantity: row.quantity,
            selections: row.selections,
            addons: row.addons,
          })),
        },
      });
    } catch {
      // A lead failure must not block the fast quote download.
    }

    const skus = Array.from(new Set(parsed.data.rows.map((row) => row.sku)));

    const [productResult, optionResult] = await Promise.all([
      db.from("products").select("sku, name").in("sku", skus),
      db.from("configurator_options").select("option_group, option_code, label_en"),
    ]);

    const productNames = new Map<string, string>();
    for (const product of productResult.data ?? []) {
      productNames.set(product.sku, product.name);
    }

    const labels = new Map<string, string>();
    const addonLabels = new Map<string, string>();

    for (const option of optionResult.data ?? []) {
      labels.set(`${option.option_group}:${option.option_code}`, option.label_en);
      if (option.option_group === "ADDON") {
        addonLabels.set(option.option_code, option.label_en);
      }
    }

    const lines = parsed.data.rows.map((row, index) => {
      const rowPrice = priced.rows[index];
      return {
        item: productNames.get(row.sku) ?? row.sku,
        configuration: describeBulkRow(row, labels, addonLabels),
        quantity: row.quantity,
        unitPrice: rowPrice?.requires_quote ? null : rowPrice?.unit_price ?? null,
        lineTotal: rowPrice?.requires_quote ? null : rowPrice?.total_price ?? null,
      };
    });

    const issueDate = new Date();
    const validUntil = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const pdfBytes = await buildBulkQuotePdf({
      reference,
      issueDate,
      validUntil,
      lines,
      grandTotal: priced.grand_total,
      hasQuoteRows: priced.rows.some((row) => row.requires_quote),
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SANRA-BulkQuote-${reference}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate the bulk quote. Please try again." },
      { status: 400, headers: NO_STORE }
    );
  }
}
