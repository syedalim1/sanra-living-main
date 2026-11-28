import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { calculateVariantPrice } from "@/lib/pricing/variantPricingEngine";
import { checkSharedRateLimit } from "@/lib/rateLimit";
import { whatsappHref } from "@/lib/company";
import { SITE_URL, productPath } from "@/lib/site";

const NO_STORE = { "Cache-Control": "no-store" };

const EnquiryQuoteSchema = z
  .object({
    intent: z.enum(["REPRICE", "WHATSAPP", "SUBMIT"]).default("REPRICE"),
    items: z
      .array(
        z.object({
          variant_id: z.string().uuid(),
          quantity: z.coerce.number().int().min(1).max(10_000),
        })
      )
      .min(1)
      .max(25),
    customer_name: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(25).optional(),
    email: z.string().trim().email().max(120).optional().or(z.literal("")),
    company: z.string().trim().max(120).optional(),
    city: z.string().trim().max(80).optional(),
    delivery_notes: z.string().trim().max(400).optional(),
  })
  .strict();

function makeQuoteReference(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SLQ-${datePart}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (
      !(await checkSharedRateLimit({
        scope: "enquiry-quote",
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

    const body = await req.json();
    const parsed = EnquiryQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid enquiry basket request." },
        { status: 400, headers: NO_STORE }
      );
    }

    const d = parsed.data;
    const variantIds = [...new Set(d.items.map((i) => i.variant_id))];

    const [variantsRes, buildCatsRes, surfacesRes, pricingPrivateRes] =
      await Promise.all([
        supabaseServer
          .from("product_variants")
          .select(
            "id, product_id, variant_code, frame_material, build_category_id, surface_option_id, size_code, size_label, finish_label, status, is_active"
          )
          .in("id", variantIds)
          .eq("is_active", true)
          .eq("status", "PUBLISHED"),
        supabaseServer.from("build_categories").select("id, public_label"),
        supabaseServer.from("surface_options").select("id, label"),
        supabaseServer
          .from("variant_pricing_private")
          .select("variant_id, manufacturing_cost, cost_source")
          .in("variant_id", variantIds),
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
    const buildLabelMap = new Map(
      (buildCatsRes.data ?? []).map((b) => [b.id as string, b.public_label as string])
    );
    const surfaceLabelMap = new Map(
      (surfacesRes.data ?? []).map((s) => [s.id as string, s.label as string])
    );
    const privateCostMap = new Map(
      (pricingPrivateRes.data ?? []).map((p) => [p.variant_id as string, p])
    );

    const pricedLines: Array<{
      variant_id: string;
      product_id: string | null;
      sku: string;
      product_name: string;
      frame_material: string;
      build_category: string;
      surface: string | null;
      size_label: string;
      finish_label: string | null;
      product_url: string;
      quantity: number;
      unit_price: number | null;
      line_total: number | null;
      price_basis: "GST_INCLUSIVE" | "GST_EXCLUSIVE" | null;
      gst_rate: number | null;
      gst_amount: number | null;
      requires_quote: boolean;
      quote_reason: string | null;
      lead_time_days: number | null;
    }> = [];

    let subtotal = 0;
    let totalGst = 0;
    let hasQuoteOnly = false;
    const bases = new Set<string>();

    for (const reqItem of d.items) {
      const v = variantMap.get(reqItem.variant_id);
      if (!v) continue;
      const prod = productMap.get(v.product_id as string);
      if (!prod) continue;

      const calc = await calculateVariantPrice({
        variantId: reqItem.variant_id,
        quantity: reqItem.quantity,
        productType: prod.product_type as string,
      });

      if (calc.quote_reason === "VARIANT_NOT_PUBLISHED") continue;

      const sku = prod.sku as string;
      const canonicalUrl = `${SITE_URL}${productPath(sku)}`;
      const frameLabel =
        v.frame_material === "SS" ? "Stainless Steel" : "Mild Steel";
      const buildLabel =
        buildLabelMap.get(v.build_category_id as string) ?? "Standard";
      const surfaceLabel = v.surface_option_id
        ? surfaceLabelMap.get(v.surface_option_id as string) ?? null
        : null;

      if (calc.requires_quote || calc.unit_price == null || calc.total_price == null) {
        hasQuoteOnly = true;
      } else {
        subtotal += calc.total_price;
        totalGst += calc.gst_amount ?? 0;
        if (calc.price_basis) bases.add(calc.price_basis);
      }

      pricedLines.push({
        variant_id: reqItem.variant_id,
        product_id: (prod.id as string) ?? null,
        sku,
        product_name: prod.name as string,
        frame_material: frameLabel,
        build_category: buildLabel,
        surface: surfaceLabel,
        size_label: v.size_label as string,
        finish_label: (v.finish_label as string | null) ?? null,
        product_url: canonicalUrl,
        quantity: reqItem.quantity,
        unit_price: calc.unit_price,
        line_total: calc.total_price,
        price_basis: calc.price_basis,
        gst_rate: calc.gst_rate,
        gst_amount: calc.gst_amount,
        requires_quote: calc.requires_quote,
        quote_reason: calc.quote_reason,
        lead_time_days: calc.lead_time_days,
      });
    }

    if (pricedLines.length === 0) {
      return NextResponse.json(
        { error: "No valid published variants in enquiry list." },
        { status: 400, headers: NO_STORE }
      );
    }

    const priceBasis =
      bases.size === 0
        ? "QUOTE_ONLY"
        : bases.size > 1
          ? "MIXED"
          : [...bases][0];

    let reference: string | null = null;
    let validUntil: string | null = null;
    let whatsappUrl: string | null = null;

    if (d.intent === "WHATSAPP" || d.intent === "SUBMIT") {
      reference = makeQuoteReference();
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      validUntil = expiry.toISOString().slice(0, 10);

      const { data: quoteRow, error: qErr } = await supabaseServer
        .from("quotes")
        .insert({
          reference,
          customer_name: d.customer_name || null,
          phone: d.phone || null,
          email: d.email || null,
          company: d.company || null,
          city: d.city || null,
          delivery_notes: d.delivery_notes || null,
          lead_source: d.intent === "WHATSAPP" ? "WHATSAPP_ENQUIRY" : "WEB_ENQUIRY",
          status: "NEW_ENQUIRY",
          price_basis: priceBasis,
          gst_rate: 18,
          subtotal: Math.round(subtotal * 100) / 100,
          gst_amount: Math.round(totalGst * 100) / 100,
          total_amount: Math.round((subtotal + (priceBasis === "GST_EXCLUSIVE" ? totalGst : 0)) * 100) / 100,
          valid_until: validUntil,
          whatsapp_clicked_at: d.intent === "WHATSAPP" ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (qErr || !quoteRow) {
        throw new Error("Failed to persist quotation.");
      }

      for (const line of pricedLines) {
        const { data: qiRow } = await supabaseServer
          .from("quote_items")
          .insert({
            quote_id: quoteRow.id,
            product_id: line.product_id,
            variant_id: line.variant_id,
            sku: line.sku,
            product_name: line.product_name,
            public_snapshot_json: {
              frame_material: line.frame_material,
              build_category: line.build_category,
              surface: line.surface,
              size: line.size_label,
              finish: line.finish_label,
              product_url: line.product_url,
            },
            quantity: line.quantity,
            unit_price: line.unit_price,
            line_total: line.line_total,
            price_basis: line.price_basis,
            requires_quote: line.requires_quote,
            lead_time_days: line.lead_time_days,
          })
          .select("id")
          .single();

        if (qiRow) {
          const priv = privateCostMap.get(line.variant_id);
          await supabaseServer.from("quote_item_costs").insert({
            quote_item_id: qiRow.id,
            manufacturing_cost_snapshot: priv?.manufacturing_cost ?? null,
            cost_source: priv?.cost_source ?? null,
          });
        }
      }

      if (d.intent === "WHATSAPP") {
        const msgLines = [
          `Hi SANRA LIVING, I'd like a factory quotation (${reference}):`,
          "",
        ];
        pricedLines.forEach((line, idx) => {
          msgLines.push(
            `${idx + 1}. ${line.product_name} (${line.sku})`,
            `   Material: ${line.frame_material} | Build: ${line.build_category}${line.surface ? ` | Surface: ${line.surface}` : ""} | Size: ${line.size_label}${line.finish_label ? ` | Finish: ${line.finish_label}` : ""}`,
            `   Qty: ${line.quantity} | ${
              !line.requires_quote && line.unit_price != null
                ? `Unit: ₹${line.unit_price.toLocaleString("en-IN")} | Total: ₹${(line.line_total ?? 0).toLocaleString("en-IN")} (${line.price_basis === "GST_INCLUSIVE" ? "Incl. GST" : "Excl. GST"})`
                : "Status: Custom Quotation Required"
            }`,
            `   Link: ${line.product_url}`
          );
        });

        msgLines.push("");
        if (subtotal > 0) {
          msgLines.push(
            `Estimated Reference Total: ₹${subtotal.toLocaleString("en-IN")} (${priceBasis === "GST_INCLUSIVE" ? "Incl. GST" : "GST Extra"})`
          );
        }
        if (hasQuoteOnly) {
          msgLines.push("Note: Some items require confirmed custom quotation.");
        }
        if (d.city || d.delivery_notes) {
          msgLines.push(
            `Delivery/Location: ${[d.city, d.delivery_notes].filter(Boolean).join(" — ")}`
          );
        }

        whatsappUrl = whatsappHref(msgLines.join("\n"));
      }
    }

    return NextResponse.json(
      {
        reference,
        valid_until: validUntil,
        price_basis: priceBasis,
        subtotal: Math.round(subtotal * 100) / 100,
        gst_amount: Math.round(totalGst * 100) / 100,
        has_quote_only: hasQuoteOnly,
        whatsapp_url: whatsappUrl,
        items: pricedLines.map((l) => ({
          variant_id: l.variant_id,
          sku: l.sku,
          product_name: l.product_name,
          frame_material: l.frame_material,
          build_category: l.build_category,
          surface: l.surface,
          size_label: l.size_label,
          finish_label: l.finish_label,
          product_url: l.product_url,
          quantity: l.quantity,
          unit_price: l.unit_price,
          line_total: l.line_total,
          price_basis: l.price_basis,
          gst_rate: l.gst_rate,
          requires_quote: l.requires_quote,
          quote_reason: l.quote_reason,
          lead_time_days: l.lead_time_days,
        })),
      },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to process enquiry quotation." },
      { status: 400, headers: NO_STORE }
    );
  }
}
