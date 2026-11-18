"use client";

import { useActionState } from "react";
import { previewSetPriceAction, type SetPreviewState } from "./actions";

const initialState: SetPreviewState = {};

export default function SetPreview({
  setId,
  savedType,
  savedValue,
}: {
  setId: string;
  savedType: string;
  savedValue: number;
}) {
  const [state, action, pending] = useActionState(previewSetPriceAction, initialState);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="set_id" value={setId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          Preview type
          <select
            name="adjustment_type"
            defaultValue={savedType}
            className="block px-2 py-1.5 rounded-md border border-neutral-300 text-xs font-normal bg-white"
          >
            <option value="AMOUNT">Amount (₹)</option>
            <option value="PERCENT">Percent (%)</option>
          </select>
        </label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          Value
          <input
            name="adjustment_value"
            type="number"
            step="0.01"
            defaultValue={savedValue}
            className="block w-28 px-2 py-1.5 rounded-md border border-neutral-300 text-xs font-normal"
          />
        </label>
      </div>
      <button
        disabled={pending}
        className="px-3 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
      >
        {pending ? "Calculating…" : "Preview price"}
      </button>

      {state.error && (
        <p className="text-[10px] font-semibold text-red-700">{state.error}</p>
      )}

      {state.ok && state.before != null && state.after != null && (
        <p className="text-[11px] font-semibold text-[#111111]">
          ₹{state.before.toLocaleString("en-IN")} → ₹
          {state.after.toLocaleString("en-IN")}
        </p>
      )}
    </form>
  );
}
