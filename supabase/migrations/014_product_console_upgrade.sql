-- 014_product_console_upgrade.sql
-- Non-destructive product console fields and relaxed category/type constraints.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS base_height_ft NUMERIC(6, 2) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS top_category_images JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS gallery_images TEXT[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.product_pricing_rules
  ADD COLUMN IF NOT EXISTS finishing_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS b2b_moq INT NOT NULL DEFAULT 1;

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RETURN;
  END IF;

  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%category%'
        OR pg_get_constraintdef(oid) ILIKE '%product_type%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;
