-- 009_use_cases_and_loads.sql
-- Expands product use cases and clears per-option load ratings for SS202/SS304.
-- Safe to run even if some objects are missing.

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE NOTICE 'public.products is missing; skipping use_cases constraint update.';
    RETURN;
  END IF;

  ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS products_use_cases_check;

  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%use_cases%'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;

  ALTER TABLE public.products
    ADD CONSTRAINT products_use_cases_check
    CHECK (
      use_cases IS NULL
      OR use_cases <@ ARRAY[
        'CAFE',
        'OFFICE',
        'HOME',
        'HOSPITAL',
        'HOSTEL',
        'CANTEEN',
        'BAKERY',
        'HALL',
        'SCHOOL'
      ]::text[]
    );

  COMMENT ON COLUMN public.products.use_cases IS
    'Supported: CAFE, OFFICE, HOME, HOSPITAL, HOSTEL, CANTEEN, BAKERY, HALL, SCHOOL';
END $$;

DO $$
BEGIN
  IF to_regclass('public.configurator_options') IS NULL THEN
    RAISE NOTICE 'public.configurator_options is missing; skipping load_kg update.';
    RETURN;
  END IF;

  UPDATE public.configurator_options
  SET load_kg = NULL
  WHERE option_code IN ('SS202', 'SS304');
END $$;
