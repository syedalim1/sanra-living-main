"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FileDown, ArrowRight, Loader2, Save } from "lucide-react";
import {
  convertQuoteToOrderAction,
  negotiateQuoteItemAction,
  updateQuoteAction,
  type QuoteAdminActionState,
} from "./actions";

const initialState: QuoteAdminActionState = {};

export default function QuoteDetailClient({
  quote,
  items,
}: {
  quote: {
    id: string;
    reference: string;
    customer_name: string | null;
    phone: string | null;
    email: string | null;
    company: string | null;
    city: string | null;
    delivery_notes: string | null;
    lead_source: string;
    status: string;
    price_basis: string | null;
    subtotal: number;
    total_amount: number;
    valid_until: string;
    notes_internal: string | null;
    converted_order_id: string | null;
    created_at: string;
  };
  items: Array<{
    id: string;
    sku: string;
    product_name: string;
    public_snapshot_json: Record<string, unknown>;
    quantity: number;
    unit_price: number | null;
    negotiated_unit_price: number | null;
    line_total: number | null;
    requires_quote: boolean;
  }>;
}) {
  const [updateState, updateAction, updating] = useActionState(
    updateQuoteAction,
    initialState
  );
  const [negState, negAction, negotiating] = useActionState(
    negotiateQuoteItemAction,
    initialState
  );
  const [convState, convAction, converting] = useActionState(
    convertQuoteToOrderAction,
    initialState
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            {quote.lead_source} · {new Date(quote.created_at).toLocaleString("en-IN")}
          </p>
          <h1 className="text-2xl font-black text-[#111111] font-mono mt-1">
            {quote.reference}
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Customer: {quote.customer_name || "Anonymous"} · {quote.phone || "No phone"}
            {quote.city ? ` · ${quote.city}` : ""}
          </p>
          {quote.delivery_notes && (
            <p className="text-xs text-neutral-500 mt-1">
              Delivery Note: {quote.delivery_notes}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/quotes/${quote.id}/pdf`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-neutral-800 hover:bg-neutral-50"
          >
            <FileDown className="w-4 h-4" />
            Download PDF
          </a>

          {quote.converted_order_id ? (
            <Link
              href={`/admin/orders/${quote.converted_order_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"
            >
              View Order <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <form action={convAction}>
              <input type="hidden" name="quote_id" value={quote.id} />
              <button
                type="submit"
                disabled={converting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
              >
                {converting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Convert to Order
              </button>
            </form>
          )}
        </div>
      </div>

      {convState.error && <p className="text-xs text-red-600">{convState.error}</p>}

      {/* Line Items & Authorized Selling-Price Negotiation */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#111111]">
          Quotation Items &amp; Price Negotiation
        </h2>
        {negState.error && <p className="text-xs text-red-600">{negState.error}</p>}
        {negState.message && (
          <p className="text-xs text-emerald-700 font-semibold">{negState.message}</p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px]">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Configuration</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">System Price</th>
                <th className="py-2 pr-3">Negotiated Unit (₹)</th>
                <th className="py-2">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const snap = item.public_snapshot_json;
                const configText = [
                  snap.frame_material,
                  snap.build_category,
                  snap.surface,
                  snap.size,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={item.id} className="border-b border-neutral-100">
                    <td className="py-2.5 pr-3 font-bold">
                      {item.product_name} ({item.sku})
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-600">{configText}</td>
                    <td className="py-2.5 pr-3 font-bold">{item.quantity}</td>
                    <td className="py-2.5 pr-3">
                      {item.unit_price != null ? `₹${item.unit_price}` : "Quote"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <form action={negAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="quote_id" value={quote.id} />
                        <input type="hidden" name="item_id" value={item.id} />
                        <input
                          name="negotiated_unit_price"
                          type="number"
                          step="0.01"
                          defaultValue={
                            item.negotiated_unit_price ?? item.unit_price ?? ""
                          }
                          className="w-24 px-2 py-1 rounded border border-neutral-300 text-xs"
                        />
                        <button
                          type="submit"
                          disabled={negotiating}
                          className="p-1.5 rounded bg-[#111111] text-white"
                          aria-label="Save negotiated price"
                        >
                          <Save className="w-3 h-3" />
                        </button>
                      </form>
                    </td>
                    <td className="py-2.5 font-bold">
                      {item.line_total != null ? `₹${item.line_total}` : "Quote"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status, Validity & Internal Notes */}
      <form
        action={updateAction}
        className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4"
      >
        <input type="hidden" name="id" value={quote.id} />
        <h2 className="text-sm font-bold text-[#111111]">
          Follow-up Status &amp; Internal Notes
        </h2>

        {updateState.error && <p className="text-xs text-red-600">{updateState.error}</p>}
        {updateState.message && (
          <p className="text-xs text-emerald-700 font-semibold">{updateState.message}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-neutral-700 mb-1">Status</label>
            <select
              name="status"
              defaultValue={quote.status}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white"
            >
              <option value="NEW_ENQUIRY">New Enquiry</option>
              <option value="QUOTATION_SENT">Quotation Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="EXPIRED">Expired</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Valid Until
            </label>
            <input
              name="valid_until"
              type="date"
              defaultValue={quote.valid_until}
              required
              className="w-full px-3 py-2 rounded-lg border border-neutral-300"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-bold text-neutral-700 mb-1">
              Internal Notes
            </label>
            <textarea
              name="notes_internal"
              rows={3}
              defaultValue={quote.notes_internal ?? ""}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={updating}
          className="px-4 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
