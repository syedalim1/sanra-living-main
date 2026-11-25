"use client";

import { adminImageUrl } from "@/lib/media/paths";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import CompressedFileInput from "@/components/admin/CompressedFileInput";
import {
  deleteVariantAction,
  saveVariantAction,
} from "@/app/admin/(dashboard)/products/actions";
import type {
  AdminActionResult,
  AdminMaterialOption,
  AdminOption,
  AdminVariant,
} from "@/lib/admin/product-types";

const initialState: AdminActionResult = {};

interface VariantManagerProps {
  productId: string;
  variants: AdminVariant[];
  topOptions: AdminOption[];
  materialOptions: AdminMaterialOption[];
  frameOptions: AdminOption[];
  sizeOptions: AdminOption[];
}

function VariantEditor({
  productId,
  variant,
  topOptions,
  materialOptions,
  frameOptions,
  sizeOptions,
}: {
  productId: string;
  variant: AdminVariant | null;
  topOptions: AdminOption[];
  materialOptions: AdminMaterialOption[];
  frameOptions: AdminOption[];
  sizeOptions: AdminOption[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const [saveState, saveAction, saving] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await saveVariantAction(previous, formData);
      if (result.ok) {
        setToast({
          kind: "success",
          message: variant ? "Variant updated." : "Variant added.",
        });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Unable to save the variant." });
      }
      return result;
    },
    initialState
  );

  const [, deleteAction, deleting] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await deleteVariantAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: "Variant deleted." });
        router.refresh();
      } else {
        setToast({ kind: "error", message: result.error ?? "Unable to delete the variant." });
      }
      return result;
    },
    initialState
  );

  const previewUrl = saveState.url ?? variant?.preview_image_url ?? null;

  return (
    <div className="p-4 rounded-lg border border-neutral-200 bg-white space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {variant ? "Edit variant" : "New variant"}
        </p>
        {variant && (
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm("Delete this variant?")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={variant.id} />
            <input type="hidden" name="product_id" value={productId} />
            <button
              type="submit"
              disabled={deleting}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Delete
            </button>
          </form>
        )}
      </div>

      <form action={saveAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input type="hidden" name="product_id" value={productId} />
        {variant && <input type="hidden" name="id" value={variant.id} />}

        <label className="space-y-1 lg:col-span-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Material / option code
          </span>
          <select
            name="top_material_code"
            defaultValue={
              variant?.top_material_code ??
              topOptions[0]?.option_code ??
              materialOptions[0]?.material_code ??
              ""
            }
            className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
          >
            <optgroup label="Configurator options">
              {topOptions.map((option) => (
                <option key={option.option_code} value={option.option_code}>
                  {option.label_en} ({option.option_code})
                </option>
              ))}
            </optgroup>
            <optgroup label="Material rate codes">
              {materialOptions.map((material) => (
                <option key={material.material_code} value={material.material_code}>
                  {material.display_name} ({material.material_code})
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Frame color
          </span>
          <select
            name="frame_color"
            defaultValue={variant?.frame_color ?? frameOptions[0]?.option_code ?? "MATTE_BLACK"}
            className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
          >
            {frameOptions.map((option) => (
              <option key={option.option_code} value={option.option_code}>
                {option.label_en}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Size
          </span>
          <select
            name="size_option"
            defaultValue={variant?.size_option ?? sizeOptions[0]?.option_code ?? "4x2"}
            className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs font-semibold"
          >
            {sizeOptions.map((option) => (
              <option key={option.option_code} value={option.option_code}>
                {option.label_en}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 lg:col-span-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Selection key (non-table preview)
          </span>
          <input
            name="selection_key"
            defaultValue={variant?.selection_key ?? ""}
            placeholder="e.g. SEAT_RUBBER||MS_COATED|MATTE_BLACK"
            className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-[11px] font-mono"
          />
          <span className="block text-[9px] text-neutral-500">
            Optional. Must match the live configurator combination exactly.
          </span>
        </label>

        <label className="space-y-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            Preview image
          </span>
          <CompressedFileInput
            name="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-[10px] text-neutral-600 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-neutral-900 file:text-white file:text-[9px] file:font-bold file:uppercase"
          />
          <span className="block text-[9px] text-neutral-500">
            Optional. The original is stored privately and a protected WebP is published.
          </span>
        </label>

        <div className="flex items-center gap-3 lg:col-span-5">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={adminImageUrl(previewUrl) ?? undefined}
              alt="Variant preview"
              className="w-12 h-12 rounded border border-neutral-200 object-cover bg-neutral-100"
            />
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-800 disabled:bg-neutral-400"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : variant ? (
              <Save className="w-3 h-3" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            {saving ? "Saving..." : variant ? "Save Variant" : "Add Variant"}
          </button>
        </div>
      </form>

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

export default function VariantManager({
  productId,
  variants,
  topOptions,
  materialOptions,
  frameOptions,
  sizeOptions,
}: VariantManagerProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-[#111111]">Visual Variants</h2>
        <p className="text-[11px] text-neutral-500 mt-1">
          Map top material, frame color and size to a preview image. Variants without an upload
          fall back to the product main image.
        </p>
      </div>

      <div className="space-y-3">
        {variants.map((variant) => (
          <VariantEditor
            key={variant.id}
            productId={productId}
            variant={variant}
            topOptions={topOptions}
            materialOptions={materialOptions}
            frameOptions={frameOptions}
            sizeOptions={sizeOptions}
          />
        ))}

        <VariantEditor
          productId={productId}
          variant={null}
          topOptions={topOptions}
          materialOptions={materialOptions}
          frameOptions={frameOptions}
          sizeOptions={sizeOptions}
        />
      </div>
    </section>
  );
}
