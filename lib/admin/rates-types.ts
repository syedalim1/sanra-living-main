export interface MaterialRateRow {
  id: string;
  material_code: string;
  display_name: string;
  category: "METAL" | "WOOD" | "STONE";
  unit: string;
  cost_per_unit: number;
  updated_at: string | null;
}

export interface GlobalRateRow {
  key: string;
  numeric_value: number;
  description: string | null;
  updated_at: string | null;
}

export interface OptionRateRow {
  option_code: string;
  option_group: string;
  label_en: string;
  field: "metal_cost_multiplier" | "flat_addon" | null;
  value: number;
  material_code?: string | null;
  note?: string | null;
}

export interface PreviewProduct {
  id: string;
  sku: string;
  name: string;
  allowed_top_categories: string[];
}

export interface PreviewOption {
  option_code: string;
  label_en: string;
  parent_code: string | null;
}
