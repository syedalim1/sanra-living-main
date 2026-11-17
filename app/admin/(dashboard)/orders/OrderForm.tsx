"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import AdminToast from "@/components/admin/Toast";
import {
  createOrderAction,
  updateOrderAction,
} from "@/app/admin/(dashboard)/orders/actions";
import type { AdminOrder, OrderActionResult } from "@/lib/admin/order-types";

interface EditableItem {
  name: string;
  size: string;
  configuration: string;
  quantity: number;
}

const initialResult: OrderActionResult = {};

function toEditableItems(order?: AdminOrder): EditableItem[] {
  if (!order || !Array.isArray(order.configured_items_json)) {
    return [{ name: "", size: "Standard", configuration: "", quantity: 1 }];
  }

  const rows = order.configured_items_json as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return [{ name: "", size: "Standard", configuration: "", quantity: 1 }];
  }

  return rows.map((row) => ({
    name: typeof row.name === "string" ? row.name : "",
    size: typeof row.size === "string" ? row.size : "Standard",
    configuration:
      typeof row.configuration === "string" ? row.configuration : "",
    quantity: Number.isInteger(Number(row.quantity)) && Number(row.quantity) > 0
      ? Number(row.quantity)
      : 1,
  }));
}

export default function OrderForm({
  mode,
  order,
}: {
  mode: "create" | "edit";
  order?: AdminOrder;
}) {
  const router = useRouter();
  const [items, setItems] = useState<EditableItem[]>(() => toEditableItems(order));
  const [closedError, setClosedError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    async (previous: OrderActionResult, formData: FormData) => {
      const result =
        mode === "create"
          ? await createOrderAction(previous, formData)
          : await updateOrderAction(previous, formData);

      if (result.ok && mode === "edit") {
        router.refresh();
      }

      return result;
    },
    initialResult
  );

  const updateItem = (
    index: number,
    field: keyof EditableItem,
    value: string | number
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <form action={formAction} className="space-y-6">
      {order && <input type="hidden" name="order_id" value={order.id} />}
      <input
        type="hidden"
        name="items_json"
        value={JSON.stringify(items)}
      />

      {state.error && state.error !== closedError && (
        <AdminToast
          kind="error"
          message={state.error}
          onClose={() => setClosedError(state.error ?? null)}
        />
      )}

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Customer</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Private customer details are never returned by the public tracking API.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Full name
            </span>
            <input
              name="customer_name_full"
              defaultValue={order?.customer_name_full ?? ""}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Full mobile (10 digits)
            </span>
            <input
              name="customer_phone_full"
              inputMode="numeric"
              maxLength={10}
              defaultValue={order?.customer_phone_full ?? ""}
              required
              onInput={(event) => {
                event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "");
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Internal notes (never public)
            </span>
            <textarea
              name="notes_internal"
              rows={3}
              defaultValue={order?.notes_internal ?? ""}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </label>

          {mode === "edit" && order && (
            <div className="sm:col-span-2 p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex flex-wrap items-center gap-3 text-[11px]">
              <span className="font-bold uppercase tracking-wider text-neutral-500">
                Tracking code
              </span>
              <span className="font-mono font-bold text-neutral-900">
                {order.tracking_code}
              </span>
              <span className="text-neutral-400">•</span>
              <span className="text-neutral-500">
                Masked: {order.customer_name_masked} | {order.phone_last_4}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#111111]">Line Items</h2>
            <p className="text-[11px] text-neutral-500 mt-1">
              Public tracking shows only name, size and quantity.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setItems((current) => [
                ...current,
                { name: "", size: "Standard", configuration: "", quantity: 1 },
              ])
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-100"
          >
            <Plus className="w-3 h-3" /> Add row
          </button>
        </div>

        <div className="p-5 space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50/40"
            >
              <label className="sm:col-span-4 space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  Product name / SKU
                </span>
                <input
                  value={item.name}
                  onChange={(event) => updateItem(index, "name", event.target.value)}
                  required
                  className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
                />
              </label>

              <label className="sm:col-span-3 space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  Size
                </span>
                <input
                  value={item.size}
                  onChange={(event) => updateItem(index, "size", event.target.value)}
                  className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
                />
              </label>

              <label className="sm:col-span-3 space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  Configuration
                </span>
                <input
                  value={item.configuration}
                  onChange={(event) =>
                    updateItem(index, "configuration", event.target.value)
                  }
                  className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
                />
              </label>

              <label className="sm:col-span-1 space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                  Qty
                </span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(
                      index,
                      "quantity",
                      Math.max(1, Math.min(999, Number(event.target.value) || 1))
                    )
                  }
                  className="w-full px-2 py-2 rounded-md border border-neutral-300 bg-white text-xs"
                />
              </label>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) =>
                      current.length === 1
                        ? current
                        : current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  disabled={items.length === 1}
                  aria-label="Remove line item"
                  className="w-full flex items-center justify-center px-2 py-2 rounded-md border border-neutral-300 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Commercials</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Visible in admin only. Balance due is recalculated on the server.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Total amount
            </span>
            <input
              name="total_amount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={order?.total_amount ?? 0}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Advance paid
            </span>
            <input
              name="advance_paid"
              type="number"
              min={0}
              step="0.01"
              defaultValue={order?.advance_paid ?? 0}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Warranty years
            </span>
            <input
              name="warranty_years"
              type="number"
              min={0}
              max={50}
              step={1}
              defaultValue={order?.warranty_years ?? 10}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
            />
          </label>

          {order?.current_stage === "READY" && (
            <label className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Delivered on
              </span>
              <input
                name="delivered_on"
                type="date"
                defaultValue={order.delivered_on ?? ""}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
              />
            </label>
          )}
        </div>
      </section>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider disabled:bg-neutral-400"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {pending
            ? "Saving..."
            : mode === "create"
            ? "Create Order"
            : "Save Order"}
        </button>
      </div>
    </form>
  );
}
