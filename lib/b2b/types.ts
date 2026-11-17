import type { ProductType } from "@/lib/productTypeConfig";

export interface B2BProduct {
  id: string;
  sku: string;
  name: string;
  product_type: ProductType;
  allowed_top_categories: string[];
}

export interface B2BCadFile {
  id: string;
  title: string;
  description: string | null;
  file_type: "SKP" | "DWG";
  product_sku: string | null;
  product_name: string | null;
}
