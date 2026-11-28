"use client";

import { startTransition, useActionState } from "react";
import { saveAvailabilityAction } from "@/app/admin/(dashboard)/options/actions";

interface AvailabilityGroup {
  option_group: string;
  group_title: string;
}

interface AvailabilityOption {
  option_group: string;
  option_code: string;
  label_en: string;
}

export default function ProductOptionsAvailability({
  productId,
  productType,
  groups,
  options,
  disabledCodes,
}: {
  productId: string;
  productType: string;
  groups: AvailabilityGroup[];
  options: AvailabilityOption[];
  disabledCodes: string[];
}) {
  const disabled = new Set(disabledCodes);
  const [state, action, saving] = useActionState(saveAvailabilityAction, {});

  return (
    <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-sm font-bold text-[#111111]">Options for this product</h2>
        <p className="text-[11px] text-neutral-500 mt-1">
          All options are available by default. Untick an option to hide it for this
          product only.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="px-5 py-4 text-xs text-neutral-500">
          No option groups configured for this product type yet.
        </p>
      ) : (
        <form action={action} onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => action(data));
        }} className="px-5 py-4 space-y-4">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="product_type" value={productType} />

          {groups.map((group) => {
            const groupOptions = options.filter(
              (option) => option.option_group === group.option_group
            );
            if (groupOptions.length === 0) return null;

            return (
              <div key={group.option_group} className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {group.group_title}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {groupOptions.map((option) => (
                    <label
                      key={option.option_code}
                      className="flex items-center gap-2 text-xs font-medium min-h-[40px]"
                    >
                      <input
                        type="checkbox"
                        name="option"
                        value={option.option_code}
                        defaultChecked={!disabled.has(option.option_code)}
                        className="w-4 h-4 accent-black"
                      />
                      {option.label_en}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          <p role={state.error ? "alert" : "status"} className={`text-sm ${state.error ? "text-red-700" : "text-emerald-700"}`}>{state.error ?? (state.ok ? "Product options saved." : "")}</p>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-[#111111] text-white text-[10px] font-bold uppercase tracking-wider">
            {saving ? "Saving…" : "Save product options"}
          </button>
        </form>
      )}
    </section>
  );
}
