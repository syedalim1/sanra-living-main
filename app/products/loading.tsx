import React from "react";

export default function ProductsLoading() {
  return (
    <div className="bg-[#FFFFFF] min-h-[70vh] py-10 md:py-14 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-32 bg-neutral-200 rounded mb-6" />

        {/* Heading skeleton */}
        <div className="h-6 w-48 bg-neutral-200 rounded mb-3" />
        <div className="h-10 w-96 bg-neutral-200 rounded mb-4" />
        <div className="h-4 w-full max-w-xl bg-neutral-200 rounded mb-10" />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar skeleton */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="h-96 bg-neutral-100 border border-neutral-200 rounded-lg p-5" />
          </div>

          {/* Grid skeleton */}
          <div className="flex-1">
            <div className="h-8 w-48 bg-neutral-100 rounded mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 overflow-hidden bg-white"
                >
                  <div className="aspect-video bg-neutral-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 w-3/4 bg-neutral-200 rounded" />
                    <div className="h-5 w-full bg-neutral-200 rounded" />
                    <div className="h-4 w-1/3 bg-neutral-200 rounded" />
                    <div className="pt-4 border-t border-neutral-100">
                      <div className="h-9 w-full bg-neutral-200 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
