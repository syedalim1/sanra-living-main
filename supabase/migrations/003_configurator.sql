-- ==============================================================================
-- SANRA LIVING | Indian Make Steel Industries - SIDCO Coimbatore
-- Database Migration: 003_configurator.sql
-- ==============================================================================

-- 1. ADD NEW MATERIAL RATES (PLACEHOLDER COSTS, UNIT SQFT)
INSERT INTO material_rates (material_code, display_name, category, unit, cost_per_unit, swatch_color_hex, swatch_texture_img)
VALUES
  ('GRANITE_TAN_BROWN', 'Tan Brown Granite (18mm Krishnagiri)', 'STONE', 'SQFT', 195.00, '#4A3525', NULL),
  ('WPC_OUTDOOR', 'Outdoor WPC Solid Planks (100% Waterproof)', 'WOOD', 'SQFT', 220.00, '#5C4033', NULL),
  ('SHEET_PERFORATED', 'Perforated Industrial Steel Sheet Top', 'METAL', 'SQFT', 145.00, '#333333', NULL),
  ('SHEET_MESH', 'Expanded Diamond Steel Mesh Top', 'METAL', 'SQFT', 130.00, '#444444', NULL),
  ('SHEET_CR_16G', '16-Gauge Solid CR Steel Sheet Top', 'METAL', 'SQFT', 180.00, '#222222', NULL),
  ('SHEET_SS304', 'Jindal SS 304 Food-Grade Stainless Sheet Top', 'METAL', 'SQFT', 380.00, '#E0E0E0', NULL)
ON CONFLICT (material_code) DO NOTHING;

-- 2. CREATE PUBLIC TABLE: configurator_options (PUBLIC SELECT ONLY, NO COST DATA)
CREATE TABLE IF NOT EXISTS configurator_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group TEXT NOT NULL CHECK (
    option_group IN ('TOP_TAB', 'TOP_MATERIAL', 'GAUGE', 'FRAME_COLOR', 'BUILD_TYPE', 'SIZE', 'ADDON', 'QTY_TIER')
  ),
  option_code TEXT NOT NULL UNIQUE,
  parent_code TEXT, -- for sub-groups or hierarchical linkage
  label_en TEXT NOT NULL,
  group_label TEXT, -- for sub-headings like "Solid Kerala Rubberwood (18mm Finger-Jointed)"
  swatch_color_hex TEXT,
  swatch_texture_img TEXT,
  spec_note TEXT,
  load_kg INT,
  warranty_text TEXT,
  badge_text TEXT,
  sort_order INT DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE configurator_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read configurator options" ON configurator_options;
CREATE POLICY "Public read configurator options"
  ON configurator_options
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- 3. CREATE PRIVATE TABLE: option_pricing (RLS ENABLED, NO POLICY FOR ANON/AUTHENTICATED)
CREATE TABLE IF NOT EXISTS option_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_code TEXT NOT NULL UNIQUE REFERENCES configurator_options(option_code) ON DELETE CASCADE,
  material_code TEXT REFERENCES material_rates(material_code) ON DELETE SET NULL,
  metal_cost_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 1.000,
  flat_addon NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  per_sqft_addon NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE option_pricing ENABLE ROW LEVEL SECURITY;
-- No policies created for anon/authenticated (strictly service-role only)

-- 4. CREATE PRIVATE TABLE: pricing_globals (RLS ENABLED, NO PUBLIC POLICY)
CREATE TABLE IF NOT EXISTS pricing_globals (
  key TEXT PRIMARY KEY,
  numeric_value NUMERIC(12, 4) NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE pricing_globals ENABLE ROW LEVEL SECURITY;
-- No policies created for anon/authenticated (strictly service-role only)

-- Seed pricing globals
INSERT INTO pricing_globals (key, numeric_value, description)
VALUES
  ('BUMPER_RATE_PER_FT', 65.00, 'Protective steel bumper rate per perimeter foot'),
  ('CENTER_SUPPORT_FLAT', 280.00, 'Center cross-support structural tube flat cost'),
  ('KNOCKDOWN_PRICE_PCT', 0.00, 'Flat-pack knock-down hardware adjustment pct (0% neutral)'),
  ('QTY_DISCOUNT_4_9_PCT', 5.00, 'Small business quantity discount pct (4 to 9 units)'),
  ('QTY_DISCOUNT_10_PLUS_PCT', 12.00, 'B2B factory wholesale quantity discount pct (10+ units)'),
  ('SS_WEIGHT_FACTOR', 1.05, 'Stainless steel density & fabrication weight factor')
ON CONFLICT (key) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  updated_at = timezone('utc'::text, now());

-- 5. ADD top_overlay_note TO products TABLE
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS top_overlay_note TEXT NULL;

-- 6. SEED configurator_options AND option_pricing
-- A. TOP_TAB (4)
INSERT INTO configurator_options (option_group, option_code, parent_code, label_en, sort_order)
VALUES
  ('TOP_TAB', 'FRAME_ONLY', NULL, 'Frame Only', 10),
  ('TOP_TAB', 'WOOD', NULL, 'Wood Tops', 20),
  ('TOP_TAB', 'STONE', NULL, 'Granite & Marble Tops', 30),
  ('TOP_TAB', 'METAL', NULL, 'Industrial Metal Top', 40)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, material_code, metal_cost_multiplier, flat_addon, per_sqft_addon)
VALUES
  ('FRAME_ONLY', NULL, 1.000, 0.00, 0.00),
  ('WOOD', NULL, 1.000, 0.00, 0.00),
  ('STONE', NULL, 1.000, 0.00, 0.00),
  ('METAL', NULL, 1.000, 0.00, 0.00)
ON CONFLICT (option_code) DO NOTHING;

-- B. TOP_MATERIAL under WOOD
INSERT INTO configurator_options (option_group, option_code, parent_code, label_en, group_label, swatch_color_hex, sort_order)
VALUES
  -- Solid Kerala Rubberwood (18mm Finger-Jointed) -> WOOD_RUBBER_18
  ('TOP_MATERIAL', 'RUBBER_HONEY_TEAK', 'WOOD', 'Natural Honey Teak Polish', 'Solid Kerala Rubberwood (18mm Finger-Jointed)', '#C28B38', 101),
  ('TOP_MATERIAL', 'RUBBER_DARK_WALNUT', 'WOOD', 'Dark Walnut Luxury Polish', 'Solid Kerala Rubberwood (18mm Finger-Jointed)', '#4A2A18', 102),
  ('TOP_MATERIAL', 'RUBBER_CLEAR_MATTE', 'WOOD', 'Clear Matte Natural Wood', 'Solid Kerala Rubberwood (18mm Finger-Jointed)', '#D8BA84', 103),

  -- IT Office Pre-Lam Board (25mm + 2mm PVC Edge) -> PRELAM_25
  ('TOP_MATERIAL', 'PRELAM_WHITE', 'WOOD', 'Frosty Corporate White', 'IT Office Pre-Lam Board (25mm + 2mm PVC Edge)', '#F8FAFC', 104),
  ('TOP_MATERIAL', 'PRELAM_CARBON_BLACK', 'WOOD', 'Matte Carbon Black', 'IT Office Pre-Lam Board (25mm + 2mm PVC Edge)', '#1E293B', 105),
  ('TOP_MATERIAL', 'PRELAM_LIGHT_OAK', 'WOOD', 'Light Oak Woodgrain', 'IT Office Pre-Lam Board (25mm + 2mm PVC Edge)', '#D4B996', 106),
  ('TOP_MATERIAL', 'PRELAM_COLUMBIA_WALNUT', 'WOOD', 'Columbia Dark Walnut', 'IT Office Pre-Lam Board (25mm + 2mm PVC Edge)', '#5D4037', 107),

  -- BWR Waterproof Plywood (18mm + 1mm Scratch-Proof Mica) -> BWR_PLY_MICA
  ('TOP_MATERIAL', 'BWR_WARM_TEAK', 'WOOD', 'Cafe Warm Teak Mica', 'BWR Waterproof Plywood (18mm + 1mm Scratch-Proof Mica)', '#9E6B40', 108),
  ('TOP_MATERIAL', 'BWR_CONCRETE_GREY', 'WOOD', 'Concrete Loft Grey Mica', 'BWR Waterproof Plywood (18mm + 1mm Scratch-Proof Mica)', '#78909C', 109),

  -- Outdoor WPC Solid Planks (100% Waterproof) -> WPC_OUTDOOR
  ('TOP_MATERIAL', 'WPC_TEAK_BROWN', 'WOOD', 'Weatherproof Teak Brown', 'Outdoor WPC Solid Planks (100% Waterproof)', '#5C4033', 110),
  ('TOP_MATERIAL', 'WPC_CHARCOAL_GREY', 'WOOD', 'Charcoal Grey', 'Outdoor WPC Solid Planks (100% Waterproof)', '#2F3538', 111)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, material_code, metal_cost_multiplier, flat_addon, per_sqft_addon)
VALUES
  ('RUBBER_HONEY_TEAK', 'WOOD_RUBBER_18', 1.000, 0.00, 0.00),
  ('RUBBER_DARK_WALNUT', 'WOOD_RUBBER_18', 1.000, 0.00, 0.00),
  ('RUBBER_CLEAR_MATTE', 'WOOD_RUBBER_18', 1.000, 0.00, 0.00),
  ('PRELAM_WHITE', 'PRELAM_25', 1.000, 0.00, 0.00),
  ('PRELAM_CARBON_BLACK', 'PRELAM_25', 1.000, 0.00, 0.00),
  ('PRELAM_LIGHT_OAK', 'PRELAM_25', 1.000, 0.00, 0.00),
  ('PRELAM_COLUMBIA_WALNUT', 'PRELAM_25', 1.000, 0.00, 0.00),
  ('BWR_WARM_TEAK', 'BWR_PLY_MICA', 1.000, 0.00, 0.00),
  ('BWR_CONCRETE_GREY', 'BWR_PLY_MICA', 1.000, 0.00, 0.00),
  ('WPC_TEAK_BROWN', 'WPC_OUTDOOR', 1.000, 0.00, 0.00),
  ('WPC_CHARCOAL_GREY', 'WPC_OUTDOOR', 1.000, 0.00, 0.00)
ON CONFLICT (option_code) DO NOTHING;

-- C. TOP_MATERIAL under STONE
INSERT INTO configurator_options (option_group, option_code, parent_code, label_en, group_label, swatch_color_hex, sort_order)
VALUES
  -- Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)
  ('TOP_MATERIAL', 'GRANITE_JET_BLACK_OPT', 'STONE', 'Absolute Jet Black', 'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#0A0A0A', 201),
  ('TOP_MATERIAL', 'GRANITE_GALAXY_OPT', 'STONE', 'Black Galaxy', 'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#1C1C1E', 202),
  ('TOP_MATERIAL', 'GRANITE_KWHITE_OPT', 'STONE', 'K-White / Colonial White', 'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#F1F5F9', 203),
  ('TOP_MATERIAL', 'GRANITE_RED_OPT', 'STONE', 'Ruby Red', 'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#7F1D1D', 204),
  ('TOP_MATERIAL', 'GRANITE_TAN_BROWN_OPT', 'STONE', 'Tan Brown', 'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#451A03', 205),

  -- Luxury Marble / Quartz Finish (18mm) -> MARBLE_QUARTZ
  ('TOP_MATERIAL', 'QUARTZ_CARRARA', 'STONE', 'Italian Carrara White Marble Look', 'Luxury Marble / Quartz Finish (18mm)', '#F8FAFC', 206),
  ('TOP_MATERIAL', 'QUARTZ_NERO_MARQUINA', 'STONE', 'Nero Marquina Black Marble Look', 'Luxury Marble / Quartz Finish (18mm)', '#0F172A', 207)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, material_code, metal_cost_multiplier, flat_addon, per_sqft_addon)
VALUES
  ('GRANITE_JET_BLACK_OPT', 'GRANITE_JET_BLACK', 1.000, 0.00, 0.00),
  ('GRANITE_GALAXY_OPT', 'GRANITE_GALAXY', 1.000, 0.00, 0.00),
  ('GRANITE_KWHITE_OPT', 'GRANITE_KWHITE', 1.000, 0.00, 0.00),
  ('GRANITE_RED_OPT', 'GRANITE_RED', 1.000, 0.00, 0.00),
  ('GRANITE_TAN_BROWN_OPT', 'GRANITE_TAN_BROWN', 1.000, 0.00, 0.00),
  ('QUARTZ_CARRARA', 'MARBLE_QUARTZ', 1.000, 0.00, 0.00),
  ('QUARTZ_NERO_MARQUINA', 'MARBLE_QUARTZ', 1.000, 0.00, 0.00)
ON CONFLICT (option_code) DO NOTHING;

-- D. TOP_MATERIAL under METAL
INSERT INTO configurator_options (option_group, option_code, parent_code, label_en, group_label, swatch_color_hex, sort_order)
VALUES
  ('TOP_MATERIAL', 'SHEET_PERFORATED_OPT', 'METAL', 'Perforated Sheet Top', 'Industrial Steel Tops', '#334155', 301),
  ('TOP_MATERIAL', 'SHEET_MESH_OPT', 'METAL', 'Expanded Diamond Mesh Top', 'Industrial Steel Tops', '#475569', 302),
  ('TOP_MATERIAL', 'SHEET_CR_16G_OPT', 'METAL', '16G Solid CR Sheet Top', 'Industrial Steel Tops', '#1E293B', 303),
  ('TOP_MATERIAL', 'SHEET_SS304_OPT', 'METAL', 'Jindal SS 304 Food-Grade Sheet Top', 'Industrial Steel Tops', '#E2E8F0', 304)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, material_code, metal_cost_multiplier, flat_addon, per_sqft_addon)
VALUES
  ('SHEET_PERFORATED_OPT', 'SHEET_PERFORATED', 1.000, 0.00, 0.00),
  ('SHEET_MESH_OPT', 'SHEET_MESH', 1.000, 0.00, 0.00),
  ('SHEET_CR_16G_OPT', 'SHEET_CR_16G', 1.000, 0.00, 0.00),
  ('SHEET_SS304_OPT', 'SHEET_SS304', 1.000, 0.00, 0.00)
ON CONFLICT (option_code) DO NOTHING;

-- E. GAUGE (5)
INSERT INTO configurator_options (option_group, option_code, label_en, load_kg, warranty_text, badge_text, spec_note, sort_order)
VALUES
  ('GAUGE', 'G18', '18 Gauge Economy (1.2mm Tata/Apollo CR)', 150, '7 Years Weld Warranty', NULL, 'Home & office use', 1),
  ('GAUGE', 'G16', '16 Gauge Heavy Commercial (1.6mm Tata Structura)', 250, '10 Years Structural MIG Warranty', 'Recommended', 'Cafe, hotel, IT office', 2),
  ('GAUGE', 'G14', '14 Gauge Extra-Heavy Industrial (2.0mm)', 400, '15 Years Warranty', NULL, 'College, hostel, factory', 3),
  ('GAUGE', 'SS202', 'Jindal SS 202 (Indoor Luxury)', 200, '10 Years Weld Warranty', NULL, 'Indoor luxury styling', 4),
  ('GAUGE', 'SS304', 'Jindal SS 304 (100% Rust-Proof + Argon TIG)', 300, '3-Year Free Replacement Guarantee + 15 Years Rust-Free Warranty', NULL, 'Food & sanitary grade', 5)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, material_code, metal_cost_multiplier, flat_addon, notes)
VALUES
  ('G18', 'MS_CR', 1.000, 0.00, '18G standard baseline'),
  ('G16', 'MS_CR', 1.280, 0.00, '16G commercial baseline'),
  ('G14', 'MS_CR', 1.600, 0.00, '14G industrial baseline'),
  ('SS202', 'SS_202', 1.000, 0.00, 'Uses SS_202 rate with SS_WEIGHT_FACTOR'),
  ('SS304', 'SS_304', 1.000, 0.00, 'Uses SS_304 rate with SS_WEIGHT_FACTOR')
ON CONFLICT (option_code) DO NOTHING;

-- F. FRAME_COLOR
INSERT INTO configurator_options (option_group, option_code, label_en, swatch_color_hex, sort_order)
VALUES
  ('FRAME_COLOR', 'MATTE_BLACK', 'Matte Black Powder Coated', '#111111', 1),
  ('FRAME_COLOR', 'WHITE', 'Pure White Coated', '#FFFFFF', 2),
  ('FRAME_COLOR', 'GREY', 'Industrial Grey', '#4B5563', 3),
  ('FRAME_COLOR', 'RAW', 'Raw Primed', '#9CA3AF', 4),
  ('FRAME_COLOR', 'GOLD', 'Gold', '#D4AF37', 5)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, flat_addon)
VALUES
  ('MATTE_BLACK', 0.00),
  ('WHITE', 0.00),
  ('GREY', 0.00),
  ('RAW', 0.00),
  ('GOLD', 150.00)
ON CONFLICT (option_code) DO NOTHING;

-- G. BUILD_TYPE
INSERT INTO configurator_options (option_group, option_code, label_en, spec_note, sort_order)
VALUES
  ('BUILD_TYPE', 'WELDED', '100% Factory Welded (Coimbatore Local Delivery)', 'Pre-assembled on surface plate. 0-min setup.', 1),
  ('BUILD_TYPE', 'KNOCKDOWN', '5-Min Flat-Pack Knock-Down (Pan-India Courier)', 'Telescopic zero-shake lock. Dispatches nationwide.', 2)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, flat_addon)
VALUES
  ('WELDED', 0.00),
  ('KNOCKDOWN', 0.00)
ON CONFLICT (option_code) DO NOTHING;

-- H. SIZE
INSERT INTO configurator_options (option_group, option_code, label_en, spec_note, sort_order)
VALUES
  ('SIZE', '2x2', '2 x 2 ft', 'Compact side or single cafe table', 1),
  ('SIZE', '3x2', '3 x 2 ft', 'Standard 2-seater cafe table', 2),
  ('SIZE', '4x2', '4 x 2 ft', 'Standard 4-seater cafe or compact desk', 3),
  ('SIZE', '4x2.5', '4 x 2.5 ft', 'Spacious executive IT workstation', 4),
  ('SIZE', '6x3', '6 x 3 ft', 'Large 6-seater dining or conference table', 5),
  ('SIZE', 'CUSTOM', 'Custom Size Request', 'Engineered to your exact site millimeter dimensions', 6)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, flat_addon)
VALUES
  ('2x2', 0.00),
  ('3x2', 0.00),
  ('4x2', 0.00),
  ('4x2.5', 0.00),
  ('6x3', 0.00),
  ('CUSTOM', 0.00)
ON CONFLICT (option_code) DO NOTHING;

-- I. ADDON
INSERT INTO configurator_options (option_group, option_code, label_en, spec_note, sort_order)
VALUES
  ('ADDON', 'GROMMET', '+ ₹50 Laptop Wire Grommet Hole', 'Precision CNC circular cable portal with brush cap', 1),
  ('ADDON', 'CPU_HOLDER', '+ ₹150 Under-Table CPU / Bag Holder', 'Heavy-gauge steel suspended cradle for tower / backpacks', 2),
  ('ADDON', 'CHAIRS4', '+ ₹600 Add 4 Matching Chairs Combo', 'Matching structural steel frame chairs with bumper feet', 3)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, flat_addon)
VALUES
  ('GROMMET', 50.00),
  ('CPU_HOLDER', 150.00),
  ('CHAIRS4', 600.00)
ON CONFLICT (option_code) DO NOTHING;

-- J. QTY_TIER
INSERT INTO configurator_options (option_group, option_code, label_en, spec_note, sort_order)
VALUES
  ('QTY_TIER', 'TIER_1_3', '1-3 Pcs (Retail Price)', 'Direct factory price with GST invoice', 1),
  ('QTY_TIER', 'TIER_4_9', '4-9 Pcs (5% Small Biz Discount)', '5% factory rebate applied automatically', 2),
  ('QTY_TIER', 'TIER_10_PLUS', '10+ Pcs (12% B2B Factory Wholesale Discount)', '12% direct volume bulk pricing', 3)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO option_pricing (option_code, flat_addon)
VALUES
  ('TIER_1_3', 0.00),
  ('TIER_4_9', 0.00),
  ('TIER_10_PLUS', 0.00)
ON CONFLICT (option_code) DO NOTHING;

-- 7. UPDATE SAMPLE PRODUCTS ALLOWED TOP CATEGORIES USING TOP_TAB CODES
UPDATE products
SET allowed_top_categories = '["FRAME_ONLY", "WOOD", "STONE"]'::jsonb
WHERE sku IN ('IMS-CF-42', 'IMS-DN-63');

UPDATE products
SET allowed_top_categories = '["FRAME_ONLY", "WOOD", "METAL"]'::jsonb
WHERE sku = 'IMS-WS-425';

