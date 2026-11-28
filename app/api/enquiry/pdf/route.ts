import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { calculateVariantPrice } from "@/lib/pricing/variantPricingEngine";
import { buildBulkQuotePdf, type BulkQuoteLine } from "@/lib/pdf/bulkQuotePdf";
import { checkSharedRateLimit } from "@/lib/rateLimit";

const NO_STORE = { "Cache-Control": "no-store" };

const EnquiryPdfSchema = z
  .object({
    items: z
      .array(
        z.object({
          variant_id: z.string().uuid(),
          quantity: z.coerce.number().int().min(1).max(10_000),
        })
      )
      .min(1)
      .max(25),
    reference: z.string().trim().max(40).optional(),
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
        scope: "enquiry-pdf",
        ip,
        limit: 10,
        windowMs: 60_000,
      }))
    ) {
      return NextResponse.json(
        { error: "Too many PDF requests. Please wait a moment." },
        { status: 429, headers: NO_STORE }
      );
    }

    const body = await req.json();
    const parsed = EnquiryPdfSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid enquiry PDF request." },
        { status: 400, headers: NO_STORE }
      );
    }

    const variantIds = [...new Set(parsed.data.items.map((i) => i.variant_id))];
    const [variantsRes, buildCatsRes, surfacesRes] = await Promise.all([
      supabaseServer
        .from("product_variants")
        .select(
          "id, product_id, frame_material, build_category_id, surface_option_id, size_label, finish_label"
        )
        .in("id", variantIds)
          .eq("is_active", true)
          .eq("status", "PUBLISHED"),
      supabaseServer.from("build_categories").select("id, public_label"),
      supabaseServer.from("surface_options").select("id, label"),
    ]);

    const variantMap = new Map(
      (variantsRes.data ?? []).map((v) => [v.id as string, v])
    );
    const productIds = [
      ...new Set(
        (variantsRes.data ?? []).map((v) => v.product_id as string).filter(Boolean)
      ),
    ];
    const { data: productsData } =
      productIds.length > 0
        ? await supabaseServer
            .from("products")
            .select("id, sku, name, product_type")
            .in("id", productIds)
            .eq("is_active", true)
        : { data: [] as Array<Record<string, unknown>> };

    const productMap = new Map(
      (productsData ?? []).map((p) => [p.id as string, p])
    );
    const buildMap = new Map(
      (buildCatsRes.data ?? []).map((b) => [b.id as string, b.public_label as string])
    );
    const surfaceMap = new Map(
      (surfacesRes.data ?? []).map((s) => [s.id as string, s.label as string])
    );

    const lines: BulkQuoteLine[] = [];
    let grandTotal = 0;
    let hasQuoteRows = false;

    for (const item of parsed.data.items) {
      const v = variantMap.get(item.variant_id);
      if (!v) continue;
      const prod = productMap.get(v.product_id as string);
      if (!prod) continue;

      const price = await calculateVariantPrice({
        variantId: item.variant_id,
        quantity: item.quantity,
        productType: prod.product_type as string,
      });

      if (price.quote_reason === "VARIANT_NOT_PUBLISHED") continue;

      const configParts = [
        v.frame_material === "SS" ? "Stainless Steel" : "Mild Steel",
        buildMap.get(v.build_category_id as string) ?? "Standard",
        v.surface_option_id
          ? surfaceMap.get(v.surface_option_id as string) ?? null
          : null,
        v.size_label as string,
        (v.finish_label as string | null) ?? null,
      ].filter(Boolean);

      if (price.requires_quote || price.unit_price == null || price.total_price == null) {
        hasQuoteRows = true;
      } else {
        grandTotal += price.total_price;
      }

      lines.push({
        item: `${prod.name} (${prod.sku})`,
        configuration: configParts.join(" · "),
        quantity: item.quantity,
        unitPrice: price.requires_quote ? null : price.unit_price,
        lineTotal: price.requires_quote ? null : price.total_price,
      });
    }

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "No valid items to generate PDF." },
        { status: 400, headers: NO_STORE }
      );
    }

    const issueDate = new Date();
    const validUntil = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const reference =
      parsed.data.reference ||
      `SLQ-${issueDate.toISOString().slice(0, 10).replace(/-/g, "")}`;

    const pdfBytes = await buildBulkQuotePdf({
      reference,
      issueDate,
      validUntil,
      lines,
      grandTotal,
      hasQuoteRows,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SANRA-Enquiry-${reference}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to generate quotation PDF." },
      { status: 400, headers: NO_STORE }
    );
  }
}
