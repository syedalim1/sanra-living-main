-- ==============================================================================
-- SANRA LIVING | Product types: CHAIR, STAND, RACK, SS_UNIT
-- Database Migration: 005_product_types.sql
-- ==============================================================================

-- 1. ALLOW THE NEW OPTION GROUPS
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.configurator_options'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%option_group%'
  LOOP
    EXECUTE format('ALTER TABLE public.configurator_options DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.configurator_options
  ADD CONSTRAINT configurator_options_option_group_check
  CHECK (
    option_group IN (
      'TOP_TAB', 'TOP_MATERIAL', 'GAUGE', 'FRAME_COLOR', 'BUILD_TYPE', 'SIZE', 'ADDON', 'QTY_TIER',
      'METAL_TYPE', 'SEAT', 'SEAT_COLOR', 'STAND_MATERIAL', 'PACK', 'BASE',
      'FINISH', 'SHELF', 'RACK_SIZE', 'GRADE', 'THICKNESS', 'SS_FINISH'
    )
  );

-- 2. PUBLIC MAPPING: WHICH SELECTOR GROUPS BELONG TO EACH PRODUCT TYPE
CREATE TABLE IF NOT EXISTS product_type_option_groups (
  product_type TEXT NOT NULL CHECK (
    product_type IN ('TABLE', 'CHAIR', 'STAND', 'RACK', 'SS_UNIT')
  ),
  option_group TEXT NOT NULL,
  group_title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  is_required BOOLEAN NOT NULL DEFAULT false,
  default_code TEXT NULL,
  PRIMARY KEY (product_type, option_group)
);

ALTER TABLE product_type_option_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product type option groups" ON product_type_option_groups;
CREATE POLICY "Public read product type option groups"
  ON product_type_option_groups
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO product_type_option_groups
  (product_type, option_group, group_title, sort_order, is_required, default_code)
VALUES
  -- TABLE (behavior unchanged)
  ('TABLE', 'TOP_TAB', 'Top surface', 10, true, 'WOOD'),
  ('TABLE', 'TOP_MATERIAL', 'Top material', 20, false, 'RUBBER_HONEY_TEAK'),
  ('TABLE', 'GAUGE', 'Structural steel gauge', 30, true, 'G16'),
  ('TABLE', 'FRAME_COLOR', 'Frame color', 40, true, 'MATTE_BLACK'),
  ('TABLE', 'SIZE', 'Frame size', 50, true, '4x2'),
  ('TABLE', 'BUILD_TYPE', 'Delivery & assembly', 60, true, 'WELDED'),
  ('TABLE', 'ADDON', 'Optional add-ons', 70, false, NULL),
  ('TABLE', 'QTY_TIER', 'Quantity', 80, false, NULL),

  -- CHAIR
  ('CHAIR', 'METAL_TYPE', 'Metal type', 10, true, 'MS_COATED'),
  ('CHAIR', 'SEAT', 'Seat', 20, true, 'SEAT_RUBBER'),
  ('CHAIR', 'SEAT_COLOR', 'Seat color', 30, false, 'REXINE_BLACK'),
  ('CHAIR', 'FRAME_COLOR', 'Frame color', 40, false, 'MATTE_BLACK'),
  ('CHAIR', 'BUILD_TYPE', 'Delivery & assembly', 50, true, 'WELDED'),
  ('CHAIR', 'QTY_TIER', 'Quantity', 60, false, NULL),

  -- STAND
  ('STAND', 'STAND_MATERIAL', 'Material', 10, true, 'ST_MS'),
  ('STAND', 'PACK', 'Pack size', 20, true, 'PACK_1'),
  ('STAND', 'BASE', 'Base type', 30, true, 'BASE_BUSH'),
  ('STAND', 'QTY_TIER', 'Quantity', 40, false, NULL),

  -- RACK
  ('RACK', 'FINISH', 'Finish', 10, true, 'RF_BLACK'),
  ('RACK', 'SHELF', 'Bottom shelf', 20, true, 'SH_NONE'),
  ('RACK', 'RACK_SIZE', 'Height & length', 30, true, 'R4'),
  ('RACK', 'QTY_TIER', 'Quantity', 40, false, NULL),

  -- SS_UNIT
  ('SS_UNIT', 'GRADE', 'Stainless grade', 10, true, 'SSG_202'),
  ('SS_UNIT', 'THICKNESS', 'Top thickness', 20, true, 'TH_18G'),
  ('SS_UNIT', 'SS_FINISH', 'Finish', 30, true, 'SSF_HAIRLINE'),
  ('SS_UNIT', 'QTY_TIER', 'Quantity', 40, false, NULL)
ON CONFLICT (product_type, option_group) DO UPDATE SET
  group_title = EXCLUDED.group_title,
  sort_order = EXCLUDED.sort_order,
  is_required = EXCLUDED.is_required,
  default_code = EXCLUDED.default_code;

-- 3. SELECTION KEY FOR NON-TABLE PREVIEW IMAGES
ALTER TABLE public.product_visual_variants
  ADD COLUMN IF NOT EXISTS selection_key TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_visual_variants_product_selection_key_idx
  ON public.product_visual_variants (product_id, selection_key)
  WHERE selection_key IS NOT NULL;

-- 4. PACK-OF-2 SAVING
INSERT INTO pricing_globals (key, numeric_value, description)
VALUES ('PACK2_SAVING', 150.00, 'Pack of 2 nesting combo saving')
ON CONFLICT (key) DO NOTHING;

-- 5. CHAIR OPTIONS
INSERT INTO configurator_options
  (option_group, option_code, parent_code, label_en, group_label, swatch_color_hex, load_kg, warranty_text, badge_text, spec_note, sort_order)
VALUES
  ('METAL_TYPE', 'MS_COATED', NULL, 'MS Powder Coated (Tata/Apollo CR)', NULL, '#111111', NULL, '7 Years Weld Warranty', NULL, 'Durable powder-coated MS frame', 1),
  ('METAL_TYPE', 'SS202', NULL, 'Jindal SS 202 (Indoor Luxury)', NULL, '#D1D1D6', NULL, '10 Years Weld Warranty', 'Indoor Luxury', 'Indoor stainless styling', 2),
  ('METAL_TYPE', 'SS304', NULL, 'Jindal SS 304 (100% Rust-Proof + Argon TIG)', NULL, '#E5E5EA', NULL, '3-Year Free Replacement + 15 Years Rust-Free Warranty', 'Rust-Proof', 'Food and sanitary grade', 3),

  ('SEAT', 'SEAT_RUBBER', NULL, 'Solid Kerala Rubberwood Seat (100% Seasoned Grade-A)', NULL, '#C29B38', NULL, NULL, NULL, '100% seasoned Grade-A rubberwood', 1),
  ('SEAT', 'SEAT_REXINE', NULL, '40-Density Cushion Seat with Rexine', NULL, '#222222', NULL, NULL, NULL, 'Cushioned comfort seat', 2),
  ('SEAT', 'SEAT_PERFORATED', NULL, 'Perforated Metal Seat', NULL, '#334155', NULL, NULL, NULL, 'Ventilated industrial steel seat', 3),

  ('SEAT_COLOR', 'REXINE_BLACK', NULL, 'Black', NULL, '#111111', NULL, NULL, NULL, NULL, 1),
  ('SEAT_COLOR', 'REXINE_TAN', NULL, 'Tan Brown', NULL, '#8B5E3C', NULL, NULL, NULL, NULL, 2),
  ('SEAT_COLOR', 'REXINE_CHERRY', NULL, 'Cherry Red', NULL, '#7F1D1D', NULL, NULL, NULL, NULL, 3),

  -- 6. STAND OPTIONS
  ('STAND_MATERIAL', 'ST_MS', NULL, '18G MS Matte Black', NULL, '#111111', NULL, NULL, NULL, 'Powder-coated mild steel', 1),
  ('STAND_MATERIAL', 'ST_SS304', NULL, 'Jindal SS 304', NULL, '#E5E5EA', NULL, NULL, 'Rust-Proof', 'Rust-proof stainless steel', 2),
  ('PACK', 'PACK_1', NULL, 'Single Pack', NULL, NULL, NULL, NULL, NULL, 'One complete stand', 1),
  ('PACK', 'PACK_2', NULL, 'Pack of 2 Nesting Combo (Save ₹150!)', NULL, NULL, NULL, NULL, 'Save ₹150', 'Two stands, nesting space-saving design', 2),
  ('BASE', 'BASE_BUSH', NULL, 'Heavy Leveling Bush', NULL, NULL, NULL, NULL, NULL, 'Stable leveling feet', 1),
  ('BASE', 'BASE_CASTOR', NULL, 'Lockable Castor Wheels', NULL, NULL, NULL, NULL, NULL, 'Easy to move and lock in place', 2),

  -- 7. RACK OPTIONS
  ('FINISH', 'RF_BLACK', NULL, 'Matte Black', NULL, '#111111', NULL, NULL, NULL, 'Powder-coated matte black', 1),
  ('FINISH', 'RF_GOLD_PAINT', NULL, 'Metallic Gold Paint', NULL, '#D4AF37', NULL, NULL, NULL, 'Metallic gold paint finish', 2),
  ('FINISH', 'RF_GOLD_PVD', NULL, 'Rose-Gold / Gold PVD SS', NULL, '#B76E79', NULL, NULL, NULL, 'PVD stainless finish', 3),
  ('SHELF', 'SH_NONE', NULL, 'No Shelf', NULL, NULL, NULL, NULL, NULL, 'Open frame', 1),
  ('SHELF', 'SH_RUBBER', NULL, 'Rubberwood Shelf', NULL, '#C29B38', NULL, NULL, NULL, 'Solid Kerala rubberwood', 2),
  ('SHELF', 'SH_PRELAM_WHITE', NULL, 'Pre-Lam White Shelf', NULL, '#F8FAFC', NULL, NULL, NULL, 'White engineered board', 3),
  ('SHELF', 'SH_PRELAM_BLACK', NULL, 'Pre-Lam Black Shelf', NULL, '#1E293B', NULL, NULL, NULL, 'Black engineered board', 4),
  ('RACK_SIZE', 'R4', NULL, '4 ft', NULL, NULL, NULL, NULL, NULL, 'Compact height & length', 1),
  ('RACK_SIZE', 'R5', NULL, '5 ft', NULL, NULL, NULL, NULL, NULL, 'Mid height & length', 2),
  ('RACK_SIZE', 'R6', NULL, '6 ft', NULL, NULL, NULL, NULL, NULL, 'Full height & length', 3),

  -- 8. SS_UNIT OPTIONS
  ('GRADE', 'SSG_202', NULL, 'Jindal SS 202 (Indoor)', NULL, '#D1D1D6', NULL, NULL, NULL, 'Indoor stainless grade', 1),
  ('GRADE', 'SSG_304', NULL, 'Jindal SS 304 (Medical / Food Grade)', NULL, '#E5E5EA', NULL, NULL, 'Medical / Food Grade', 'Medical and food-grade stainless', 2),
  ('THICKNESS', 'TH_18G', NULL, '18G Top', NULL, NULL, NULL, NULL, NULL, 'Standard top thickness', 1),
  ('THICKNESS', 'TH_16G', NULL, '16G Top (Heavier)', NULL, NULL, NULL, NULL, NULL, 'Heavier top thickness', 2),
  ('SS_FINISH', 'SSF_HAIRLINE', NULL, 'Matt Hairline', NULL, '#C7CBD1', NULL, NULL, NULL, 'Easy-clean matt finish', 1),
  ('SS_FINISH', 'SSF_MIRROR', NULL, 'Mirror Buffed', NULL, '#E5E7EB', NULL, NULL, NULL, 'Mirror-buffed finish', 2)
ON CONFLICT (option_code) DO NOTHING;

-- 9. OPTION PRICING (PRIVATE)
INSERT INTO option_pricing (option_code, material_code, metal_cost_multiplier, flat_addon, per_sqft_addon)
VALUES
  ('MS_COATED', 'MS_CR', 1.000, 0.00, 0.00),
  ('SS202', 'SS_202', 1.000, 0.00, 0.00),
  ('SS304', 'SS_304', 1.000, 0.00, 0.00),
  ('SEAT_RUBBER', 'WOOD_RUBBER_18', 1.000, 0.00, 0.00),
  ('SEAT_REXINE', NULL, 1.000, 0.00, 0.00),
  ('SEAT_PERFORATED', 'SHEET_PERFORATED', 1.000, 0.00, 0.00),
  ('REXINE_BLACK', NULL, 1.000, 0.00, 0.00),
  ('REXINE_TAN', NULL, 1.000, 0.00, 0.00),
  ('REXINE_CHERRY', NULL, 1.000, 0.00, 0.00),
  ('ST_MS', 'MS_CR', 1.000, 0.00, 0.00),
  ('ST_SS304', 'SS_304', 1.000, 0.00, 0.00),
  ('PACK_1', NULL, 1.000, 0.00, 0.00),
  ('PACK_2', NULL, 1.000, 0.00, 0.00),
  ('BASE_BUSH', NULL, 1.000, 0.00, 0.00),
  ('BASE_CASTOR', NULL, 1.000, 350.00, 0.00),
  ('RF_BLACK', NULL, 1.000, 0.00, 0.00),
  ('RF_GOLD_PAINT', NULL, 1.000, 450.00, 0.00),
  ('RF_GOLD_PVD', NULL, 1.000, 900.00, 0.00),
  ('SH_NONE', NULL, 1.000, 0.00, 0.00),
  ('SH_RUBBER', 'WOOD_RUBBER_18', 1.000, 0.00, 0.00),
  ('SH_PRELAM_WHITE', 'PRELAM_18', 1.000, 0.00, 0.00),
  ('SH_PRELAM_BLACK', 'PRELAM_18', 1.000, 0.00, 0.00),
  ('R4', NULL, 1.000, 0.00, 0.00),
  ('R5', NULL, 1.250, 0.00, 0.00),
  ('R6', NULL, 1.500, 0.00, 0.00),
  ('SSG_202', 'SS_202', 1.000, 0.00, 0.00),
  ('SSG_304', 'SS_304', 1.000, 0.00, 0.00),
  ('TH_18G', NULL, 1.000, 0.00, 0.00),
  ('TH_16G', NULL, 1.280, 0.00, 0.00),
  ('SSF_HAIRLINE', NULL, 1.000, 0.00, 0.00),
  ('SSF_MIRROR', NULL, 1.000, 350.00, 0.00)
ON CONFLICT (option_code) DO NOTHING;

-- 10. SAMPLE PRODUCTS
-- Reuse note: product_pricing_rules.base_pipe_weight_18g_kg is the metal weight for ALL
-- product types. top_area_sqft is the table top area for TABLE, the seat area for CHAIR,
-- and the shelf area for RACK. Stands and SS units leave top_area_sqft at 0.
DO $$
DECLARE
  v_chair_cafe UUID;
  v_chair_bar UUID;
  v_stand_12 UUID;
  v_stand_inv UUID;
  v_stand_kadai UUID;
  v_rack UUID;
  v_ss_unit UUID;
BEGIN
  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  ) VALUES (
    'IMS-CH-01', 'Cafe Chair', 'SS & MS Chairs / Bar Stools', 'CHAIR', 1.5, 1.5,
    '[]'::jsonb, true, '7-Year Weld Warranty',
    '/images/placeholder-chair.svg', NULL, true,
    ARRAY['CAFE','HOME'], ARRAY['MS','SS','WOOD'], 40, NULL
  )
  ON CONFLICT (sku) DO UPDATE SET sku = EXCLUDED.sku
  RETURNING id INTO v_chair_cafe;

  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  ) VALUES (
    'IMS-CH-BS', 'Bar Stool', 'SS & MS Chairs / Bar Stools', 'CHAIR', 1.4, 1.4,
    '[]'::jsonb, true, '7-Year Weld Warranty',
    '/images/placeholder-chair.svg', NULL, true,
    ARRAY['CAFE','HOME'], ARRAY['MS','SS'], 41, NULL
  )
  ON CONFLICT (sku) DO UPDATE SET sku = EXCLUDED.sku
  RETURNING id INTO v_chair_bar;

  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  ) VALUES (
    'IMS-ST-12', '12-inch Stool', 'Home Utility Stands', 'STAND', 1.0, 1.0,
    '[]'::jsonb, false, '7-Year Weld Warranty',
    '/images/placeholder-stand.svg', NULL, true,
    ARRAY['HOME'], ARRAY['MS','SS'], 42, NULL
  )
  ON CONFLICT (sku) DO UPDATE SET sku = EXCLUDED.sku
  RETURNING id INTO v_stand_12;

  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  ) VALUES (
    'IMS-ST-INV', 'Inverter Stand', 'Home Utility Stands', 'STAND', 1.5, 1.0,
    '[]'::jsonb, false, '7-Year Weld Warranty',
    '/images/placeholder-stand.svg', NULL, true,
    ARRAY['HOME'], ARRAY['MS','SS'], 43, NULL
  )
  ON CONFLICT (sku) DO UPDATE SET sku = EXCLUDED.sku
  RETURNING id INTO v_stand_inv;

  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  ) VALUES (
    'IMS-ST-KD', 'Kadai Stand', 'Home Utility Stands', 'STAND', 1.2, 1.2,
    '[]'::jsonb, false, '7-Year Weld Warranty',
    '/images/placeholder-stand.svg', NULL, true,
    ARRAY['HOME'], ARRAY['MS','SS'], 44, NULL
  )
  ON CONFLICT (sku) DO UPDATE SET sku = EXCLUDED.sku
  RETURNING id INTO v_stand_kadai;

  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  ) VALUES (
    'IMS-RK-01', 'Boutique Garment Rack', 'Boutique & Showroom Racks', 'RACK', 4.0, 1.5,
    '[]'::jsonb, false, '10-Year Structural Warranty',
    '/images/placeholder-rack.svg', NULL, true,
    ARRAY['HOME','OFFICE'], ARRAY['MS'], 45, NULL
  )
  ON CONFLICT (sku) DO UPDATE SET sku = EXCLUDED.sku
  RETURNING id INTO v_rack;

  INSERT INTO products (
    sku, name, category, product_type, base_length_ft, base_width_ft,
    allowed_top_categories, is_knockdown_available, warranty_text,
    main_image_url, hover_blueprint_img, is_active,
    use_cases, material_tags, sort_order, top_overlay_note
  ) VALUES (
    'IMS-SS-CT', 'SS Canteen Table', 'Hospital, Canteen & Lab SS', 'SS_UNIT', 4.0, 2.0,
    '[]'::jsonb, false, '15-Year Rust-Free Warranty',
    '/images/placeholder-ss.svg', NULL, true,
    ARRAY['HOSPITAL','CAFE'], ARRAY['SS'], 46, NULL
  )
  ON CONFLICT (sku) DO UPDATE SET sku = EXCLUDED.sku
  RETURNING id INTO v_ss_unit;

  INSERT INTO product_pricing_rules (
    product_id, base_pipe_weight_18g_kg, top_area_sqft, consumables_cost,
    labor_cost, overhead_pct, retail_margin_pct, b2b_margin_pct
  ) VALUES
    (v_chair_cafe, 4.50, 2.25, 120.00, 180.00, 12.00, 35.00, 20.00),
    (v_chair_bar, 5.20, 2.00, 140.00, 210.00, 12.00, 35.00, 20.00),
    (v_stand_12, 2.50, 0.00, 60.00, 100.00, 12.00, 38.00, 22.00),
    (v_stand_inv, 4.00, 0.00, 90.00, 140.00, 12.00, 38.00, 22.00),
    (v_stand_kadai, 3.20, 0.00, 80.00, 120.00, 12.00, 38.00, 22.00),
    (v_rack, 8.50, 6.00, 180.00, 300.00, 12.00, 35.00, 20.00),
    (v_ss_unit, 14.00, 0.00, 300.00, 450.00, 12.00, 32.00, 18.00)
  ON CONFLICT (product_id) DO NOTHING;

  INSERT INTO product_visual_variants (
    product_id, top_material_code, frame_color, preview_image_url,
    size_option, size_multiplier, selection_key
  ) VALUES
    (v_chair_cafe, 'SEAT_RUBBER', 'MATTE_BLACK', '/images/placeholder-chair.svg', 'STD', 1.00, 'SEAT_RUBBER||MS_COATED|MATTE_BLACK'),
    (v_chair_cafe, 'SEAT_REXINE', 'MATTE_BLACK', '/images/placeholder-chair.svg', 'STD', 1.00, 'SEAT_REXINE|REXINE_TAN|MS_COATED|MATTE_BLACK'),
    (v_chair_cafe, 'SEAT_RUBBER', 'SS', '/images/placeholder-chair.svg', 'STD', 1.00, 'SEAT_RUBBER||SS304|'),
    (v_chair_bar, 'SEAT_RUBBER', 'MATTE_BLACK', '/images/placeholder-chair.svg', 'STD', 1.00, 'SEAT_RUBBER||MS_COATED|MATTE_BLACK'),
    (v_chair_bar, 'SEAT_PERFORATED', 'SS', '/images/placeholder-chair.svg', 'STD', 1.00, 'SEAT_PERFORATED||SS202|'),
    (v_stand_12, 'ST_MS', 'MATTE_BLACK', '/images/placeholder-stand.svg', 'STD', 1.00, 'ST_MS|PACK_1|BASE_BUSH'),
    (v_stand_12, 'ST_SS304', 'SS', '/images/placeholder-stand.svg', 'STD', 1.00, 'ST_SS304|PACK_2|BASE_CASTOR'),
    (v_stand_inv, 'ST_MS', 'MATTE_BLACK', '/images/placeholder-stand.svg', 'STD', 1.00, 'ST_MS|PACK_1|BASE_BUSH'),
    (v_stand_kadai, 'ST_MS', 'MATTE_BLACK', '/images/placeholder-stand.svg', 'STD', 1.00, 'ST_MS|PACK_1|BASE_BUSH'),
    (v_rack, 'SH_NONE', 'MATTE_BLACK', '/images/placeholder-rack.svg', 'R4', 1.00, 'RF_BLACK|SH_NONE|R4'),
    (v_rack, 'SH_RUBBER', 'GOLD', '/images/placeholder-rack.svg', 'R6', 1.50, 'RF_GOLD_PVD|SH_RUBBER|R6'),
    (v_ss_unit, 'SSG_202', 'SS', '/images/placeholder-ss.svg', 'STD', 1.00, 'SSG_202|TH_18G|SSF_HAIRLINE'),
    (v_ss_unit, 'SSG_304', 'SS', '/images/placeholder-ss.svg', 'STD', 1.00, 'SSG_304|TH_16G|SSF_MIRROR')
  ON CONFLICT DO NOTHING;
END $$;
