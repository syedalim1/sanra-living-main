"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, Loader2 } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  archiveProductAction,
  duplicateProductAction,
} from "@/app/admin/(dashboard)/products/actions";
import type { AdminActionResult, AdminProduct } from "@/lib/admin/product-types";

const initialState: AdminActionResult = {};

export default function ProductLifecycleActions({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [, archiveAction, archiving] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await archiveProductAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: `${product.sku} archived.` });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Unable to archive product." });
      }
      return result;
    },
    initialState
  );

  const [duplicateState, duplicateAction, duplicating] = useActionState(
    duplicateProductAction,
    initialState
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        action={duplicateAction}
        onSubmit={(event) => {
          if (!window.confirm(`Duplicate ${product.sku} with a new SKU and no images?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={product.id} />
        <button
          type="submit"
          disabled={duplicating}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          {duplicating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
          Duplicate
        </button>
      </form>

      <form
        action={archiveAction}
        onSubmit={(event) => {
          if (!window.confirm(`Archive ${product.sku}? It will disappear from the public catalog.`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={product.id} />
        <button
          type="submit"
          disabled={archiving || !product.is_active}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-[10px] font-bold uppercase tracking-wider text-red-700 hover:bg-red-100 disabled:opacity-40"
        >
          {archiving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
          Archive
        </button>
      </form>

      {duplicateState.error && (
        <p className="text-[10px] text-red-600 w-full">{duplicateState.error}</p>
      )}

      {toast && (
        <AdminToast
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
