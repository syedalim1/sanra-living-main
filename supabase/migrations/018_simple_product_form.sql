-- Database Migration: 018_simple_product_form.sql
-- Simplifies the admin product form: direct prices, frame material and short
-- description. Existing costing columns are kept for backward compatibility.
-- Safe to re-run.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS frame_material TEXT NOT NULL DEFAULT 'MS',
  ADD COLUMN IF NOT EXISTS from_price NUMERIC(12, 2);

DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  SELECT data_type INTO v_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'allowed_top_categories';

  IF v_data_type = 'jsonb' THEN
    ALTER TABLE public.products ALTER COLUMN allowed_top_categories DROP DEFAULT;
    ALTER TABLE public.products
      ALTER COLUMN allowed_top_categories TYPE TEXT[]
      USING COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(allowed_top_categories)),
        ARRAY[]::TEXT[]
      );
    ALTER TABLE public.products ALTER COLUMN allowed_top_categories SET DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

ALTER TABLE public.product_pricing_rules
  ADD COLUMN IF NOT EXISTS direct_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS granite_top_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS wood_top_price NUMERIC(12, 2);

-- 1. Replace the old MS warranty wording everywhere it is still stored.
UPDATE public.products
SET warranty_text = '3-Yr Welding Warranty'
WHERE warranty_text = '10-Yr MIG Structural Warranty';

UPDATE public.configurator_options
SET warranty_text = '3-Yr Welding Warranty'
WHERE option_group = 'FRAME_MATERIAL'
  AND option_code = 'MS'
  AND warranty_text = '10-Yr MIG Structural Warranty';

-- 2. The simplified form only offers Granite and Wood tops. Drop legacy
--    frame-only / metal entries while keeping existing rows valid.
UPDATE public.products
SET allowed_top_categories = array_remove(
  array_remove(allowed_top_categories, 'FRAME_ONLY'),
  'METAL'
)
WHERE allowed_top_categories && ARRAY['FRAME_ONLY', 'METAL'];

-- 3. Keep the public "from price" column in sync for rows that now use a
--    direct price, so older consumers still see a sensible value.
UPDATE public.products p
SET from_price = LEAST(
  NULLIF(r.direct_price, 0),
  NULLIF(r.granite_top_price, 0),
  NULLIF(r.wood_top_price, 0)
)
FROM public.product_pricing_rules r
WHERE r.product_id = p.id
  AND (
    NULLIF(r.direct_price, 0) IS NOT NULL
    OR NULLIF(r.granite_top_price, 0) IS NOT NULL
    OR NULLIF(r.wood_top_price, 0) IS NOT NULL
  );
