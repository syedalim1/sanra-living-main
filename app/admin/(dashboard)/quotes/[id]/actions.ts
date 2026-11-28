"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";
import { createServerClient } from "@/lib/supabase/server";
import { maskName, normalizePhoneFull } from "@/lib/tracking/mask";

export interface QuoteAdminActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const UpdateQuoteSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "NEW_ENQUIRY",
    "QUOTATION_SENT",
    "NEGOTIATION",
    "CONFIRMED",
    "EXPIRED",
    "CLOSED",
  ]),
  notes_internal: z.string().max(1000).optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function updateQuoteAction(
  _prev: QuoteAdminActionState,
  formData: FormData
): Promise<QuoteAdminActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const parsed = UpdateQuoteSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes_internal: formData.get("notes_internal") || undefined,
    valid_until: formData.get("valid_until"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid quotation update values." };
  }

  const d = parsed.data;
  const { error } = await db
    .from("quotes")
    .update({
      status: d.status,
      notes_internal: d.notes_internal ?? null,
      valid_until: d.valid_until,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.id);

  if (error) {
    return { ok: false, error: "Failed to update quotation." };
  }

  await writeAudit(db, session.email, {
    action: "UPDATE_QUOTE",
    target_table: "quotes",
    target_id: d.id,
    summary: `Updated quote ${d.id} status to ${d.status}`,
  });

  revalidatePath(`/admin/quotes/${d.id}`);
  revalidatePath("/admin/leads");
  return { ok: true, message: "Quotation updated." };
}

const NegotiateItemSchema = z.object({
  quote_id: z.string().uuid(),
  item_id: z.string().uuid(),
  negotiated_unit_price: z.coerce.number().finite().min(0).max(10_000_000),
});

export async function negotiateQuoteItemAction(
  _prev: QuoteAdminActionState,
  formData: FormData
): Promise<QuoteAdminActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const parsed = NegotiateItemSchema.safeParse({
    quote_id: formData.get("quote_id"),
    item_id: formData.get("item_id"),
    negotiated_unit_price: formData.get("negotiated_unit_price"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid negotiated unit price." };
  }

  const d = parsed.data;
  const { data: item } = await db
    .from("quote_items")
    .select("quantity")
    .eq("id", d.item_id)
    .single();

  if (!item) {
    return { ok: false, error: "Quote item not found." };
  }

  const lineTotal =
    Math.round(d.negotiated_unit_price * Number(item.quantity) * 100) / 100;

  await db
    .from("quote_items")
    .update({
      negotiated_unit_price: d.negotiated_unit_price,
      line_total: lineTotal,
      requires_quote: false,
    })
    .eq("id", d.item_id);

  // Recompute quote subtotal
  const { data: allItems } = await db
    .from("quote_items")
    .select("line_total")
    .eq("quote_id", d.quote_id);

  const subtotal = (allItems ?? []).reduce(
    (sum, r) => sum + Number(r.line_total ?? 0),
    0
  );

  await db
    .from("quotes")
    .update({
      subtotal: Math.round(subtotal * 100) / 100,
      total_amount: Math.round(subtotal * 100) / 100,
      status: "NEGOTIATION",
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.quote_id);

  await writeAudit(db, session.email, {
    action: "NEGOTIATE_QUOTE_ITEM",
    target_table: "quote_items",
    target_id: d.item_id,
    summary: `Set negotiated unit price ₹${d.negotiated_unit_price} on quote ${d.quote_id}`,
  });

  revalidatePath(`/admin/quotes/${d.quote_id}`);
  revalidatePath("/admin/leads");
  return { ok: true, message: "Negotiated price saved." };
}

export async function convertQuoteToOrderAction(
  _prev: QuoteAdminActionState,
  formData: FormData
): Promise<QuoteAdminActionState> {
  const session = await requireAdmin();
  const db = createServerClient();

  const quoteId = String(formData.get("quote_id") ?? "");
  if (!z.string().uuid().safeParse(quoteId).success) {
    return { ok: false, error: "Invalid quote ID." };
  }

  const [{ data: quote }, { data: items }] = await Promise.all([
    db.from("quotes").select("*").eq("id", quoteId).maybeSingle(),
    db.from("quote_items").select("*").eq("quote_id", quoteId),
  ]);

  if (!quote) {
    return { ok: false, error: "Quote not found." };
  }
  if (quote.converted_order_id) {
    redirect(`/admin/orders/${quote.converted_order_id}`);
  }

  const rawPhone = normalizePhoneFull(quote.phone || "9999999999");
  const phone =
    rawPhone.length === 12 && rawPhone.startsWith("91")
      ? rawPhone.slice(2)
      : rawPhone.slice(-10).padStart(10, "9");
  const customerName = (quote.customer_name || "Customer").trim();
  const totalAmount = Math.max(0, Number(quote.total_amount ?? 0));

  const configuredItems = (items ?? []).map((item) => ({
    sku: item.sku,
    name: item.product_name,
    quantity: item.quantity,
    unit_price: item.negotiated_unit_price ?? item.unit_price ?? 0,
    config: item.public_snapshot_json ?? {},
  }));

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      customer_name_full: customerName,
      customer_name_masked: maskName(customerName),
      customer_phone_full: phone,
      phone_last_4: phone.slice(-4),
      configured_items_json: configuredItems,
      total_amount: totalAmount,
      advance_paid: 0,
      balance_due: totalAmount,
      current_stage: "CONFIRMED",
      warranty_years: 3,
      notes_internal: `Converted from quotation ${quote.reference}`,
      quote_id: quote.id,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { ok: false, error: "Failed to create order from quotation." };
  }

  await db.from("order_stage_events").insert({
    order_id: order.id,
    stage: "CONFIRMED",
    note: `Order created from quotation ${quote.reference}`,
  });

  await db
    .from("quotes")
    .update({
      status: "CONFIRMED",
      converted_order_id: order.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quote.id);

  await writeAudit(db, session.email, {
    action: "CONVERT_QUOTE_TO_ORDER",
    target_table: "orders",
    target_id: order.id,
    summary: `Converted quotation ${quote.reference} to order ${order.id}`,
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/quotes/${quote.id}`);
  redirect(`/admin/orders/${order.id}`);
}
