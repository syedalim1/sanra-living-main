"use client";

import dynamic from "next/dynamic";
import type { ConfigOption } from "@/lib/configuratorOptions";
import type { OptionGroupRow } from "@/lib/productTypeConfig";

const TableConfigurator = dynamic(() => import("@/components/TableConfigurator"), {
  loading: () => <ConfiguratorSkeleton />,
});

const TypeConfigurator = dynamic(() => import("@/components/TypeConfigurator"), {
  loading: () => <ConfiguratorSkeleton />,
});

function ConfiguratorSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 animate-pulse">
      <div className="lg:col-span-6 h-[420px] rounded-xl bg-neutral-100 border border-neutral-200" />
      <div className="lg:col-span-6 space-y-4">
        <div className="h-8 w-2/3 rounded bg-neutral-200" />
        <div className="h-4 w-1/2 rounded bg-neutral-200" />
        <div className="h-40 rounded-xl bg-neutral-100 border border-neutral-200" />
        <div className="h-28 rounded-xl bg-neutral-100 border border-neutral-200" />
      </div>
    </div>
  );
}

interface ProductConfiguratorLoaderProps {
  product: {
    product_type: string;
    [key: string]: unknown;
  };
  options: ConfigOption[];
  typeOptions: ConfigOption[];
  groups: OptionGroupRow[];
  visualVariants: Array<Record<string, unknown>>;
  fromPrice: number | null;
  engineProductType?: string;
  topCategoryImages?: Record<string, string> | null;
  pipeSpec?: string | null;
  chairAddonPrice?: number | null;
}

export default function ProductConfiguratorLoader({
  product,
  options,
  typeOptions,
  groups,
  visualVariants,
  fromPrice,
  engineProductType,
  topCategoryImages,
  pipeSpec,
  chairAddonPrice,
}: ProductConfiguratorLoaderProps) {
  if ((engineProductType ?? product.product_type) === "TABLE") {
    return (
      <TableConfigurator
        product={product as never}
        options={options}
        visualVariants={visualVariants as never}
        topCategoryImages={topCategoryImages ?? null}
        pipeSpec={pipeSpec ?? null}
        chairAddonPrice={chairAddonPrice ?? null}
      />
    );
  }

  return (
    <TypeConfigurator
      product={product as never}
      options={typeOptions}
      groups={groups}
      visualVariants={visualVariants as never}
      fromPrice={fromPrice}
    />
  );
}
