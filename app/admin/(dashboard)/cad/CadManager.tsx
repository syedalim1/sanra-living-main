"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Save, Trash2 } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  deleteCadFileAction,
  saveCadFileAction,
} from "@/app/admin/(dashboard)/cad/actions";
import type { AdminCadFile, CadActionResult } from "@/lib/admin/cad-types";

const initial: CadActionResult = {};

interface ProductOption {
  sku: string;
  name: string;
}

function CadFileCard({
  file,
  products,
  onToast,
}: {
  file: AdminCadFile;
  products: ProductOption[];
  onToast: (kind: ToastKind, message: string) => void;
}) {
  const router = useRouter();

  const [, saveAction, saving] = useActionState(
    async (previous: CadActionResult, formData: FormData) => {
      const result = await saveCadFileAction(previous, formData);
      if (result.ok) {
        onToast("success", "CAD file updated.");
        router.refresh();
      } else {
        onToast("error", result.error ?? "Unable to update CAD file.");
      }
      return result;
    },
    initial
  );

  const [, deleteAction, deleting] = useActionState(
    async (previous: CadActionResult, formData: FormData) => {
      const result = await deleteCadFileAction(previous, formData);
      if (result.ok) {
        onToast("success", "CAD file deleted.");
        router.refresh();
      } else {
        onToast("error", result.error ?? "Unable to delete CAD file.");
      }
      return result;
    },
    initial
  );

  return (
    <div className="p-4 rounded-lg border border-neutral-200 bg-white space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-neutral-900">{file.title}</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            {file.file_type} • {file.product_sku || "No linked product"} •{" "}
            {file.is_active ? "Active" : "Hidden"}
          </p>
        </div>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Delete this CAD record and its private stored file?"
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="file_id" value={file.id} />
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

      <details className="rounded-md bg-neutral-50 border border-neutral-200">
        <summary className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-600 cursor-pointer">
          Edit / replace
        </summary>
        <form action={saveAction} className="p-3 space-y-2">
          <input type="hidden" name="file_id" value={file.id} />
          <input
            name="title"
            defaultValue={file.title}
            required
            className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
          />
          <textarea
            name="description"
            defaultValue={file.description ?? ""}
            rows={2}
            className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              name="file_type"
              defaultValue={file.file_type}
              className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            >
              <option value="SKP">SKP</option>
              <option value="DWG">DWG</option>
            </select>
            <select
              name="product_sku"
              defaultValue={file.product_sku ?? ""}
              className="w-full px-2.5 py-2 rounded-md border border-neutral-300 bg-white text-xs"
            >
              <option value="">No linked product</option>
              {products.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[10px] font-semibold text-neutral-700">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={file.is_active}
              className="w-3.5 h-3.5 accent-black"
            />
            Active on /b2b
          </label>
          <input
            type="file"
            name="file"
            accept=".skp,.dwg"
            className="block w-full text-[10px] text-neutral-600 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-neutral-900 file:text-white file:text-[9px] file:font-bold file:uppercase"
          />
          <span className="block text-[9px] text-neutral-500">
            Leave empty to keep the current private file. Replacement must be
            .skp or .dwg up to 50 MB and match the selected type.
          </span>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#111111] text-white text-[9px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            Save
          </button>
        </form>
      </details>
    </div>
  );
}

export default function CadManager({
  files,
  products,
}: {
  files: AdminCadFile[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(
    null
  );

  const [, uploadAction, uploading] = useActionState(
    async (previous: CadActionResult, formData: FormData) => {
      const result = await saveCadFileAction(previous, formData);
      if (result.ok) {
        setToast({ kind: "success", message: "CAD file uploaded." });
        router.refresh();
      } else {
        setToast({
          kind: "error",
          message: result.error ?? "Unable to upload CAD file.",
        });
      }
      return result;
    },
    initial
  );

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-[#111111]">Upload CAD File</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            .skp or .dwg up to 50 MB. Private bucket, random storage names.
          </p>
        </div>

        <form action={uploadAction} className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              name="title"
              placeholder="Title"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
            />
            <select
              name="file_type"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
            >
              <option value="SKP">SKP</option>
              <option value="DWG">DWG</option>
            </select>
          </div>

          <textarea
            name="description"
            placeholder="Description"
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              name="product_sku"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm"
            >
              <option value="">No linked product</option>
              {products.map((product) => (
                <option key={product.sku} value={product.sku}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-xs font-semibold text-neutral-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked
                className="w-4 h-4 accent-black"
              />
              Active on /b2b
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <input
              type="file"
              name="file"
              required
              accept=".skp,.dwg"
              className="block w-full text-[11px] text-neutral-600 file:mr-2 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-neutral-900 file:text-white file:text-[10px] file:font-bold file:uppercase"
            />
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black disabled:bg-neutral-400"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileUp className="w-4 h-4" />
              )}
              {uploading ? "Uploading..." : "Upload CAD file"}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-[#111111]">CAD Library</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Public metadata is listed on /b2b. Storage paths never appear there.
          </p>
        </div>

        {files.length === 0 ? (
          <p className="text-[11px] text-neutral-500 p-4 rounded-lg bg-white border border-neutral-200">
            No CAD files uploaded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <CadFileCard
                key={file.id}
                file={file}
                products={products}
                onToast={(kind, message) => setToast({ kind, message })}
              />
            ))}
          </div>
        )}
      </section>

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
