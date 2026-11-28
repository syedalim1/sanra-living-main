-- STEP 02 Compatibility Migration: Reconcile products.from_price and products.allowed_top_categories
-- Safe to run on both fresh migrations-only databases and existing production databases.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS from_price NUMERIC(12, 2);

DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  SELECT data_type
  INTO v_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'allowed_top_categories';

  IF v_data_type = 'jsonb' THEN
    ALTER TABLE public.products
      ALTER COLUMN allowed_top_categories DROP DEFAULT;

    ALTER TABLE public.products
      ALTER COLUMN allowed_top_categories TYPE TEXT[]
      USING COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(allowed_top_categories)),
        ARRAY[]::TEXT[]
      );

    ALTER TABLE public.products
      ALTER COLUMN allowed_top_categories SET DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;
