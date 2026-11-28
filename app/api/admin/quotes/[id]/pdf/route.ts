import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { buildBulkQuotePdf, type BulkQuoteLine } from "@/lib/pdf/bulkQuotePdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = createServerClient();

  const [{ data: quote }, { data: items }] = await Promise.all([
    db.from("quotes").select("*").eq("id", id).maybeSingle(),
    db.from("quote_items").select("*").eq("quote_id", id).order("created_at"),
  ]);

  if (!quote) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  let grandTotal = 0;
  let hasQuoteRows = false;

  const lines: BulkQuoteLine[] = (items ?? []).map((item) => {
    const snap = (item.public_snapshot_json ?? {}) as Record<string, unknown>;
    const unit =
      item.negotiated_unit_price != null
        ? Number(item.negotiated_unit_price)
        : item.unit_price != null
          ? Number(item.unit_price)
          : null;
    const total =
      unit != null ? Math.round(unit * Number(item.quantity) * 100) / 100 : null;

    if (total == null || item.requires_quote) {
      hasQuoteRows = true;
    } else {
      grandTotal += total;
    }

    return {
      item: `${item.product_name} (${item.sku})`,
      configuration: [
        snap.frame_material,
        snap.build_category,
        snap.surface,
        snap.size,
      ]
        .filter(Boolean)
        .join(" · "),
      quantity: Number(item.quantity),
      unitPrice: unit,
      lineTotal: total,
    };
  });

  const pdfBytes = await buildBulkQuotePdf({
    reference: quote.reference as string,
    issueDate: new Date(quote.created_at as string),
    validUntil: new Date(quote.valid_until as string),
    lines,
    grandTotal,
    hasQuoteRows,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="SANRA-Quote-${quote.reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
