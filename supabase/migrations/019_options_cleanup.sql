-- Database Migration: 019_options_cleanup.sql
-- Options Manager cleanup: correct Mild Steel warranty wording and allow the
-- SET (CHAIR_TABLE_SET) tab to store its own option groups.
-- Safe to re-run.

-- 1. Mild Steel warranty wording.
UPDATE public.configurator_options
SET badge_text = '3-Yr Welding Warranty'
WHERE option_group = 'FRAME_MATERIAL'
  AND option_code = 'MS'
  AND badge_text = '10-Yr MIG Structural Warranty';

UPDATE public.configurator_options
SET warranty_text = '3-Yr Welding Warranty'
WHERE option_group = 'FRAME_MATERIAL'
  AND option_code = 'MS'
  AND warranty_text = '10-Yr MIG Structural Warranty';

-- 2. Allow CHAIR_TABLE_SET option groups for the SET tab.
DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  IF to_regclass('public.product_type_option_groups') IS NULL THEN
    RETURN;
  END IF;

  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.product_type_option_groups'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%product_type%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.product_type_option_groups DROP CONSTRAINT %I',
      constraint_row.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.product_type_option_groups
  ADD CONSTRAINT product_type_option_groups_product_type_check
  CHECK (
    product_type IN (
      'TABLE',
      'CHAIR',
      'CHAIR_TABLE_SET',
      'STAND',
      'RACK',
      'SS_UNIT'
    )
  );
