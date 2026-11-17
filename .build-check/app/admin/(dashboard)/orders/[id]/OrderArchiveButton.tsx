"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import { toggleOrderArchiveAction } from "@/app/admin/(dashboard)/orders/actions";
import type { OrderActionResult } from "@/lib/admin/order-types";

const initial: OrderActionResult = {};

export default function OrderArchiveButton({
  orderId,
  archived,
}: {
  orderId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null
  );

  const [, action, pending] = useActionState(
    async (previous: OrderActionResult, formData: FormData) => {
      const result = await toggleOrderArchiveAction(previous, formData);
      if (result.ok) {
        setToast({
          kind: "success",
          message: archived ? "Order restored." : "Order archived.",
        });
        router.refresh();
      } else {
        setToast({
          kind: "error",
          message: result.error ?? "Unable to update archive state.",
        });
      }
      return result;
    },
    initial
  );

  return (
    <>
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !archived &&
            !window.confirm("Archive this order? It stays in the database.")
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="order_id" value={orderId} />
        <input type="hidden" name="archived" value={String(!archived)} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : archived ? (
            <ArchiveRestore className="w-3 h-3" />
          ) : (
            <Archive className="w-3 h-3" />
          )}
          {archived ? "Restore" : "Archive"}
        </button>
      </form>

      {toast && (
        <AdminToast
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
