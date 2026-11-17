"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { IndianRupee, Loader2 } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import { markAdvanceReceivedAction } from "@/app/admin/(dashboard)/orders/actions";
import type { OrderActionResult } from "@/lib/admin/order-types";
import { formatINR } from "@/lib/format";

const initial: OrderActionResult = {};

export default function OrderAdvanceForm({
  orderId,
  total,
  advance,
  balance,
}: {
  orderId: string;
  total: number;
  advance: number;
  balance: number;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null
  );

  const [, action, pending] = useActionState(
    async (previous: OrderActionResult, formData: FormData) => {
      const result = await markAdvanceReceivedAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: "Advance updated." });
        router.refresh();
      } else {
        setToast({
          kind: "error",
          message: result.error ?? "Unable to update advance.",
        });
      }
      return result;
    },
    initial
  );

  return (
    <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-sm font-bold text-[#111111]">Commercials</h2>
        <p className="text-[11px] text-neutral-500 mt-1">
          Money values are visible in admin only.
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
            <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
              Total
            </p>
            <p className="text-sm font-black text-neutral-900">
              ₹{formatINR(total)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
            <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
              Advance
            </p>
            <p className="text-sm font-black text-neutral-900">
              ₹{formatINR(advance)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
              Balance
            </p>
            <p className="text-sm font-black text-emerald-900">
              ₹{formatINR(balance)}
            </p>
          </div>
        </div>

        <form action={action} className="flex flex-col sm:flex-row sm:items-end gap-2">
          <input type="hidden" name="order_id" value={orderId} />
          <label className="space-y-1 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Mark advance received
            </span>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="Amount"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <IndianRupee className="w-3.5 h-3.5" />
            )}
            Add advance
          </button>
        </form>
      </div>

      {toast && (
        <AdminToast
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}
