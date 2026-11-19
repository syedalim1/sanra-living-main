-- 017_core_lineup_cleanup.sql
-- Core lineup cleanup: MS/SS frame material, three table-top families,
-- reduced colors/add-ons/tags, and safe option deactivation.
-- Safe to re-run. Does not modify product, lead, order or set data.

-- 1. Primary FRAME_MATERIAL selector for tables
INSERT INTO public.product_type_option_groups
  (product_type, option_group, group_title, sort_order, is_required, default_code)
VALUES
  ('TABLE', 'FRAME_MATERIAL', 'Frame material', 5, true, 'MS')
ON CONFLICT (product_type, option_group) DO UPDATE SET
  group_title = EXCLUDED.group_title,
  sort_order = EXCLUDED.sort_order,
  is_required = EXCLUDED.is_required,
  default_code = EXCLUDED.default_code,
  is_active = true;

INSERT INTO public.configurator_options
  (option_group, option_code, parent_code, label_en, group_label, swatch_color_hex,
   spec_note, badge_text, sort_order, is_active)
VALUES
  ('FRAME_MATERIAL', 'MS', NULL, 'Mild Steel (Powder Coated)', NULL, '#111111',
   'Heavy-gauge CR steel pipe with industrial powder coating',
   '10-Yr MIG Structural Warranty', 1, true),
  ('FRAME_MATERIAL', 'SS', NULL, 'Stainless Steel (SS 202 / 304)', NULL, '#E5E5EA',
   'Food-grade stainless steel with mirror or matte finish',
   '3-Yr SS Replacement Guarantee', 2, true)
ON CONFLICT (option_code) DO UPDATE SET
  option_group = EXCLUDED.option_group,
  label_en = EXCLUDED.label_en,
  spec_note = EXCLUDED.spec_note,
  badge_text = EXCLUDED.badge_text,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.option_pricing
  (option_code, material_code, metal_cost_multiplier, flat_addon, per_sqft_addon, applies_to)
VALUES
  ('MS', 'MS_CR', 1.000, 0.00, 0.00, 'FLAT'),
  ('SS', 'SS_202', 1.000, 0.00, 0.00, 'FLAT')
ON CONFLICT (option_code) DO UPDATE SET
  material_code = EXCLUDED.material_code;

-- 2. Top surfaces: Frame Only / Wood / Granite only
UPDATE public.configurator_options
SET label_en = 'Rubberwood & Plywood', is_active = true
WHERE option_group = 'TOP_TAB' AND option_code = 'WOOD';

UPDATE public.configurator_options
SET label_en = 'Granite Top', is_active = true
WHERE option_group = 'TOP_TAB' AND option_code = 'STONE';

UPDATE public.configurator_options
SET is_active = false
WHERE option_group = 'TOP_TAB' AND option_code = 'METAL';

-- 3. Top materials: Rubberwood, Plywood, and three core granites only
UPDATE public.configurator_options
SET label_en = 'Rubberwood',
    group_label = '100% Seasoned Grade-A Rubberwood',
    is_active = true
WHERE option_group = 'TOP_MATERIAL' AND option_code = 'RUBBER_HONEY_TEAK';

UPDATE public.configurator_options
SET label_en = 'Plywood',
    group_label = 'BWR Waterproof Plywood',
    is_active = true
WHERE option_group = 'TOP_MATERIAL' AND option_code = 'BWR_WARM_TEAK';

UPDATE public.configurator_options
SET group_label = '18mm Export-Grade Natural Granite', is_active = true
WHERE option_group = 'TOP_MATERIAL'
  AND option_code IN (
    'GRANITE_JET_BLACK_OPT',
    'GRANITE_GALAXY_OPT',
    'GRANITE_TAN_BROWN_OPT'
  );

UPDATE public.configurator_options
SET is_active = false
WHERE option_group = 'TOP_MATERIAL'
  AND option_code NOT IN (
    'RUBBER_HONEY_TEAK',
    'BWR_WARM_TEAK',
    'GRANITE_JET_BLACK_OPT',
    'GRANITE_GALAXY_OPT',
    'GRANITE_TAN_BROWN_OPT'
  );

-- 4. Frame colors: MS powder coat + SS finish only
INSERT INTO public.configurator_options
  (option_group, option_code, parent_code, label_en, swatch_color_hex, sort_order, is_active)
VALUES
  ('FRAME_COLOR', 'SS_FINISH', NULL, 'SS Mirror / Matte Finish', '#E5E5EA', 3, true)
ON CONFLICT (option_code) DO UPDATE SET
  option_group = 'FRAME_COLOR',
  label_en = EXCLUDED.label_en,
  swatch_color_hex = EXCLUDED.swatch_color_hex,
  is_active = true;

INSERT INTO public.option_pricing
  (option_code, material_code, metal_cost_multiplier, flat_addon, per_sqft_addon, applies_to)
VALUES ('SS_FINISH', NULL, 1.000, 0.00, 0.00, 'FLAT')
ON CONFLICT (option_code) DO NOTHING;

UPDATE public.configurator_options
SET label_en = 'SS Mirror / Matte Finish', is_active = true
WHERE option_group = 'FRAME_COLOR' AND option_code = 'SS';

UPDATE public.configurator_options
SET is_active = true
WHERE option_group = 'FRAME_COLOR' AND option_code IN ('MATTE_BLACK', 'GREY');

UPDATE public.configurator_options
SET is_active = false
WHERE option_group = 'FRAME_COLOR'
  AND option_code IN ('WHITE', 'RAW', 'GOLD');

-- 5. Optional add-ons: disabled by default (section hides when empty)
UPDATE public.configurator_options
SET is_active = false
WHERE option_group = 'ADDON'
  AND option_code IN ('GROMMET', 'CPU_HOLDER', 'CHAIRS4');

-- 6. Keep the private rate engine's finishing costs editable
INSERT INTO public.pricing_globals (key, numeric_value, description)
VALUES
  ('POWDER_COATING_COST', 350.00, 'MS powder-coating finishing cost per frame'),
  ('SS_POLISHING_COST', 500.00, 'SS polishing/mirror finishing cost per frame')
ON CONFLICT (key) DO NOTHING;

-- 7. Allow the SS finish variant while preserving existing variant rows
DO $$
BEGIN
  IF to_regclass('public.product_visual_variants') IS NOT NULL THEN
    ALTER TABLE public.product_visual_variants
      DROP CONSTRAINT IF EXISTS product_visual_variants_frame_color_check;
    ALTER TABLE public.product_visual_variants
      ADD CONSTRAINT product_visual_variants_frame_color_check
      CHECK (
        frame_color IS NULL
        OR frame_color IN (
          'MATTE_BLACK', 'GREY', 'SS_FINISH', 'SS',
          'WHITE', 'GOLD', 'RAW'
        )
      );
  END IF;
END $$;

-- Required material_rates codes for the active lineup (DB-driven rates):
--   MS_CR, SS_202, SS_304
--   WOOD_RUBBER_18, BWR_PLY_MICA
--   GRANITE_JET_BLACK, GRANITE_GALAXY, GRANITE_TAN_BROWN
-- The pricing engine reads these from public.material_rates at request time.
