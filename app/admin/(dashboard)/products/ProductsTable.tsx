"use client";

import { adminImageUrl } from "@/lib/media/paths";

import { useState, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Archive, PackageOpen } from "lucide-react";
import AdminToast, { type ToastKind } from "@/components/admin/Toast";
import {
  archiveProductAction,
  toggleProductActiveAction,
} from "@/app/admin/(dashboard)/products/actions";
import { formatINR } from "@/lib/format";
import type { AdminActionResult, AdminProduct } from "@/lib/admin/product-types";

const initialState: AdminActionResult = {};

function ActiveToggle({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await toggleProductActiveAction(previous, formData);
      if (result.ok) {
        router.refresh();
      }
      return result;
    },
    initialState
  );

  const active = state.isActive ?? product.is_active;

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="id" value={product.id} />
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
            active
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
              : "bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200"
          }`}
        >
          {pending && <Loader2 className="w-3 h-3 animate-spin" />}
          {active ? "Active" : "Archived"}
        </button>
      </form>
      {state.error && <p className="text-[10px] text-red-600 mt-1">{state.error}</p>}
    </div>
  );
}

function ArchiveButton({
  product,
  onResult,
}: {
  product: AdminProduct;
  onResult: (kind: ToastKind, message: string) => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (previous: AdminActionResult, formData: FormData) => {
      const result = await archiveProductAction(previous, formData);
      if (result.ok) {
        onResult("success", `${product.sku} archived.`);
        router.refresh();
      } else {
        onResult("error", result.error ?? "Unable to archive product.");
      }
      return result;
    },
    initialState
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Archive ${product.sku}? It will disappear from the public catalog.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={product.id} />
      <button
        type="submit"
        disabled={pending || !product.is_active}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-neutral-200 text-[10px] font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
      >
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
        Archive
      </button>
      {state.error && <p className="text-[10px] text-red-600 mt-1">{state.error}</p>}
    </form>
  );
}

export default function ProductsTable({ products }: { products: AdminProduct[] }) {
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  if (products.length === 0) {
    return (
      <div className="p-10 text-center rounded-xl bg-white border border-neutral-200">
        <PackageOpen className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
        <p className="text-sm font-bold text-neutral-800">No products found</p>
        <p className="text-xs text-neutral-500 mt-1">
          Change the search or add a new product.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-bold">Image</th>
              <th className="px-3 py-3 font-bold">SKU</th>
              <th className="px-3 py-3 font-bold">Name</th>
              <th className="px-3 py-3 font-bold">Type</th>
              <th className="px-3 py-3 font-bold">Status</th>
              <th className="px-3 py-3 font-bold">From price</th>
              <th className="px-4 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {products.map((product) => (
              <tr key={product.id} className={product.is_active ? "bg-white" : "bg-neutral-50/60"}>
                <td className="px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={adminImageUrl(product.main_image_url) ?? undefined}
                    alt=""
                    className="w-12 h-12 rounded-md object-cover border border-neutral-200 bg-neutral-100"
                  />
                </td>
                <td className="px-3 py-3 font-mono text-[11px] font-bold text-neutral-900">
                  {product.sku}
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-neutral-900 max-w-xs">{product.name}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{product.category}</p>
                </td>
                <td className="px-3 py-3 text-neutral-600">{product.product_type}</td>
                <td className="px-3 py-3">
                  <ActiveToggle product={product} />
                </td>
                <td className="px-3 py-3">
                  {product.from_price != null ? (
                    <span className="font-bold text-neutral-900">
                      ₹{formatINR(product.from_price)}
                    </span>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-black"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Link>
                    <ArchiveButton
                      product={product}
                      onResult={(kind, message) => setToast({ kind, message })}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
