-- 014_privacy_lock.sql
-- Moves private costing/config fields off public.products, prepares variant
-- material photos, and locks down RLS on every public table.
-- Safe to re-run.

ALTER TABLE public.product_pricing_rules
  ADD COLUMN IF NOT EXISTS combo_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pipe_spec TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'combo_config'
  ) THEN
    EXECUTE $sql$
      UPDATE public.product_pricing_rules r
      SET combo_config = COALESCE(p.combo_config, '{}'::jsonb)
      FROM public.products p
      WHERE r.product_id = p.id
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'pipe_spec'
  ) THEN
    EXECUTE $sql$
      UPDATE public.product_pricing_rules r
      SET pipe_spec = p.pipe_spec
      FROM public.products p
      WHERE r.product_id = p.id
    $sql$;
  END IF;
END $$;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS combo_config,
  DROP COLUMN IF EXISTS pipe_spec;

ALTER TABLE public.product_visual_variants
  ALTER COLUMN frame_color DROP NOT NULL,
  ALTER COLUMN size_option DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS top_tab TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 100;

DO $$
BEGIN
  IF to_regclass('public.product_visual_variants') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.product_visual_variants
    DROP CONSTRAINT IF EXISTS product_visual_variants_frame_color_check;
  ALTER TABLE public.product_visual_variants
    ADD CONSTRAINT product_visual_variants_frame_color_check
    CHECK (
      frame_color IS NULL
      OR frame_color IN ('MATTE_BLACK', 'WHITE', 'GREY', 'GOLD', 'RAW', 'SS')
    );

  DELETE FROM public.product_visual_variants v
  USING (
    SELECT
      ctid,
      row_number() OVER (
        PARTITION BY
          product_id,
          COALESCE(top_tab, ''),
          COALESCE(top_material_code, ''),
          COALESCE(frame_color, '')
        ORDER BY created_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM public.product_visual_variants
  ) duplicates
  WHERE v.ctid = duplicates.ctid AND duplicates.rn > 1;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS product_visual_variants_material_photo_idx
  ON public.product_visual_variants (
    product_id,
    COALESCE(top_tab, ''),
    COALESCE(top_material_code, ''),
    COALESCE(frame_color, '')
  );

-- Enable RLS on every table in the public schema.
DO $$
DECLARE
  table_row RECORD;
BEGIN
  FOR table_row IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_row.tablename);
  END LOOP;
END $$;

-- Remove every anon/authenticated/public policy from public tables.
DO $$
DECLARE
  policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        'anon' = ANY(roles)
        OR 'authenticated' = ANY(roles)
        OR 'public' = ANY(roles)
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_row.policyname,
      policy_row.tablename
    );
  END LOOP;
END $$;

-- Public read-only policies on safe tables.
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read active products" ON public.products;
    CREATE POLICY "Public read active products"
      ON public.products FOR SELECT TO anon, authenticated
      USING (is_active = true);
  END IF;

  IF to_regclass('public.product_visual_variants') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read visual variants" ON public.product_visual_variants;
    CREATE POLICY "Public read visual variants"
      ON public.product_visual_variants FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF to_regclass('public.configurator_options') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read configurator options" ON public.configurator_options;
    CREATE POLICY "Public read configurator options"
      ON public.configurator_options FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF to_regclass('public.product_type_option_groups') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read product type option groups" ON public.product_type_option_groups;
    CREATE POLICY "Public read product type option groups"
      ON public.product_type_option_groups FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF to_regclass('public.product_option_availability') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read product option availability" ON public.product_option_availability;
    CREATE POLICY "Public read product option availability"
      ON public.product_option_availability FOR SELECT TO anon, authenticated
      USING (true);
  END IF;

  IF to_regclass('public.product_sets') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read active product sets" ON public.product_sets;
    CREATE POLICY "Public read active product sets"
      ON public.product_sets FOR SELECT TO anon, authenticated
      USING (is_active = true);
  END IF;

  IF to_regclass('public.product_set_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read product set items" ON public.product_set_items;
    CREATE POLICY "Public read product set items"
      ON public.product_set_items FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;
