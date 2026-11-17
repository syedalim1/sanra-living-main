"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  deleteProductImageAction,
  uploadProductImageAction,
} from "@/app/admin/(dashboard)/products/actions";
import type { AdminActionResult } from "@/lib/admin/product-types";

const initialState: AdminActionResult = {};

function ImageSlot({
  productId,
  kind,
  label,
  helper,
  currentUrl,
  emptyLabel,
}: {
  productId: string;
  kind: "main" | "hover";
  label: string;
  helper: string;
  currentUrl: string | null;
  emptyLabel: string;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(currentUrl);

  const [, uploadAction, uploading] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await uploadProductImageAction(previous, formData);
      if (result.ok) {
        setDisplayUrl(result.url ?? currentUrl);
        setToast({ kind: "success", message: `${label} updated.` });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Image upload failed." });
      }
      return result;
    },
    initialState
  );

  const [, deleteAction, deleting] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await deleteProductImageAction(previous, formData);
      if (result.ok) {
        setDisplayUrl(kind === "main" ? "/images/product-placeholder.svg" : null);
        setToast({ kind: "success", message: `${label} removed.` });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Unable to remove the image." });
      }
      return result;
    },
    initialState
  );

  const previewUrl = displayUrl;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h3 className="text-xs font-bold text-[#111111]">{label}</h3>
        <p className="text-[10px] text-neutral-500 mt-0.5">{helper}</p>
      </div>

      <div className="p-4 space-y-3">
        <div className="aspect-square rounded-lg border border-neutral-200 bg-[#F5F5F7] overflow-hidden flex items-center justify-center">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={label} className="w-full h-full object-cover" />
          ) : (
            <p className="text-[11px] text-neutral-400 px-4 text-center">{emptyLabel}</p>
          )}
        </div>

        <form action={uploadAction} className="space-y-2">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="kind" value={kind} />
          <input
            type="file"
            name="file"
            required
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-[11px] text-neutral-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-neutral-900 file:text-white file:text-[10px] file:font-bold file:uppercase file:tracking-wider"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
            >
              {uploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ImagePlus className="w-3 h-3" />
              )}
              {uploading ? "Uploading..." : previewUrl ? "Replace" : "Upload"}
            </button>
          </div>
        </form>

        {previewUrl && (
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm(`Remove the ${label.toLowerCase()}?`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="kind" value={kind} />
            <button
              type="submit"
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Remove
            </button>
          </form>
        )}
      </div>

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

export default function ImageManager({
  productId,
  mainImageUrl,
  hoverImageUrl,
}: {
  productId: string;
  mainImageUrl: string;
  hoverImageUrl: string | null;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-[#111111]">Product Images</h2>
        <p className="text-[11px] text-neutral-500 mt-1">
          JPG, PNG or WEBP up to 8 MB. Server converts to WEBP, strips metadata and applies a
          faint SANRA LIVING watermark.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ImageSlot
          key={`main-${mainImageUrl}`}
          productId={productId}
          kind="main"
          label="Main Image"
          helper="Primary catalog and product page image."
          currentUrl={mainImageUrl}
          emptyLabel="No main image uploaded. A placeholder is used."
        />
        <ImageSlot
          key={`hover-${hoverImageUrl ?? "none"}`}
          productId={productId}
          kind="hover"
          label="Hover Blueprint"
          helper="Optional dimension or blueprint view."
          currentUrl={hoverImageUrl}
          emptyLabel="No hover blueprint uploaded."
        />
      </div>
    </section>
  );
}
