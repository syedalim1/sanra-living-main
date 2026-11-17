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
  ('WPC_OUTDOOR', 'Outdoor WPC Solid Planks (100% Waterproof)', 'WOOD', 'SQFT', 220.00, '#5C4033', NULL),

  -- Stones & Granite (Cost per SQFT)
  ('GRANITE_JET_BLACK', '18mm Export-Grade Krishnagiri Jet Black Granite', 'STONE', 'SQFT', 210.00, '#111111', NULL),
  ('GRANITE_GALAXY', 'Krishnagiri Black Galaxy Granite', 'STONE', 'SQFT', 245.00, '#1C1C1E', NULL),
  ('GRANITE_KWHITE', 'Kashmir White Granite', 'STONE', 'SQFT', 190.00, '#F2F2F7', NULL),
  ('GRANITE_RED', 'Imperial Red Granite', 'STONE', 'SQFT', 180.00, '#8B263E', NULL),
  ('GRANITE_TAN_BROWN', 'Tan Brown Granite (18mm Krishnagiri)', 'STONE', 'SQFT', 195.00, '#4A3525', NULL),
  ('MARBLE_QUARTZ', 'Engineered Stain-Resistant Quartz Slab', 'STONE', 'SQFT', 320.00, '#EFEFF4', NULL),

  -- Sheet Metals (Cost per SQFT)
  ('SHEET_PERFORATED', 'Perforated Industrial Steel Sheet Top', 'METAL', 'SQFT', 145.00, '#333333', NULL),
  ('SHEET_MESH', 'Expanded Diamond Steel Mesh Top', 'METAL', 'SQFT', 130.00, '#444444', NULL),
  ('SHEET_CR_16G', '16-Gauge Solid CR Steel Sheet Top', 'METAL', 'SQFT', 180.00, '#222222', NULL),
  ('SHEET_SS304', 'Jindal SS 304 Food-Grade Stainless Sheet Top', 'METAL', 'SQFT', 380.00, '#E0E0E0', NULL)
ON CONFLICT (material_code) DO NOTHING;

-- 2. SEED PRICING GLOBALS
INSERT INTO pricing_globals (key, numeric_value, description)
VALUES
  ('BUMPER_RATE_PER_FT', 65.00, 'Protective steel bumper rate per perimeter foot'),
  ('CENTER_SUPPORT_FLAT', 280.00, 'Center cross-support structural tube flat cost'),
  ('KNOCKDOWN_PRICE_PCT', 0.00, 'Flat-pack knock-down hardware adjustment pct'),
  ('QTY_DISCOUNT_4_9_PCT', 5.00, 'Small business quantity discount pct (4 to 9 units)'),
  ('QTY_DISCOUNT_10_PLUS_PCT', 12.00, 'B2B factory wholesale quantity discount pct (10+ units)'),
  ('SS_WEIGHT_FACTOR', 1.05, 'Stainless steel density & fabrication weight factor')
ON CONFLICT (key) DO UPDATE SET numeric_value = EXCLUDED.numeric_value;

-- 3. SEED 3 SAMPLE TABLE PRODUCTS, PRICING RULES & VISUAL VARIANTS
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
    use_cases, material_tags, sort_order, top_overlay_note
  )
  VALUES (
    'IMS-CF-42',
    'Commercial Heavy-Gauge Cafe Table (4x2 ft)',
    'Cafe & Dining Tables',
    'TABLE',
    4.0,
    2.0,
    '["FRAME_ONLY", "WOOD", "STONE"]'::jsonb,
    true,
    '10-Yr MIG Structural Warranty',
    '/images/cat-dining-tables.svg',
    '/images/hero-workstation.svg',
    true,
    ARRAY['CAFE', 'HOME'],
    ARRAY['MS', 'WOOD', 'GRANITE'],
    10,
    'Paired with 18mm Kerala Rubberwood or 18mm Export Krishnagiri Granite'
  )
  ON CONFLICT (sku) DO UPDATE SET 
    name = EXCLUDED.name,
    allowed_top_categories = EXCLUDED.allowed_top_categories,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order,
    top_overlay_note = EXCLUDED.top_overlay_note
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
    (v_prod_cafe, 'RUBBER_HONEY_TEAK', 'MATTE_BLACK', '/images/cat-dining-tables.svg', '4x2', 1.0),
    (v_prod_cafe, 'GRANITE_JET_BLACK_OPT', 'MATTE_BLACK', '/images/cat-dining-tables.svg', '4x2', 1.0),
    (v_prod_cafe, 'RUBBER_HONEY_TEAK', 'WHITE', '/images/cat-dining-tables.svg', '4x2', 1.0)
  ON CONFLICT DO NOTHING;

  -- B. OFFICE WORKSTATION (4x2.5 ft)
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  )
  VALUES (
    'IMS-WS-425',
    'Zero-Shake Modular Office Workstation (4x2.5 ft)',
    'Office & Workstation Tables',
    'TABLE',
    4.0,
    2.5,
    '["FRAME_ONLY", "WOOD", "METAL"]'::jsonb,
    true,
    '10-Yr MIG Structural Warranty',
    '/images/cat-workstations.svg',
    '/images/hero-workstation.svg',
    true,
    ARRAY['OFFICE', 'HOME'],
    ARRAY['MS', 'WOOD'],
    20,
    'Engineered for dual-monitor setups with cable management channel'
  )
  ON CONFLICT (sku) DO UPDATE SET 
    name = EXCLUDED.name,
    allowed_top_categories = EXCLUDED.allowed_top_categories,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order,
    top_overlay_note = EXCLUDED.top_overlay_note
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
    (v_prod_workstation, 'RUBBER_HONEY_TEAK', 'MATTE_BLACK', '/images/cat-workstations.svg', '4x2.5', 1.0),
    (v_prod_workstation, 'PRELAM_WHITE', 'GREY', '/images/cat-workstations.svg', '4x2.5', 1.0),
    (v_prod_workstation, 'PRELAM_CARBON_BLACK', 'WHITE', '/images/cat-workstations.svg', '4x2.5', 1.0)
  ON CONFLICT DO NOTHING;

  -- C. DINING TABLE (6x3 ft)
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  )
  VALUES (
    'IMS-DN-63',
    'Industrial Grade 6-Seater Dining Table (6x3 ft)',
    'Cafe & Dining Tables',
    'TABLE',
    6.0,
    3.0,
    '["FRAME_ONLY", "WOOD", "STONE"]'::jsonb,
    true,
    '10-Yr MIG Structural Warranty',
    '/images/hero-workstation.svg',
    '/images/hero-workstation.svg',
    true,
    ARRAY['HOME', 'CAFE'],
    ARRAY['MS', 'WOOD', 'GRANITE'],
    30,
    'Heavy-duty cross-braced frame supporting up to 200 Kg load'
  )
  ON CONFLICT (sku) DO UPDATE SET 
    name = EXCLUDED.name,
    allowed_top_categories = EXCLUDED.allowed_top_categories,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order,
    top_overlay_note = EXCLUDED.top_overlay_note
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
    (v_prod_dining, 'RUBBER_HONEY_TEAK', 'MATTE_BLACK', '/images/hero-workstation.svg', '6x3', 1.0),
    (v_prod_dining, 'GRANITE_JET_BLACK_OPT', 'MATTE_BLACK', '/images/hero-workstation.svg', '6x3', 1.0),
    (v_prod_dining, 'GRANITE_KWHITE_OPT', 'WHITE', '/images/hero-workstation.svg', '6x3', 1.0)
  ON CONFLICT DO NOTHING;

END $$;
