-- 010_privacy_labels.sql
-- Removes supplier brand names and process wording from public option labels.
-- Safe to run even if some tables are missing.

DO $$
BEGIN
  IF to_regclass('public.configurator_options') IS NOT NULL THEN
    UPDATE public.configurator_options
    SET label_en = '18 Gauge Economy (Premium CR steel pipe)'
    WHERE option_code = 'G18' AND option_group IN ('GAUGE', 'THICKNESS');

    UPDATE public.configurator_options
    SET label_en = '16 Gauge Heavy Commercial (Premium CR steel pipe)'
    WHERE option_code = 'G16' AND option_group IN ('GAUGE', 'THICKNESS');

    UPDATE public.configurator_options
    SET label_en = '14 Gauge Extra-Heavy Industrial'
    WHERE option_code = 'G14';

    UPDATE public.configurator_options
    SET label_en = 'Stainless Steel 202 (Indoor)'
    WHERE option_code = 'SS202';

    UPDATE public.configurator_options
    SET label_en = 'Stainless Steel 304 (Food Grade)'
    WHERE option_code = 'SS304';

    UPDATE public.configurator_options
    SET label_en = 'Stainless Steel 304 Sheet Top'
    WHERE option_code = 'SHEET_SS304_OPT';

    UPDATE public.configurator_options
    SET label_en = 'MS Powder Coated (Premium CR steel pipe)'
    WHERE option_code = 'MS_COATED';

    UPDATE public.configurator_options
    SET label_en = 'Stainless Steel 202 (Indoor)'
    WHERE option_code IN ('SS202', 'SSG_202')
      AND option_group IN ('METAL_TYPE', 'GRADE');

    UPDATE public.configurator_options
    SET label_en = 'Stainless Steel 304 (Food Grade)'
    WHERE option_code IN ('SS304', 'SSG_304', 'ST_SS304')
      AND option_group IN ('METAL_TYPE', 'GRADE', 'STAND_MATERIAL');

    UPDATE public.configurator_options
    SET label_en = 'Heavy Leveling Feet'
    WHERE option_code = 'BASE_BUSH';

    UPDATE public.configurator_options
    SET label_en = 'Rose-Gold / Gold Stainless Steel'
    WHERE option_code = 'RF_GOLD_PVD';

    UPDATE public.configurator_options
    SET spec_note = 'Pre-assembled at the factory.'
    WHERE option_code = 'WELDED';
  END IF;

  IF to_regclass('public.material_rates') IS NOT NULL THEN
    UPDATE public.material_rates
    SET display_name = 'Stainless Steel 202'
    WHERE material_code = 'SS_202';

    UPDATE public.material_rates
    SET display_name = 'Stainless Steel 304'
    WHERE material_code = 'SS_304';

    UPDATE public.material_rates
    SET display_name = 'Stainless Steel 304 Sheet Top'
    WHERE material_code = 'SHEET_SS304';
  END IF;
END $$;
