"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { PRODUCT_CATEGORY_OPTIONS } from "@/lib/catalogCategories";

interface FilterOption {
  value: string;
  label: string;
}

const CATEGORY_OPTIONS: FilterOption[] = PRODUCT_CATEGORY_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

const FRAME_MATERIAL_OPTIONS: FilterOption[] = [
  { value: "MS", label: "Mild Steel (MS)" },
  { value: "SS", label: "Stainless Steel (SS)" },
];

const TABLE_TOP_OPTIONS: FilterOption[] = [
  { value: "GRANITE", label: "Granite Top" },
  { value: "WOOD", label: "Wood Top" },
];

const SURFACE_OPTIONS: FilterOption[] = [
  { value: "RUBBERWOOD", label: "Rubberwood" },
  { value: "PLYWOOD", label: "Plywood" },
  { value: "PARTICLE_BOARD", label: "Particle Board" },
  { value: "GRANITE", label: "Granite" },
  { value: "CUSHION_UPHOLSTERY", label: "Cushion / Upholstery" },
  { value: "METAL_SEAT", label: "Metal Seat" },
  { value: "FRAME_ONLY", label: "Frame Only" },
];

const INDUSTRY_OPTIONS: FilterOption[] = [
  { value: "CAFE", label: "Cafés & Restaurants" },
  { value: "CANTEEN", label: "Canteens & Mess Halls" },
  { value: "SCHOOL", label: "Schools & Colleges" },
  { value: "HALL", label: "Banquet & Event Halls" },
  { value: "OFFICE", label: "Offices & Workstations" },
  { value: "BAKERY", label: "Bakeries & Juice Bars" },
];

const BUDGET_OPTIONS: FilterOption[] = [
  { value: "under-2000", label: "Under ₹2,000" },
  { value: "2000-4000", label: "₹2,000 – ₹4,000" },
  { value: "4000-8000", label: "₹4,000 – ₹8,000" },
  { value: "above-8000", label: "Above ₹8,000" },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

export default function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Current filter state from URL
  const currentQuery = searchParams.get("q") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentMaterial = searchParams.get("material") || "";
  const currentTop = searchParams.get("top") || "";
  const currentSurface = searchParams.get("surface") || "";
  const currentUse = searchParams.get("use") || "";
  const currentBudget = searchParams.get("budget") || "";
  const currentSort = searchParams.get("sort") || "recommended";
  const [searchInput, setSearchInput] = useState(currentQuery);

  // Helper to push updated search params
  const updateFilter = (key: string, val: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val && val !== "") {
      params.set(key, val);
    } else {
      params.delete(key);
    }
    router.push(`/products?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push("/products");
    setMobileDrawerOpen(false);
  };

  const activeFilterCount =
    (currentQuery ? 1 : 0) +
    (currentCategory ? 1 : 0) +
    (currentMaterial ? 1 : 0) +
    (currentTop ? 1 : 0) +
    (currentSurface ? 1 : 0) +
    (currentUse ? 1 : 0) +
    (currentBudget ? 1 : 0) +
    (currentSort !== "recommended" ? 1 : 0);

  const renderFilterSections = () => (
    <div className="space-y-6">
      {/* 0. Search by name or model number */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateFilter("q", searchInput.trim() || null);
        }}
        className="space-y-2"
      >
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Search Model / Name
        </label>
        <div className="flex gap-1.5">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. IMS-CF-42 or Cafe"
            className="w-full text-xs px-2.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-800 focus:outline-hidden focus:border-black"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-md bg-[#111111] text-white text-xs font-bold"
          >
            Go
          </button>
        </div>
      </form>

      {/* 1. Sort Order */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Sort By
        </label>
        <select
          value={currentSort}
          onChange={(e) => updateFilter("sort", e.target.value)}
          className="w-full text-xs font-semibold p-2.5 bg-white border border-neutral-300 rounded-md text-neutral-800 focus:outline-hidden focus:border-black"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Surface Material */}
      <div className="pt-4 border-t border-neutral-200">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Surface Material
        </label>
        <select
          value={currentSurface}
          onChange={(e) => updateFilter("surface", e.target.value || null)}
          className="w-full text-xs font-semibold p-2.5 bg-white border border-neutral-300 rounded-md text-neutral-800 focus:outline-hidden focus:border-black"
        >
          <option value="">All surfaces</option>
          {SURFACE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Industry / Use Case */}
      <div className="pt-4 border-t border-neutral-200">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Industry / Use
        </label>
        <select
          value={currentUse}
          onChange={(e) => updateFilter("use", e.target.value || null)}
          className="w-full text-xs font-semibold p-2.5 bg-white border border-neutral-300 rounded-md text-neutral-800 focus:outline-hidden focus:border-black"
        >
          <option value="">All industries</option>
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Category */}
      <div className="pt-4 border-t border-neutral-200">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Category
        </label>
        <div className="space-y-1.5">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = currentCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => updateFilter("category", isSelected ? null : cat.value)}
                className={`w-full text-left text-xs py-1.5 px-2.5 rounded transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-[#111111] text-white font-bold"
                    : "text-neutral-700 hover:bg-neutral-100 font-medium"
                }`}
              >
                <span>{cat.label}</span>
                {isSelected && <X className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Frame Material */}
      <div className="pt-4 border-t border-neutral-200">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Frame Material
        </label>
        <div className="space-y-1.5">
          {FRAME_MATERIAL_OPTIONS.map((mat) => {
            const isSelected = currentMaterial === mat.value;
            return (
              <button
                key={mat.value}
                type="button"
                onClick={() => updateFilter("material", isSelected ? null : mat.value)}
                className={`w-full text-left text-xs py-1.5 px-2.5 rounded transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-[#111111] text-white font-bold"
                    : "text-neutral-700 hover:bg-neutral-100 font-medium"
                }`}
              >
                <span>{mat.label}</span>
                {isSelected && <X className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Table Top */}
      <div className="pt-4 border-t border-neutral-200">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Table Top
        </label>
        <div className="space-y-1.5">
          {TABLE_TOP_OPTIONS.map((top) => {
            const isSelected = currentTop === top.value;
            return (
              <button
                key={top.value}
                type="button"
                onClick={() => updateFilter("top", isSelected ? null : top.value)}
                className={`w-full text-left text-xs py-1.5 px-2.5 rounded transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-[#111111] text-white font-bold"
                    : "text-neutral-700 hover:bg-neutral-100 font-medium"
                }`}
              >
                <span>{top.label}</span>
                {isSelected && <X className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Budget */}
      <div className="pt-4 border-t border-neutral-200">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
          Budget Range
        </label>
        <div className="space-y-1.5">
          {BUDGET_OPTIONS.map((bud) => {
            const isSelected = currentBudget === bud.value;
            return (
              <button
                key={bud.value}
                type="button"
                onClick={() => updateFilter("budget", isSelected ? null : bud.value)}
                className={`w-full text-left text-xs py-1.5 px-2.5 rounded transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-[#111111] text-white font-bold"
                    : "text-neutral-700 hover:bg-neutral-100 font-medium"
                }`}
              >
                <span>{bud.label}</span>
                {isSelected && <X className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear All */}
      {activeFilterCount > 0 && (
        <div className="pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={clearAllFilters}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-100 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-28 bg-[#FFFFFF] border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-neutral-800" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#111111]">
                Filters & Refinements
              </h2>
            </div>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-black bg-neutral-900 text-white rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </div>
          {renderFilterSections()}
        </div>
      </aside>

      {/* Mobile Drawer Trigger Button */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="w-full inline-flex items-center justify-between p-3 bg-white border border-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider text-[#111111] shadow-xs active:bg-neutral-50"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter Catalog</span>
          </div>
          {activeFilterCount > 0 && (
            <span className="text-[10px] font-extrabold bg-[#111111] text-white px-2 py-0.5 rounded-full">
              {activeFilterCount} Active
            </span>
          )}
        </button>
      </div>

      {/* Mobile Bottom-Sheet Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 z-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-black" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-black">
                  Filters
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-md text-neutral-500 hover:text-black"
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderFilterSections()}

            <div className="mt-8 pt-4 border-t border-neutral-200 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full py-3 px-4 border border-neutral-300 rounded-lg text-xs font-bold uppercase tracking-wider text-neutral-800 hover:bg-neutral-50 text-center"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-3 px-4 bg-[#111111] rounded-lg text-xs font-bold uppercase tracking-wider text-white text-center shadow-xs"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
