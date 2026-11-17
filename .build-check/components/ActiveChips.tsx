"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

interface ActiveChipsProps {
  totalCount: number;
}

export default function ActiveChips({ totalCount }: ActiveChipsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category");
  const use = searchParams.get("use");
  const material = searchParams.get("material");
  const budget = searchParams.get("budget");
  const sort = searchParams.get("sort");

  const removeParam = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    router.push(`/products?${params.toString()}`);
  };

  const chips: { key: string; label: string }[] = [];

  if (category) chips.push({ key: "category", label: `Category: ${category}` });
  if (use) chips.push({ key: "use", label: `Use: ${use}` });
  if (material) chips.push({ key: "material", label: `Material: ${material}` });
  if (budget) {
    const budgetMap: Record<string, string> = {
      "under-2000": "Under ₹2,000",
      "2000-4000": "₹2,000 – ₹4,000",
      "4000-8000": "₹4,000 – ₹8,000",
      "above-8000": "Above ₹8,000",
    };
    chips.push({ key: "budget", label: `Budget: ${budgetMap[budget] || budget}` });
  }
  if (sort && sort !== "recommended") {
    chips.push({
      key: "sort",
      label: sort === "price-asc" ? "Price: Low to High" : "Price: High to Low",
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-1">
          {totalCount} {totalCount === 1 ? "Product" : "Products"} Found
        </span>

        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-300"
          >
            <span>{chip.label}</span>
            <button
              type="button"
              onClick={() => removeParam(chip.key)}
              className="p-0.5 rounded-full hover:bg-neutral-300 text-neutral-600 hover:text-black transition-colors"
              aria-label={`Remove filter ${chip.label}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {chips.length > 0 && (
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black underline transition-colors"
        >
          Reset All
        </button>
      )}
    </div>
  );
}
