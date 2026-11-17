"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Upload } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  deleteSwatchAction,
  uploadSwatchAction,
} from "@/app/admin/(dashboard)/products/actions";
import type { AdminActionResult, AdminOption } from "@/lib/admin/product-types";

const initialState: AdminActionResult = {};

function SwatchDelete({ option }: { option: AdminOption }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [, deleteAction, deleting] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await deleteSwatchAction(previous, formData);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Unable to remove the swatch.");
      }
      return result;
    },
    initialState
  );

  return (
    <form
      action={deleteAction}
      onSubmit={(event) => {
        if (!window.confirm(`Remove the texture for ${option.label_en}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="option_code" value={option.option_code} />
      <button
        type="submit"
        disabled={deleting}
        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 text-[9px] font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
      >
        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Remove
      </button>
      {error && <p className="text-[9px] text-red-600 mt-1">{error}</p>}
    </form>
  );
}

export default function SwatchManager({ options }: { options: AdminOption[] }) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [state, formAction, pending] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await uploadSwatchAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: "Swatch texture uploaded." });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Swatch upload failed." });
      }
      return result;
    },
    initialState
  );

  const swatchGroupLabels: Record<string, string> = {
    TOP_MATERIAL: "Top materials",
    FRAME_COLOR: "Frame colors",
    SEAT_COLOR: "Seat colors",
    FINISH: "Rack finishes",
    SS_FINISH: "SS finishes",
  };

  const groupedOptions = Object.keys(swatchGroupLabels)
    .map((group) => ({
      group,
      label: swatchGroupLabels[group],
      options: options.filter((option) => option.option_group === group),
    }))
    .filter((entry) => entry.options.length > 0);

  const withTexture = options.filter((option) => option.swatch_texture_img);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-[#111111]">Swatch Textures</h2>
        <p className="text-[11px] text-neutral-500 mt-1">
          Upload small colour / texture chips for configurator options. Swatches are not
          watermarked.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-4">
        <form action={formAction} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <label className="space-y-1 sm:col-span-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Configurator option
            </span>
            <select
              name="option_code"
              className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
            >
              {groupedOptions.map((entry) => (
                <optgroup key={entry.group} label={entry.label}>
                  {entry.options.map((option) => (
                    <option key={option.option_code} value={option.option_code}>
                      {option.label_en} ({option.option_code})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Texture image
            </span>
            <input
              type="file"
              name="file"
              required
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-[10px] text-neutral-600 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-neutral-900 file:text-white file:text-[9px] file:font-bold file:uppercase"
            />
          </label>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
            >
              {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {pending ? "Uploading..." : "Upload Swatch"}
            </button>
            {state.error && <p className="text-[10px] text-red-600 mt-2">{state.error}</p>}
          </div>
        </form>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Current swatch textures
          </p>
          {withTexture.length === 0 ? (
            <p className="text-[11px] text-neutral-500">
              No swatch textures uploaded yet. Public swatches use colour hex values.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {withTexture.map((option) => (
                <div
                  key={option.option_code}
                  className="p-2 rounded-lg border border-neutral-200 space-y-1.5"
                >
                  <div className="aspect-square rounded bg-neutral-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={option.swatch_texture_img ?? ""}
                      alt={option.label_en}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-neutral-800 leading-tight">
                    {option.label_en}
                  </p>
                  <p className="text-[9px] font-mono text-neutral-500">{option.option_code}</p>
                  <SwatchDelete option={option} />
                </div>
              ))}
            </div>
          )}
        </div>
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
