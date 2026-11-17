"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ImagePlus, Loader2, Trash2 } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  deleteOrderPhotoAction,
  toggleOrderPhotoVisibilityAction,
  uploadOrderPhotoAction,
} from "@/app/admin/(dashboard)/orders/actions";
import type {
  AdminOrderPhoto,
  OrderActionResult,
} from "@/lib/admin/order-types";

const initial: OrderActionResult = {};

function PhotoCard({
  photo,
  onToast,
}: {
  photo: AdminOrderPhoto;
  onToast: (kind: ToastKind, message: string) => void;
}) {
  const router = useRouter();

  const [, toggleAction, toggling] = useActionState(
    async (previous: OrderActionResult, formData: FormData) => {
      const result = await toggleOrderPhotoVisibilityAction(previous, formData);
      if (result.ok) {
        onToast(
          "success",
          photo.is_visible_to_customer ? "Photo hidden." : "Photo visible."
        );
        router.refresh();
      } else {
        onToast("error", result.error ?? "Unable to update visibility.");
      }
      return result;
    },
    initial
  );

  const [, deleteAction, deleting] = useActionState(
    async (previous: OrderActionResult, formData: FormData) => {
      const result = await deleteOrderPhotoAction(previous, formData);
      if (result.ok) {
        onToast("success", "Photo deleted.");
        router.refresh();
      } else {
        onToast("error", result.error ?? "Unable to delete photo.");
      }
      return result;
    },
    initial
  );

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden bg-white">
      <div className="aspect-square bg-neutral-100">
        {photo.signed_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.signed_url}
            alt={photo.caption ?? "Order progress photo"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400 p-3 text-center">
            Preview expired. Refresh the page.
          </div>
        )}
      </div>
      <div className="p-2.5 space-y-2">
        <p className="text-[10px] font-semibold text-neutral-800 line-clamp-2 min-h-7">
          {photo.caption || "WIP photo"}
        </p>
        <div className="flex items-center gap-1.5">
          <form action={toggleAction}>
            <input type="hidden" name="photo_id" value={photo.id} />
            <input
              type="hidden"
              name="is_visible_to_customer"
              value={String(!photo.is_visible_to_customer)}
            />
            <button
              type="submit"
              disabled={toggling}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 text-[9px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
            >
              {toggling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : photo.is_visible_to_customer ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
              {photo.is_visible_to_customer ? "Hide" : "Show"}
            </button>
          </form>

          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm("Delete this photo and its file?")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="photo_id" value={photo.id} />
            <button
              type="submit"
              disabled={deleting}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 text-[9px] font-bold uppercase tracking-wider text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              {deleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              Delete
            </button>
          </form>
        </div>
        <span
          className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
            photo.is_visible_to_customer
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-neutral-100 text-neutral-500 border border-neutral-200"
          }`}
        >
          {photo.is_visible_to_customer ? "Customer visible" : "Hidden"}
        </span>
      </div>
    </div>
  );
}

export default function OrderPhotosManager({
  orderId,
  photos,
}: {
  orderId: string;
  photos: AdminOrderPhoto[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null
  );

  const [state, uploadAction, uploading] = useActionState(
    async (previous: OrderActionResult, formData: FormData) => {
      const result = await uploadOrderPhotoAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: "Photo uploaded." });
        router.refresh();
      } else {
        setToast({
          kind: "error",
          message: result.error ?? "Unable to upload photo.",
        });
      }
      return result;
    },
    initial
  );

  return (
    <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-sm font-bold text-[#111111]">WIP Photos</h2>
        <p className="text-[11px] text-neutral-500 mt-1">
          Private bucket. Customer-visible photos use short-lived signed URLs.
        </p>
      </div>

      <div className="p-5 space-y-5">
        <form action={uploadAction} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <input type="hidden" name="order_id" value={orderId} />
          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Photo
            </span>
            <input
              type="file"
              name="file"
              required
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-[10px] text-neutral-600 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-neutral-900 file:text-white file:text-[9px] file:font-bold file:uppercase"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Caption
            </span>
            <input
              name="caption"
              className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            />
          </label>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-neutral-700">
              <input
                type="checkbox"
                name="is_visible_to_customer"
                defaultChecked
                className="w-4 h-4 accent-black"
              />
              Visible to customer
            </label>
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
              {uploading ? "Uploading..." : "Upload photo"}
            </button>
          </div>

          {state.error && (
            <p className="sm:col-span-3 text-[10px] text-red-600">{state.error}</p>
          )}
        </form>

        {photos.length === 0 ? (
          <p className="text-[11px] text-neutral-500">No photos uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onToast={(kind, message) => setToast({ kind, message })}
              />
            ))}
          </div>
        )}
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
