export interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  product_type: string;
  base_length_ft: number;
  base_width_ft: number;
  base_height_ft?: number | null;
  pipe_spec?: string | null;
  combo_config?: Record<string, unknown> | null;
  top_category_images?: Record<string, string> | null;
  gallery_images?: string[] | null;
  allowed_top_categories: string[];
  is_knockdown_available: boolean;
  warranty_text: string;
  main_image_url: string;
  hover_blueprint_img: string | null;
  is_active: boolean;
  use_cases: string[];
  material_tags: string[];
  sort_order: number;
  from_price?: number | null;
}

export interface AdminPricingRule {
  base_pipe_weight_18g_kg: number;
  top_area_sqft: number;
  consumables_cost: number;
  labor_cost: number;
  overhead_pct: number;
  retail_margin_pct: number;
  b2b_margin_pct: number;
  finishing_cost: number;
  b2b_moq: number;
  combo_config?: Record<string, unknown> | null;
  pipe_spec?: string | null;
}

export interface AdminVariant {
  id: string;
  product_id: string;
  top_material_code: string | null;
  frame_color: string;
  preview_image_url: string;
  size_option: string;
  size_multiplier: number;
  selection_key: string | null;
}

export interface AdminOption {
  option_group: string;
  option_code: string;
  parent_code: string | null;
  label_en: string;
  swatch_texture_img: string | null;
}

export interface AdminMaterialOption {
  material_code: string;
  display_name: string;
  category: string;
}

export interface AdminActionResult {
  ok?: boolean;
  error?: string;
  url?: string;
  isActive?: boolean;
}
