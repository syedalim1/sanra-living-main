"use client";

import { startTransition, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { saveProductSeoAction, type VariantAdminActionState } from "./variant-actions";

import { editorInput, editorSecondary } from "./EditorSection";

const initialState: VariantAdminActionState = {};

export default function ProductSeoPanel({
  productId,
  productName,
  category,
  dimensionsLabel,
  seo,
}: {
  productId: string;
  productName: string;
  category: string;
  dimensionsLabel: string;
  seo: {
    seo_title: string | null;
    meta_description: string | null;
    product_h1: string | null;
    image_alt_text: string | null;
    og_image_url: string | null;
  } | null;
}) {
  const [state, action, saving] = useActionState(saveProductSeoAction, initialState);

  const suggestedTitle = `${productName} | ${category} | SANRA LIVING`;
  const suggestedDesc = `${productName} (${dimensionsLabel}) manufactured by SANRA LIVING, Coimbatore for commercial and institutional spaces.`;
  const suggestedAlt = `${productName} — commercial steel furniture by SANRA LIVING`;

  return (
    <form
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="mt-3 space-y-4"
    >
      <input type="hidden" name="product_id" value={productId} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <label htmlFor="product-seo_title" className="block font-medium text-neutral-700">SEO Title</label>
          <input
            id="product-seo_title"
            name="seo_title"
            defaultValue={seo?.seo_title ?? ""}
            placeholder={suggestedTitle}
            maxLength={120}
            className={editorInput}
          />
        </div>
        <div>
          <label htmlFor="product-product_h1" className="block font-medium text-neutral-700">Product H1</label>
          <input
            id="product-product_h1"
            name="product_h1"
            defaultValue={seo?.product_h1 ?? ""}
            placeholder={productName}
            maxLength={140}
            className={editorInput}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="product-meta_description" className="block font-medium text-neutral-700">
            Meta Description
          </label>
          <textarea
            id="product-meta_description"
            name="meta_description"
            rows={2}
            defaultValue={seo?.meta_description ?? ""}
            placeholder={suggestedDesc}
            maxLength={260}
            className={editorInput}
          />
        </div>
        <div>
          <label className="block font-bold text-neutral-700 mb-1">
            Image Alt Text
          </label>
          <input
            id="product-image_alt_text"
            name="image_alt_text"
            defaultValue={seo?.image_alt_text ?? ""}
            placeholder={suggestedAlt}
            maxLength={180}
            className={editorInput}
          />
        </div>
        <div>
          <label className="block font-bold text-neutral-700 mb-1">
            Open Graph Image URL
          </label>
          <input
            id="product-og_image_url"
            name="og_image_url"
            defaultValue={seo?.og_image_url ?? ""}
            placeholder="Optional custom OG image path"
            maxLength={500}
            className={editorInput}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-red-700" : "text-emerald-700"}`}>{state.error ?? state.message}</p>
        <button type="submit" disabled={saving} className={editorSecondary}>
          {saving && <Loader2 className="size-4 animate-spin" />} Save SEO
        </button>
      </div>
    </form>
  );
}
