-- STEP 01 Security Lock: Restrict direct public PostgREST access to private configurator options
-- and verify RLS privacy on internal pricing/costing tables.
-- Do NOT execute directly against production without staging verification.

DO $$
BEGIN
  -- Ensure private pricing/costing tables have RLS enabled and no public policies.
  IF to_regclass('public.product_pricing_rules') IS NOT NULL THEN
    ALTER TABLE public.product_pricing_rules ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.material_rates') IS NOT NULL THEN
    ALTER TABLE public.material_rates ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.pricing_globals') IS NOT NULL THEN
    ALTER TABLE public.pricing_globals ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.option_pricing') IS NOT NULL THEN
    ALTER TABLE public.option_pricing ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.set_pricing') IS NOT NULL THEN
    ALTER TABLE public.set_pricing ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Restrict direct anon/authenticated SELECT on configurator_options so internal gauge,
  -- thickness, and grade rows cannot be read directly via PostgREST.
  IF to_regclass('public.configurator_options') IS NOT NULL THEN
    ALTER TABLE public.configurator_options ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read configurator options" ON public.configurator_options;
    DROP POLICY IF EXISTS "Public read active configurator options" ON public.configurator_options;
    CREATE POLICY "Public read safe active configurator options"
      ON public.configurator_options
      FOR SELECT
      TO anon, authenticated
      USING (
        is_active = true
        AND option_group NOT IN ('GAUGE', 'THICKNESS', 'GRADE')
      );
  END IF;

  -- Restrict direct anon/authenticated SELECT on product_type_option_groups for private groups.
  IF to_regclass('public.product_type_option_groups') IS NOT NULL THEN
    ALTER TABLE public.product_type_option_groups ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public read product type option groups" ON public.product_type_option_groups;
    CREATE POLICY "Public read safe product type option groups"
      ON public.product_type_option_groups
      FOR SELECT
      TO anon, authenticated
      USING (
        is_active = true
        AND option_group NOT IN ('GAUGE', 'THICKNESS', 'GRADE')
      );
  END IF;
END $$;
