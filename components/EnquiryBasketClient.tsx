"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  MessageSquare,
  FileDown,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  readEnquiryBasket,
  writeEnquiryBasket,
  type EnquiryBasketItem,
} from "@/lib/enquiryBasket";

interface RepricedItem {
  variant_id: string;
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
  requires_quote: boolean;
  quote_reason: string | null;
  lead_time_days: number | null;
}

interface QuoteResponse {
  reference: string | null;
  valid_until: string | null;
  price_basis: string | null;
  subtotal: number;
  gst_amount: number;
  has_quote_only: boolean;
  whatsapp_url: string | null;
  items: RepricedItem[];
}

export default function EnquiryBasketClient() {
  const [basket, setBasket] = useState<EnquiryBasketItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<"whatsapp" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  useEffect(() => {
    setBasket(readEnquiryBasket());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (basket.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/enquiry/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "REPRICE",
            items: basket.map((b) => ({
              variant_id: b.variant_id,
              quantity: b.quantity,
            })),
          }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Unable to refresh prices.");
        }
        const json = (await res.json()) as QuoteResponse;
        if (!cancelled) setQuote(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to refresh prices.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [basket, hydrated]);

  function updateQty(variantId: string, qty: number) {
    const next = basket.map((item) =>
      item.variant_id === variantId
        ? { ...item, quantity: Math.max(1, Math.min(10_000, qty || 1)) }
        : item
    );
    setBasket(next);
    writeEnquiryBasket(next);
  }

  function removeItem(variantId: string) {
    const next = basket.filter((item) => item.variant_id !== variantId);
    setBasket(next);
    writeEnquiryBasket(next);
  }

  async function handleWhatsAppSubmit() {
    if (basket.length === 0) return;
    setSubmitting("whatsapp");
    setError(null);
    try {
      const res = await fetch("/api/enquiry/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "WHATSAPP",
          items: basket.map((b) => ({
            variant_id: b.variant_id,
            quantity: b.quantity,
          })),
          customer_name: customerName || undefined,
          phone: phone || undefined,
          city: city || undefined,
          delivery_notes: deliveryNotes || undefined,
        }),
      });
      const json = (await res.json()) as QuoteResponse & { error?: string };
      if (!res.ok || !json.whatsapp_url) {
        throw new Error(json.error || "Unable to prepare WhatsApp enquiry.");
      }
      setSubmittedRef(json.reference);
      window.open(json.whatsapp_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit enquiry.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handlePdfDownload() {
    if (basket.length === 0) return;
    setSubmitting("pdf");
    setError(null);
    try {
      const res = await fetch("/api/enquiry/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: basket.map((b) => ({
            variant_id: b.variant_id,
            quantity: b.quantity,
          })),
          reference: submittedRef ?? undefined,
        }),
      });
      if (!res.ok) {
        throw new Error("Unable to generate quotation PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SANRA-Enquiry-${submittedRef ?? "Quote"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF.");
    } finally {
      setSubmitting(null);
    }
  }

  if (!hydrated) {
    return <div className="py-12 text-xs text-neutral-500">Loading enquiry list...</div>;
  }

  if (basket.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-[#111111]">Your enquiry list is empty</h2>
        <p className="text-xs text-neutral-600 max-w-md mx-auto">
          Browse our chairs, tables, and dining sets, select your preferred configuration, and add models here to request a combined factory quotation.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800"
        >
          Browse Collections
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const repricedById = new Map(
    (quote?.items ?? []).map((i) => [i.variant_id, i])
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Selected Items */}
      <div className="lg:col-span-8 space-y-4">
        {basket.map((item) => {
          const rp = repricedById.get(item.variant_id);
          return (
            <div
              key={item.variant_id}
              className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-neutral-500">
                    {item.sku}
                  </span>
                  <Link
                    href={`/products/${encodeURIComponent(item.sku.toLowerCase())}`}
                    className="text-sm font-bold text-[#111111] hover:underline"
                  >
                    {item.name}
                  </Link>
                </div>
                <p className="text-xs text-neutral-600">
                  {item.frame_material} · {item.build_category}
                  {item.surface ? ` · ${item.surface}` : ""} · {item.size}
                </p>
                {rp && !rp.requires_quote && rp.unit_price != null ? (
                  <p className="text-xs font-semibold text-neutral-800">
                    ₹{rp.unit_price.toLocaleString("en-IN")} / pc ·{" "}
                    {rp.price_basis === "GST_INCLUSIVE"
                      ? `Incl. ${rp.gst_rate ?? 18}% GST`
                      : `Excl. ${rp.gst_rate ?? 18}% GST`}
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Custom Quotation Required
                    {rp?.quote_reason === "BELOW_MOQ" ? " (Below MOQ)" : ""}
                    {rp?.quote_reason === "BULK_SPECIAL_QUOTE" ? " (50+ Bulk Quote)" : ""}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-0.5">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQty(item.variant_id, Number(e.target.value))
                    }
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold"
                  />
                </div>
                <div className="text-right min-w-[90px]">
                  <span className="block text-[10px] uppercase text-neutral-500 font-bold">
                    Est. Total
                  </span>
                  <span className="text-sm font-black text-[#111111]">
                    {rp && !rp.requires_quote && rp.line_total != null
                      ? `₹${rp.line_total.toLocaleString("en-IN")}`
                      : "Quote"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.variant_id)}
                  aria-label={`Remove ${item.name}`}
                  className="p-2 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-black"
        >
          + Add more products
        </Link>
      </div>

      {/* Right: Summary & WhatsApp / PDF Actions */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#111111]">Enquiry Summary</h2>

        {loading ? (
          <p className="text-xs text-neutral-500">Refreshing server prices...</p>
        ) : quote ? (
          <div className="space-y-2 text-xs border-b border-neutral-200 pb-4">
            <div className="flex justify-between">
              <span className="text-neutral-600">Items</span>
              <span className="font-bold">{quote.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Reference Total</span>
              <span className="font-black text-base text-[#111111]">
                {quote.subtotal > 0
                  ? `₹${quote.subtotal.toLocaleString("en-IN")}`
                  : "On Request"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              {quote.price_basis === "GST_INCLUSIVE"
                ? "Displayed prices are inclusive of GST."
                : quote.price_basis === "GST_EXCLUSIVE"
                  ? "Displayed prices are exclusive of GST."
                  : "Confirmed quotation will specify final GST & freight."}
            </p>
          </div>
        ) : null}

        <div className="space-y-2.5 text-xs">
          <p className="font-bold text-neutral-700">
            Optional Delivery &amp; Contact Details
          </p>
          <input
            type="text"
            placeholder="Your Name / Business"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
          <input
            type="tel"
            placeholder="Phone / WhatsApp Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
          <input
            type="text"
            placeholder="City / Delivery Location"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
          <textarea
            rows={2}
            placeholder="Delivery timeline or project notes (optional)"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {submittedRef && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Enquiry recorded: <strong>{submittedRef}</strong>
            </span>
          </div>
        )}

        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={submitting !== null || loading}
            onClick={handleWhatsAppSubmit}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting === "whatsapp" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4" />
            )}
            Send All on WhatsApp
          </button>
          <button
            type="button"
            disabled={submitting !== null || loading}
            onClick={handlePdfDownload}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-xs font-bold hover:bg-neutral-50 disabled:opacity-50"
          >
            {submitting === "pdf" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            Download Quotation PDF
          </button>
        </div>
      </div>
    </div>
  );
}
