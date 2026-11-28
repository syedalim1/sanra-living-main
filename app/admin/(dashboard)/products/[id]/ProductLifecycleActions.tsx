"use client";

import { useActionState } from "react";
import { Archive, CheckCircle2, Circle, Copy, ExternalLink, Globe, EyeOff, Loader2 } from "lucide-react";
import { archiveProductAction, duplicateProductAction } from "@/app/admin/(dashboard)/products/actions";
import type { AdminActionResult, AdminProduct } from "@/lib/admin/product-types";
import { productPath } from "@/lib/site";
import { editorPrimary, editorSecondary } from "./EditorSection";
import { toggleProductPublishAction, type VariantAdminActionState } from "./variant-actions";

const initialState: AdminActionResult = {};
const initialVarState: VariantAdminActionState = {};

export interface PublicationChecklist {
  hasPhoto: boolean;
  hasDescription: boolean;
  hasDimensions: boolean;
  hasPublishedVariants: boolean;
}

export default function ProductLifecycleActions({ product, checklist }: {
  product: AdminProduct;
  checklist: PublicationChecklist;
}) {
  const [archive, archiveAction, archiving] = useActionState(archiveProductAction, initialState);
  const [publication, publishAction, publishing] = useActionState(toggleProductPublishAction, initialVarState);
  const [duplicate, duplicateAction, duplicating] = useActionState(duplicateProductAction, initialState);
  const requirements = [
    [checklist.hasPhoto, "Main photo"],
    [checklist.hasDescription, "Catalog description"],
    [checklist.hasDimensions, "Product dimensions"],
    [checklist.hasPublishedVariants, "Ready published variants"],
  ] as const;
  const ready = requirements.every(([complete]) => complete);
  const error = publication.error ?? archive.error ?? duplicate.error;

  return (
    <div className="space-y-4">
      <ul className="grid gap-2 sm:grid-cols-2">
        {requirements.map(([complete, label]) => (
          <li key={label} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${complete ? "bg-emerald-50 text-emerald-900" : "bg-neutral-100 text-neutral-700"}`}>
            {complete ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0" />}
            <span className="sr-only">{complete ? "Complete" : "Required"} </span>
            {label}
          </li>
        ))}
      </ul>
      {!product.is_active && !ready && (
        <p className="text-sm text-neutral-600">Complete these items and publish at least one priced or quote-only variant to enable publication.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <form action={publishAction}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="next_active" value={String(!product.is_active)} />
          <button type="submit" disabled={publishing || (!product.is_active && !ready)} className={product.is_active ? editorSecondary : editorPrimary}>
            {publishing ? <Loader2 className="size-4 animate-spin" /> : product.is_active ? <EyeOff className="size-4" /> : <Globe className="size-4" />}
            {product.is_active ? "Unpublish" : "Publish product"}
          </button>
        </form>
        {product.is_active && (
          <a href={productPath(product.sku)} target="_blank" rel="noreferrer" className={editorSecondary}>
            <ExternalLink className="size-4" /> View product
          </a>
        )}
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-medium text-neutral-700">More product actions</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={duplicateAction} onSubmit={(event) => {
            if (!window.confirm(`Duplicate ${product.sku} as a draft with a new model number?`)) event.preventDefault();
          }}>
            <input type="hidden" name="id" value={product.id} />
            <button type="submit" disabled={duplicating} className={editorSecondary}>
              {duplicating ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />} Duplicate
            </button>
          </form>
          {product.is_active && (
            <form action={archiveAction} onSubmit={(event) => {
              if (!window.confirm(`Archive ${product.sku} and hide it from the public catalog?`)) event.preventDefault();
            }}>
              <input type="hidden" name="id" value={product.id} />
              <button type="submit" disabled={archiving} className={editorSecondary}>
                {archiving ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />} Archive
              </button>
            </form>
          )}
        </div>
      </details>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!error && (publication.message || archive.ok) && (
        <p role="status" className="text-sm text-emerald-700">{publication.message ?? "Product archived."}</p>
      )}
    </div>
  );
}
