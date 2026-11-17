"use client";

import dynamic from "next/dynamic";
import type { ConfigOption } from "@/lib/configuratorOptions";
import type { OptionGroupRow } from "@/lib/productTypeConfig";
import type { B2BProduct } from "@/lib/b2b/types";

const B2BOrderTools = dynamic(() => import("./B2BOrderTools"), {
  loading: () => (
    <div className="space-y-6" aria-label="Loading project calculator">
      <div className="h-80 rounded-xl bg-neutral-100 border border-neutral-200 animate-pulse" />
      <div className="h-96 rounded-xl bg-neutral-100 border border-neutral-200 animate-pulse" />
    </div>
  ),
});

interface B2BOrderToolsLoaderProps {
  products: B2BProduct[];
  groups: OptionGroupRow[];
  options: ConfigOption[];
  whatsappNumber: string;
}

export default function B2BOrderToolsLoader(props: B2BOrderToolsLoaderProps) {
  return <B2BOrderTools {...props} />;
}
