-- 012_options_manager.sql
-- Admin-managed option groups, options, private pricing and per-product availability.
-- Safe to re-run.

ALTER TABLE public.configurator_options
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS group_label TEXT,
  ADD COLUMN IF NOT EXISTS swatch_color_hex TEXT,
  ADD COLUMN IF NOT EXISTS swatch_texture_img TEXT,
  ADD COLUMN IF NOT EXISTS spec_note TEXT,
  ADD COLUMN IF NOT EXISTS badge_text TEXT,
  ADD COLUMN IF NOT EXISTS load_kg INT,
  ADD COLUMN IF NOT EXISTS warranty_text TEXT;

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  IF to_regclass('public.configurator_options') IS NULL THEN
    RETURN;
  END IF;

  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.configurator_options'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%option_group%'
  LOOP
    EXECUTE format('ALTER TABLE public.configurator_options DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;

  ALTER TABLE public.configurator_options
    ADD CONSTRAINT configurator_options_option_group_format
    CHECK (option_group ~ '^[A-Z0-9_]+$');
END $$;

ALTER TABLE public.product_type_option_groups
  ADD COLUMN IF NOT EXISTS display_style TEXT NOT NULL DEFAULT 'SWATCH',
  ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF to_regclass('public.product_type_option_groups') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.product_type_option_groups
    DROP CONSTRAINT IF EXISTS product_type_option_groups_display_style_check;
  ALTER TABLE public.product_type_option_groups
    ADD CONSTRAINT product_type_option_groups_display_style_check
    CHECK (display_style IN ('SWATCH', 'CARD', 'PILL', 'CHECKBOX'));
END $$;

ALTER TABLE public.option_pricing
  ADD COLUMN IF NOT EXISTS applies_to TEXT NOT NULL DEFAULT 'FLAT',
  ADD COLUMN IF NOT EXISTS per_sqft_addon NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

DO $$
BEGIN
  IF to_regclass('public.option_pricing') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.option_pricing
  SET applies_to = 'METAL_WEIGHT'
  WHERE applies_to = 'FLAT' AND metal_cost_multiplier <> 1;

  ALTER TABLE public.option_pricing
    DROP CONSTRAINT IF EXISTS option_pricing_applies_to_check;
  ALTER TABLE public.option_pricing
    ADD CONSTRAINT option_pricing_applies_to_check
    CHECK (applies_to IN ('FLAT', 'METAL_WEIGHT', 'TOP_AREA', 'PER_UNIT'));
END $$;

CREATE TABLE IF NOT EXISTS public.product_option_availability (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_code TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (product_id, option_code)
);

ALTER TABLE public.product_option_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product option availability" ON public.product_option_availability;
CREATE POLICY "Public read product option availability"
  ON public.product_option_availability
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS product_option_availability_product_idx
  ON public.product_option_availability (product_id);
