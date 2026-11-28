"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, ExternalLink, Globe, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  archiveProductAction,
  duplicateProductAction,
} from "@/app/admin/(dashboard)/products/actions";
import { toggleProductPublishAction, type VariantAdminActionState } from "./variant-actions";
import type { AdminActionResult, AdminProduct } from "@/lib/admin/product-types";

const initialState: AdminActionResult = {};
const initialVarState: VariantAdminActionState = {};

export interface PublicationChecklist {
  hasPhoto: boolean;
  hasDescription: boolean;
  hasVariants: boolean;
  hasCostsOrQuoteOnly: boolean;
  hasPricingProfileOrQuoteOnly: boolean;
}

export default function ProductLifecycleActions({
  product,
  checklist,
}: {
  product: AdminProduct;
  checklist?: PublicationChecklist;
}) {
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

  const [, publishAction, togglingPublish] = useActionState(
    async (previous: VariantAdminActionState, formData: FormData) => {
      const result = await toggleProductPublishAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: result.message ?? "Updated publish state." });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Failed to update publish state." });
      }
      return result;
    },
    initialVarState
  );

  const [duplicateState, duplicateAction, duplicating] = useActionState(
    duplicateProductAction,
    initialState
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/products/${encodeURIComponent(product.sku.toLowerCase())}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-neutral-300 bg-white text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
        >
          <ExternalLink className="w-3 h-3" />
          Preview
        </a>

        <form action={publishAction}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="next_active" value={product.is_active ? "false" : "true"} />
          <button
            type="submit"
            disabled={togglingPublish}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 ${
              product.is_active
                ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {togglingPublish ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : product.is_active ? (
              <EyeOff className="w-3 h-3" />
            ) : (
              <Globe className="w-3 h-3" />
            )}
            {product.is_active ? "Unpublish" : "Publish"}
          </button>
        </form>

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
      </div>

      {checklist && (
        <div className="flex flex-wrap gap-2 text-[10px]">
          {[
            { ok: checklist.hasPhoto, label: "Photos" },
            { ok: checklist.hasDescription, label: "Description" },
            { ok: checklist.hasVariants, label: "Variants" },
            { ok: checklist.hasCostsOrQuoteOnly, label: "Costs / Quote-only" },
            { ok: checklist.hasPricingProfileOrQuoteOnly, label: "Pricing rules" },
          ].map((item) => (
            <span
              key={item.label}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                item.ok
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              {item.ok ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {item.label}
            </span>
          ))}
        </div>
      )}

      {duplicateState.error && (
        <p className="text-[10px] text-red-600">{duplicateState.error}</p>
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
