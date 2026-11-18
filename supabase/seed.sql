-- ============================================================================
-- SANRA LIVING | Indian Make Steel Industries - SIDCO Coimbatore
-- Seed data matched to the exact products schema.
-- Safe to re-run.
-- ============================================================================

-- 1. MATERIAL RATES
INSERT INTO material_rates
  (material_code, display_name, category, unit, cost_per_unit)
VALUES
  ('MS_CR',              'MS Cold Rolled (Tata/Apollo)',         'METAL', '₹/kg',   78.50),
  ('MS_HR',              'Mild Steel Hot Rolled Pipe',           'METAL', '₹/kg',   72.00),
  ('GP',                 'Galvanised Steel Pipe',                'METAL', '₹/kg',   84.00),
  ('SS_202',             'Jindal SS 202',                        'METAL', '₹/kg',  185.00),
  ('SS_304',             'Jindal SS 304',                        'METAL', '₹/kg',  260.00),
  ('WOOD_RUBBER_18',     '100% Seasoned Grade-A Hardwood (18mm)','WOOD',  '₹/sqft', 165.00),
  ('PRELAM_18',          'Pre-Lam Board 18mm',                   'WOOD',  '₹/sqft',  68.00),
  ('PRELAM_25',          'Pre-Lam Board 25mm Heavy Core',        'WOOD',  '₹/sqft',  95.00),
  ('BWR_PLY_MICA',       'BWR Waterproof Ply with High-Gloss',   'WOOD',  '₹/sqft', 140.00),
  ('WPC_OUTDOOR',        'Outdoor WPC Solid Planks (Waterproof)','WOOD',  '₹/sqft', 220.00),
  ('GRANITE_JET_BLACK',  '18mm Export-Grade Jet Black Granite',  'STONE', '₹/sqft', 210.00),
  ('GRANITE_GALAXY',     'Natural Black Galaxy Granite 18mm',    'STONE', '₹/sqft', 245.00),
('GRANITE_KWHITE', 'Classic Pearl White Granite 18mm',     'STONE', '₹/sqft', 190.00),
  ('GRANITE_RED',        'Imperial Red Granite 18mm',            'STONE', '₹/sqft', 180.00),
  ('GRANITE_TAN_BROWN',  'Tan Brown Granite 18mm',               'STONE', '₹/sqft', 195.00),
  ('MARBLE_QUARTZ',      'Stain-Resistant Quartz Slab 18mm',     'STONE', '₹/sqft', 320.00),
  ('SHEET_PERFORATED',   'Perforated Industrial Steel Sheet Top','METAL', '₹/sqft', 145.00),
  ('SHEET_MESH',         'Expanded Diamond Steel Mesh Top',      'METAL', '₹/sqft', 130.00),
  ('SHEET_CR_16G',       '16-Gauge Solid CR Steel Sheet Top',    'METAL', '₹/sqft', 180.00),
  ('SHEET_SS304',        'Stainless Steel 304 Sheet Top',        'METAL', '₹/sqft', 380.00)
ON CONFLICT (material_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  unit = EXCLUDED.unit,
  cost_per_unit = EXCLUDED.cost_per_unit;

-- 2. PRICING GLOBALS
INSERT INTO pricing_globals (key, numeric_value, description)
VALUES
  ('BUMPER_RATE_PER_FT',       65.00,  'Protective steel bumper rate per perimeter foot'),
  ('CENTER_SUPPORT_FLAT',     280.00,  'Center cross-support structural tube flat cost'),
  ('KNOCKDOWN_PRICE_PCT',       0.00,  'Flat-pack knock-down hardware adjustment pct'),
  ('QTY_DISCOUNT_4_9_PCT',      5.00,  'Small business quantity discount pct (4 to 9 units)'),
  ('QTY_DISCOUNT_10_PLUS_PCT', 12.00,  'B2B factory wholesale quantity discount pct (10+ units)'),
  ('SS_WEIGHT_FACTOR',          1.05,  'Stainless steel density & fabrication weight factor'),
  ('PACK2_SAVING',            150.00,  'Pack of 2 nesting combo saving')
ON CONFLICT (key) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  description = EXCLUDED.description;

-- 3. PRODUCTS + PRIVATE PRICING + VISUAL VARIANTS
DO $$
DECLARE
  p_cafe UUID;
  p_work UUID;
  p_dine UUID;
  p_chair UUID;
  p_bar UUID;
  p_st12 UUID;
  p_stinv UUID;
  p_stkd UUID;
  p_rack UUID;
  p_ss UUID;
BEGIN
  -- TABLE: Cafe table
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft, base_height_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active, use_cases, material_tags,
    sort_order, top_overlay_note, top_category_images, gallery_images
  ) VALUES (
    'IMS-CF-42', 'Commercial Heavy-Gauge Cafe Table (4x2 ft)', 'Cafe & Dining Tables',
    'TABLE', 4.0, 2.0, 2.5,
    '["FRAME_ONLY","WOOD","STONE"]'::jsonb, true, '10-Yr MIG Structural Warranty',
    '/images/cat-dining-tables.svg', '/images/hero-workstation.svg', true,
    ARRAY['CAFE','HOME','CANTEEN','BAKERY','HALL','SCHOOL']::text[], ARRAY['MS','WOOD','GRANITE']::text[],
    10, 'Paired with 100% Seasoned Grade-A Hardwood or 18mm Export-Grade Natural Granite',
    '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]
  )
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    product_type = EXCLUDED.product_type,
    base_length_ft = EXCLUDED.base_length_ft,
    base_width_ft = EXCLUDED.base_width_ft,
    base_height_ft = EXCLUDED.base_height_ft,
    allowed_top_categories = EXCLUDED.allowed_top_categories,
    is_knockdown_available = EXCLUDED.is_knockdown_available,
    warranty_text = EXCLUDED.warranty_text,
    main_image_url = EXCLUDED.main_image_url,
    hover_blueprint_img = EXCLUDED.hover_blueprint_img,
    is_active = EXCLUDED.is_active,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order,
    top_overlay_note = EXCLUDED.top_overlay_note,

    top_category_images = EXCLUDED.top_category_images,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO p_cafe;

  -- TABLE: Office workstation
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft, base_height_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active, use_cases, material_tags,
    sort_order, top_overlay_note, top_category_images, gallery_images
  ) VALUES (
    'IMS-WS-425', 'Zero-Shake Modular Office Workstation (4x2.5 ft)',
    'Office & Workstation Tables', 'TABLE', 4.0, 2.5, 2.5,
    '["FRAME_ONLY","WOOD","METAL"]'::jsonb,
    true, '10-Yr MIG Structural Warranty', '/images/cat-workstations.svg',
    '/images/hero-workstation.svg', true, ARRAY['OFFICE','HOME','SCHOOL']::text[],
    ARRAY['MS','WOOD']::text[], 20,
    'Engineered for dual-monitor setups with cable management channel',
    '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]
  )
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    product_type = EXCLUDED.product_type,
    base_length_ft = EXCLUDED.base_length_ft,
    base_width_ft = EXCLUDED.base_width_ft,
    base_height_ft = EXCLUDED.base_height_ft,
    allowed_top_categories = EXCLUDED.allowed_top_categories,
    is_knockdown_available = EXCLUDED.is_knockdown_available,
    warranty_text = EXCLUDED.warranty_text,
    main_image_url = EXCLUDED.main_image_url,
    hover_blueprint_img = EXCLUDED.hover_blueprint_img,
    is_active = EXCLUDED.is_active,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order,
    top_overlay_note = EXCLUDED.top_overlay_note,

    top_category_images = EXCLUDED.top_category_images,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO p_work;

  -- TABLE: Dining table
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft, base_height_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active, use_cases, material_tags,
    sort_order, top_overlay_note, top_category_images, gallery_images
  ) VALUES (
    'IMS-DN-63', 'Industrial Grade 6-Seater Dining Table (6x3 ft)',
    'Cafe & Dining Tables', 'TABLE', 6.0, 3.0, 2.5,
    '["FRAME_ONLY","WOOD","STONE"]'::jsonb,
    true, '10-Yr MIG Structural Warranty', '/images/hero-workstation.svg',
    '/images/hero-workstation.svg', true, ARRAY['HOME','CAFE','CANTEEN','BAKERY']::text[],
    ARRAY['MS','WOOD','GRANITE']::text[], 30,
    'Heavy-duty cross-braced frame supporting up to 200 Kg load',
    '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]
  )
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    product_type = EXCLUDED.product_type,
    base_length_ft = EXCLUDED.base_length_ft,
    base_width_ft = EXCLUDED.base_width_ft,
    base_height_ft = EXCLUDED.base_height_ft,
    allowed_top_categories = EXCLUDED.allowed_top_categories,
    is_knockdown_available = EXCLUDED.is_knockdown_available,
    warranty_text = EXCLUDED.warranty_text,
    main_image_url = EXCLUDED.main_image_url,
    hover_blueprint_img = EXCLUDED.hover_blueprint_img,
    is_active = EXCLUDED.is_active,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order,
    top_overlay_note = EXCLUDED.top_overlay_note,

    top_category_images = EXCLUDED.top_category_images,
    gallery_images = EXCLUDED.gallery_images
  RETURNING id INTO p_dine;

  -- CHAIR / STAND / RACK / SS_UNIT products
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft, base_height_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active, use_cases, material_tags,
    sort_order, top_overlay_note, top_category_images, gallery_images
  ) VALUES
    ('IMS-CH-01', 'Cafe Chair', 'SS & MS Chairs / Bar Stools', 'CHAIR', 1.5, 1.5, 2.5,
     '[]'::jsonb, true, '7-Year Weld Warranty',
     '/images/cat-chairs-stools.svg', NULL, true,
     ARRAY['CAFE','HOME','CANTEEN','HALL','SCHOOL']::text[], ARRAY['MS','SS','WOOD']::text[], 40, NULL,
     '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]),
    ('IMS-CH-BS', 'Bar Stool', 'SS & MS Chairs / Bar Stools', 'CHAIR', 1.4, 1.4, 2.5,
     '[]'::jsonb, true, '7-Year Weld Warranty',
     '/images/cat-chairs-stools.svg', NULL, true,
     ARRAY['CAFE','HOME','BAKERY','HALL']::text[], ARRAY['MS','SS']::text[], 41, NULL,
     '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]),
    ('IMS-ST-12', '12-inch Stool', 'Home Utility Stands', 'STAND', 1.0, 1.0, 1.5,
     '[]'::jsonb, false, '7-Year Weld Warranty',
     '/images/cat-utility-stands.svg', NULL, true,
     ARRAY['HOME','SCHOOL']::text[], ARRAY['MS','SS']::text[], 42, NULL,
     '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]),
    ('IMS-ST-INV', 'Inverter Stand', 'Home Utility Stands', 'STAND', 1.5, 1.0, 2.0,
     '[]'::jsonb, false, '7-Year Weld Warranty',
     '/images/cat-utility-stands.svg', NULL, true,
     ARRAY['HOME','SCHOOL']::text[], ARRAY['MS','SS']::text[], 43, NULL,
     '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]),
    ('IMS-ST-KD', 'Kadai Stand', 'Home Utility Stands', 'STAND', 1.2, 1.2, 1.5,
     '[]'::jsonb, false, '7-Year Weld Warranty',
     '/images/cat-utility-stands.svg', NULL, true,
     ARRAY['HOME']::text[], ARRAY['MS','SS']::text[], 44, NULL,
     '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]),
    ('IMS-RK-01', 'Boutique Garment Rack', 'Boutique & Showroom Racks', 'RACK', 4.0, 1.5, 6.0,
     '[]'::jsonb, false, '10-Year Structural Warranty',
     '/images/cat-boutique-racks.svg', NULL, true,
     ARRAY['HOME','OFFICE','HALL']::text[], ARRAY['MS']::text[], 45, NULL,
     '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[]),
    ('IMS-SS-CT', 'SS Canteen Table', 'Hospital, Canteen & Lab SS', 'SS_UNIT', 4.0, 2.0, 2.5,
     '[]'::jsonb, false, '15-Year Rust-Free Warranty',
     '/images/cat-hospital-lab.svg', NULL, true,
     ARRAY['HOSPITAL','CAFE','CANTEEN','SCHOOL']::text[], ARRAY['SS']::text[], 46, NULL,
     '{}'::jsonb, '{}'::jsonb, ARRAY[]::text[])
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    product_type = EXCLUDED.product_type,
    base_length_ft = EXCLUDED.base_length_ft,
    base_width_ft = EXCLUDED.base_width_ft,
    base_height_ft = EXCLUDED.base_height_ft,
    allowed_top_categories = EXCLUDED.allowed_top_categories,
    is_knockdown_available = EXCLUDED.is_knockdown_available,
    warranty_text = EXCLUDED.warranty_text,
    main_image_url = EXCLUDED.main_image_url,
    hover_blueprint_img = EXCLUDED.hover_blueprint_img,
    is_active = EXCLUDED.is_active,
    use_cases = EXCLUDED.use_cases,
    material_tags = EXCLUDED.material_tags,
    sort_order = EXCLUDED.sort_order,
    top_overlay_note = EXCLUDED.top_overlay_note,

    top_category_images = EXCLUDED.top_category_images,
    gallery_images = EXCLUDED.gallery_images;

  SELECT id INTO p_chair FROM products WHERE sku = 'IMS-CH-01';
  SELECT id INTO p_bar FROM products WHERE sku = 'IMS-CH-BS';
  SELECT id INTO p_st12 FROM products WHERE sku = 'IMS-ST-12';
  SELECT id INTO p_stinv FROM products WHERE sku = 'IMS-ST-INV';
  SELECT id INTO p_stkd FROM products WHERE sku = 'IMS-ST-KD';
  SELECT id INTO p_rack FROM products WHERE sku = 'IMS-RK-01';
  SELECT id INTO p_ss FROM products WHERE sku = 'IMS-SS-CT';

  -- PRIVATE PRICING RULES
  INSERT INTO product_pricing_rules (
    product_id, base_pipe_weight_18g_kg, top_area_sqft, consumables_cost, labor_cost,
    overhead_pct, retail_margin_pct, b2b_margin_pct, finishing_cost, b2b_moq
  ) VALUES
    (p_cafe, 14.50, 8.00, 350.00, 450.00, 12.00, 28.00, 16.00, 0.00, 1),
    (p_work, 18.20, 10.00, 420.00, 550.00, 12.00, 30.00, 18.00, 0.00, 1),
    (p_dine, 27.80, 18.00, 650.00, 800.00, 12.00, 32.00, 20.00, 0.00, 1),
    (p_chair, 4.50, 2.25, 120.00, 180.00, 12.00, 35.00, 20.00, 0.00, 1),
    (p_bar, 5.20, 2.00, 140.00, 210.00, 12.00, 35.00, 20.00, 0.00, 1),
    (p_st12, 2.50, 0.00, 60.00, 100.00, 12.00, 38.00, 22.00, 0.00, 1),
    (p_stinv, 4.00, 0.00, 90.00, 140.00, 12.00, 38.00, 22.00, 0.00, 1),
    (p_stkd, 3.20, 0.00, 80.00, 120.00, 12.00, 38.00, 22.00, 0.00, 1),
    (p_rack, 8.50, 6.00, 180.00, 300.00, 12.00, 35.00, 20.00, 0.00, 1),
    (p_ss, 14.00, 0.00, 300.00, 450.00, 12.00, 32.00, 18.00, 0.00, 1)
  ON CONFLICT (product_id) DO UPDATE SET
    base_pipe_weight_18g_kg = EXCLUDED.base_pipe_weight_18g_kg,
    top_area_sqft = EXCLUDED.top_area_sqft,
    consumables_cost = EXCLUDED.consumables_cost,
    labor_cost = EXCLUDED.labor_cost,
    overhead_pct = EXCLUDED.overhead_pct,
    retail_margin_pct = EXCLUDED.retail_margin_pct,
    b2b_margin_pct = EXCLUDED.b2b_margin_pct,
    finishing_cost = EXCLUDED.finishing_cost,
    b2b_moq = EXCLUDED.b2b_moq;

  -- VISUAL VARIANTS (Clean delete by selection_key prefix for idempotency)
  DELETE FROM product_visual_variants
  WHERE selection_key IN (
    'SEED-CF-1', 'SEED-CF-2', 'SEED-CF-3',
    'SEED-WS-1', 'SEED-WS-2', 'SEED-WS-3',
    'SEED-DN-1', 'SEED-DN-2', 'SEED-DN-3',
    'SEED-CH-1', 'SEED-CH-2', 'SEED-CH-3',
    'SEED-BS-1', 'SEED-BS-2',
    'SEED-ST12-1', 'SEED-ST12-2',
    'SEED-STINV-1', 'SEED-STKD-1',
    'SEED-RK-1', 'SEED-RK-2',
    'SEED-SS-1', 'SEED-SS-2'
  );

  INSERT INTO product_visual_variants (
    product_id, top_material_code, frame_color, preview_image_url,
    size_option, size_multiplier, selection_key
  ) VALUES
    (p_cafe, 'RUBBER_HONEY_TEAK', 'MATTE_BLACK', '/images/cat-dining-tables.svg', '4x2', 1.0, 'SEED-CF-1'),
    (p_cafe, 'GRANITE_JET_BLACK_OPT', 'MATTE_BLACK', '/images/cat-dining-tables.svg', '4x2', 1.0, 'SEED-CF-2'),
    (p_cafe, 'RUBBER_HONEY_TEAK', 'WHITE', '/images/cat-dining-tables.svg', '4x2', 1.0, 'SEED-CF-3'),
    (p_work, 'RUBBER_HONEY_TEAK', 'MATTE_BLACK', '/images/cat-workstations.svg', '4x2.5', 1.0, 'SEED-WS-1'),
    (p_work, 'PRELAM_WHITE', 'GREY', '/images/cat-workstations.svg', '4x2.5', 1.0, 'SEED-WS-2'),
    (p_work, 'PRELAM_CARBON_BLACK', 'WHITE', '/images/cat-workstations.svg', '4x2.5', 1.0, 'SEED-WS-3'),
    (p_dine, 'RUBBER_HONEY_TEAK', 'MATTE_BLACK', '/images/hero-workstation.svg', '6x3', 1.0, 'SEED-DN-1'),
    (p_dine, 'GRANITE_JET_BLACK_OPT', 'MATTE_BLACK', '/images/hero-workstation.svg', '6x3', 1.0, 'SEED-DN-2'),
    (p_dine, 'GRANITE_KWHITE_OPT', 'WHITE', '/images/hero-workstation.svg', '6x3', 1.0, 'SEED-DN-3'),
    (p_chair, 'SEAT_RUBBER', 'MATTE_BLACK', '/images/cat-chairs-stools.svg', 'STD', 1.00, 'SEED-CH-1'),
    (p_chair, 'SEAT_REXINE', 'MATTE_BLACK', '/images/cat-chairs-stools.svg', 'STD', 1.00, 'SEED-CH-2'),
    (p_chair, 'SEAT_RUBBER', 'SS', '/images/cat-chairs-stools.svg', 'STD', 1.00, 'SEED-CH-3'),
    (p_bar, 'SEAT_RUBBER', 'MATTE_BLACK', '/images/cat-chairs-stools.svg', 'STD', 1.00, 'SEED-BS-1'),
    (p_bar, 'SEAT_PERFORATED', 'SS', '/images/cat-chairs-stools.svg', 'STD', 1.00, 'SEED-BS-2'),
    (p_st12, 'ST_MS', 'MATTE_BLACK', '/images/cat-utility-stands.svg', 'STD', 1.00, 'SEED-ST12-1'),
    (p_st12, 'ST_SS304', 'SS', '/images/cat-utility-stands.svg', 'STD', 1.00, 'SEED-ST12-2'),
    (p_stinv, 'ST_MS', 'MATTE_BLACK', '/images/cat-utility-stands.svg', 'STD', 1.00, 'SEED-STINV-1'),
    (p_stkd, 'ST_MS', 'MATTE_BLACK', '/images/cat-utility-stands.svg', 'STD', 1.00, 'SEED-STKD-1'),
    (p_rack, 'SH_NONE', 'MATTE_BLACK', '/images/cat-boutique-racks.svg', 'R4', 1.00, 'SEED-RK-1'),
    (p_rack, 'SH_RUBBER', 'GOLD', '/images/cat-boutique-racks.svg', 'R6', 1.50, 'SEED-RK-2'),
    (p_ss, 'SSG_202', 'SS', '/images/cat-hospital-lab.svg', 'STD', 1.00, 'SEED-SS-1'),
    (p_ss, 'SSG_304', 'SS', '/images/cat-hospital-lab.svg', 'STD', 1.00, 'SEED-SS-2');
END $$;
