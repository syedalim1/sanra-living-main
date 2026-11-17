"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, Truck } from "lucide-react";

interface PincodeEstimatorProps {
  selectedBuildType?: string;
  onSelectFlatPack?: () => void;
}

function isValidPincode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export default function PincodeEstimator({
  selectedBuildType,
  onSelectFlatPack,
}: PincodeEstimatorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") ?? "";
  const [pin, setPin] = useState(isValidPincode(initialPin) ? initialPin : "");

  const updatePin = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setPin(digits);

    const params = new URLSearchParams(searchParams.toString());
    if (isValidPincode(digits)) {
      params.set("pin", digits);
    } else {
      params.delete("pin");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const valid = isValidPincode(pin);
  const isLocal = valid && pin.startsWith("641");
  const flatPackSelected = selectedBuildType === "KNOCKDOWN";
  const canSelectFlatPack = typeof onSelectFlatPack === "function";

  return (
    <div className="space-y-3 pt-4 border-t border-neutral-200">
      <label
        htmlFor="delivery-pincode"
        className="block text-xs font-bold uppercase tracking-wider text-neutral-700"
      >
        Delivery Pincode Estimator
      </label>

      <input
        id="delivery-pincode"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={pin}
        onChange={(event) => updatePin(event.target.value)}
        placeholder="Enter 6-digit pincode"
        className="w-full sm:w-64 px-3 py-2.5 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black"
      />

      {valid && isLocal && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900">
          <Truck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold leading-relaxed">
            🚚 Local Factory Tempo Delivery Available (Fully Welded or Flat-Pack)
          </p>
        </div>
      )}

      {valid && !isLocal && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-lg bg-neutral-50 border border-neutral-300">
          <div className="flex items-start gap-2.5 flex-1">
            <Package className="w-4 h-4 text-neutral-700 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-neutral-800 leading-relaxed">
              📦 Recommended: Choose 5-Min Flat-Pack Knock-Down to Save up to 65% Courier Cost via
              VRL / Parcel Service!
            </p>
          </div>
          {canSelectFlatPack && (
            <button
              type="button"
              onClick={onSelectFlatPack}
              disabled={flatPackSelected}
              className="shrink-0 px-3.5 py-2 rounded-md border border-black bg-white text-[11px] font-bold uppercase tracking-wider text-black hover:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400 transition-colors"
            >
              {flatPackSelected ? "Flat-Pack Selected" : "Select Flat-Pack"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
