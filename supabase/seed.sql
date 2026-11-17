-- ==============================================================================
-- SANRA LIVING | Indian Make Steel Industries - SIDCO Coimbatore
-- Seed Data: seed.sql
-- ==============================================================================

-- 1. SEED MATERIAL RATES (PLACEHOLDER COSTS - REPLACE VIA ADMIN PANEL LATER)
INSERT INTO material_rates (material_code, display_name, category, unit, cost_per_unit, swatch_color_hex, swatch_texture_img)
VALUES
  -- Metals (Cost per KG)
  ('MS_CR', 'Mild Steel Cold Rolled Pipe', 'METAL', 'KG', 78.50, '#2B2B2B', NULL),
  ('MS_HR', 'Mild Steel Hot Rolled Pipe', 'METAL', 'KG', 72.00, '#3A3A3C', NULL),
  ('GP', 'Galvanised Steel Pipe', 'METAL', 'KG', 84.00, '#8E8E93', NULL),
  ('SS_202', 'Jindal Stainless Steel 202 Grade', 'METAL', 'KG', 185.00, '#D1D1D6', NULL),
  ('SS_304', 'Jindal Stainless Steel 304 Sanitary Grade', 'METAL', 'KG', 260.00, '#E5E5EA', NULL),

  -- Woods (Cost per SQFT)
  ('WOOD_RUBBER_18', '100% Seasoned Grade-A Kerala Rubberwood (18mm)', 'WOOD', 'SQFT', 165.00, '#C29B38', NULL),
  ('PRELAM_18', 'Prelam Engineered Board 18mm', 'WOOD', 'SQFT', 68.00, '#D4B996', NULL),
  ('PRELAM_25', 'Prelam Engineered Board 25mm Heavy Core', 'WOOD', 'SQFT', 95.00, '#BC9A74', NULL),
  ('BWR_PLY_MICA', 'BWR Waterproof Ply with High-Gloss Laminate', 'WOOD', 'SQFT', 140.00, '#E0D5C1', NULL),

  -- Stones & Granite (Cost per SQFT)
  ('GRANITE_JET_BLACK', '18mm Export-Grade Krishnagiri Jet Black Granite', 'STONE', 'SQFT', 210.00, '#111111', NULL),
  ('GRANITE_GALAXY', 'Krishnagiri Black Galaxy Granite', 'STONE', 'SQFT', 245.00, '#1C1C1E', NULL),
  ('GRANITE_KWHITE', 'Kashmir White Granite', 'STONE', 'SQFT', 190.00, '#F2F2F7', NULL),
  ('GRANITE_RED', 'Imperial Red Granite', 'STONE', 'SQFT', 180.00, '#8B263E', NULL),
  ('MARBLE_QUARTZ', 'Engineered Stain-Resistant Quartz Slab', 'STONE', 'SQFT', 320.00, '#EFEFF4', NULL)
ON CONFLICT (material_code) DO NOTHING;

-- 2. SEED 3 SAMPLE TABLE PRODUCTS, PRICING RULES & VISUAL VARIANTS
DO $$
DECLARE
  v_prod_cafe UUID;
  v_prod_workstation UUID;
  v_prod_dining UUID;
BEGIN
  -- A. CAFE TABLE (4x2 ft)
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order
  )
  VALUES (
    'IMS-CF-42',
    'Commercial Heavy-Gauge Cafe Table (4x2 ft)',
    'Cafe & Dining Tables',
    'TABLE',
    4.0,
    2.0,
    '["WOOD", "STONE"]'::jsonb,
    true,
    '10-Yr MIG Structural Warranty',
    '/images/cat-dining-tables.svg',
    '/images/hero-workstation.svg',
    true,
    ARRAY['CAFE', 'HOME'],
    ARRAY['MS', 'WOOD', 'GRANITE'],
    10
  )
  ON CONFLICT (sku) DO UPDATE SET 
    name = EXCLUDED.name,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_prod_cafe;

  INSERT INTO product_pricing_rules (
    product_id, base_pipe_weight_18g_kg, top_area_sqft, consumables_cost,
    labor_cost, overhead_pct, retail_margin_pct, b2b_margin_pct
  )
  VALUES (
    v_prod_cafe,
    14.50, -- kg steel weight placeholder
    8.00,  -- 4x2 = 8 sqft
    350.00, -- gas/wire/powder coat
    450.00, -- welder & fitter labor
    12.00,  -- 12% overhead
    28.00,  -- 28% retail margin
    16.00   -- 16% b2b margin
  )
  ON CONFLICT (product_id) DO NOTHING;

  INSERT INTO product_visual_variants (product_id, top_material_code, frame_color, preview_image_url, size_option, size_multiplier)
  VALUES
    (v_prod_cafe, 'WOOD_RUBBER_18', 'MATTE_BLACK', '/images/cat-dining-tables.svg', '4x2', 1.0),
    (v_prod_cafe, 'GRANITE_JET_BLACK', 'MATTE_BLACK', '/images/cat-dining-tables.svg', '4x2', 1.0),
    (v_prod_cafe, 'WOOD_RUBBER_18', 'WHITE', '/images/cat-dining-tables.svg', '4x2', 1.0);

  -- B. OFFICE WORKSTATION (4x2.5 ft)
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order
  )
  VALUES (
    'IMS-WS-425',
    'Zero-Shake Modular Office Workstation (4x2.5 ft)',
    'Office & Workstation Tables',
    'TABLE',
    4.0,
    2.5,
    '["WOOD"]'::jsonb,
    true,
    '10-Yr MIG Structural Warranty',
    '/images/cat-workstations.svg',
    '/images/hero-workstation.svg',
    true,
    ARRAY['OFFICE', 'HOME'],
    ARRAY['MS', 'WOOD'],
    20
  )
  ON CONFLICT (sku) DO UPDATE SET 
    name = EXCLUDED.name,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_prod_workstation;

  INSERT INTO product_pricing_rules (
    product_id, base_pipe_weight_18g_kg, top_area_sqft, consumables_cost,
    labor_cost, overhead_pct, retail_margin_pct, b2b_margin_pct
  )
  VALUES (
    v_prod_workstation,
    18.20,
    10.00, -- 4x2.5 = 10 sqft
    420.00,
    550.00,
    12.00,
    30.00,
    18.00
  )
  ON CONFLICT (product_id) DO NOTHING;

  INSERT INTO product_visual_variants (product_id, top_material_code, frame_color, preview_image_url, size_option, size_multiplier)
  VALUES
    (v_prod_workstation, 'WOOD_RUBBER_18', 'MATTE_BLACK', '/images/cat-workstations.svg', '4x2.5', 1.0),
    (v_prod_workstation, 'PRELAM_25', 'GREY', '/images/cat-workstations.svg', '4x2.5', 1.0),
    (v_prod_workstation, 'PRELAM_25', 'WHITE', '/images/cat-workstations.svg', '4x2.5', 1.0);

  -- C. DINING TABLE (6x3 ft)
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order
  )
  VALUES (
    'IMS-DN-63',
    'Industrial Grade 6-Seater Dining Table (6x3 ft)',
    'Cafe & Dining Tables',
    'TABLE',
    6.0,
    3.0,
    '["WOOD", "STONE"]'::jsonb,
    true,
    '10-Yr MIG Structural Warranty',
    '/images/hero-workstation.svg',
    '/images/hero-workstation.svg',
    true,
    ARRAY['HOME', 'CAFE'],
    ARRAY['MS', 'WOOD', 'GRANITE'],
    30
  )
  ON CONFLICT (sku) DO UPDATE SET 
    name = EXCLUDED.name,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_prod_dining;

  INSERT INTO product_pricing_rules (
    product_id, base_pipe_weight_18g_kg, top_area_sqft, consumables_cost,
    labor_cost, overhead_pct, retail_margin_pct, b2b_margin_pct
  )
  VALUES (
    v_prod_dining,
    27.80,
    18.00, -- 6x3 = 18 sqft
    650.00,
    800.00,
    12.00,
    32.00,
    20.00
  )
  ON CONFLICT (product_id) DO NOTHING;

  INSERT INTO product_visual_variants (product_id, top_material_code, frame_color, preview_image_url, size_option, size_multiplier)
  VALUES
    (v_prod_dining, 'WOOD_RUBBER_18', 'MATTE_BLACK', '/images/hero-workstation.svg', '6x3', 1.0),
    (v_prod_dining, 'GRANITE_JET_BLACK', 'MATTE_BLACK', '/images/hero-workstation.svg', '6x3', 1.0),
    (v_prod_dining, 'GRANITE_KWHITE', 'WHITE', '/images/hero-workstation.svg', '6x3', 1.0);

END $$;
