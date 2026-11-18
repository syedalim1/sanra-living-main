"use client";

import { useActionState } from "react";
import { previewOptionPriceAction, type OptionPreviewState } from "./actions";

interface PreviewProduct {
  id: string;
  sku: string;
  name: string;
  product_type: string;
}

const initialState: OptionPreviewState = {};

export default function OptionPreview({
  optionCode,
  products,
}: {
  optionCode: string;
  products: PreviewProduct[];
}) {
  const [state, action, pending] = useActionState(
    previewOptionPriceAction,
    initialState
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="option_code" value={optionCode} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
          Preview on product
          <select
            name="product_id"
            required
            className="block w-full px-3 py-2 rounded-md border border-amber-300 text-sm font-normal bg-white"
          >
            <option value="">Choose product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.sku} · {product.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={pending}
          className="px-3 py-2 rounded-md bg-amber-900 text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {pending ? "Calculating…" : "Preview effect"}
        </button>
      </div>

      {state.error && (
        <p className="text-[10px] font-semibold text-red-700">{state.error}</p>
      )}

      {state.ok && state.baseline != null && state.updated != null && (
        <p className="text-[11px] font-semibold text-amber-900">
          ₹{state.baseline.toLocaleString("en-IN")} → ₹
          {state.updated.toLocaleString("en-IN")} (
          {state.delta != null && state.delta >= 0 ? "+" : ""}
          {state.delta?.toLocaleString("en-IN")})
        </p>
      )}
    </form>
  );
}
