"use client";

import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { saveProductSeoAction, type VariantAdminActionState } from "./variant-actions";

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
      className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4"
    >
      <input type="hidden" name="product_id" value={productId} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-neutral-700" />
          <h2 className="text-base font-bold text-[#111111]">Product SEO Fields</h2>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save SEO
        </button>
      </div>

      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.message && (
        <p className="text-xs text-emerald-700 font-semibold">{state.message}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-bold text-neutral-700 mb-1">SEO Title</label>
          <input
            name="seo_title"
            defaultValue={seo?.seo_title ?? ""}
            placeholder={suggestedTitle}
            maxLength={120}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
        </div>
        <div>
          <label className="block font-bold text-neutral-700 mb-1">Product H1</label>
          <input
            name="product_h1"
            defaultValue={seo?.product_h1 ?? ""}
            placeholder={productName}
            maxLength={140}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block font-bold text-neutral-700 mb-1">
            Meta Description
          </label>
          <textarea
            name="meta_description"
            rows={2}
            defaultValue={seo?.meta_description ?? ""}
            placeholder={suggestedDesc}
            maxLength={260}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
        </div>
        <div>
          <label className="block font-bold text-neutral-700 mb-1">
            Image Alt Text
          </label>
          <input
            name="image_alt_text"
            defaultValue={seo?.image_alt_text ?? ""}
            placeholder={suggestedAlt}
            maxLength={180}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
        </div>
        <div>
          <label className="block font-bold text-neutral-700 mb-1">
            Open Graph Image URL
          </label>
          <input
            name="og_image_url"
            defaultValue={seo?.og_image_url ?? ""}
            placeholder="Optional custom OG image path"
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300"
          />
        </div>
      </div>
    </form>
  );
}
