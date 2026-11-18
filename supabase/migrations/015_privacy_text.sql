-- 015_privacy_text.sql
-- Removes sourcing locations from public-facing database labels.

DO $$
BEGIN
  IF to_regclass('public.configurator_options') IS NOT NULL THEN
    UPDATE public.configurator_options
    SET group_label = replace(
      replace(group_label, 'Kerala Rubberwood', 'Hardwood'),
      'Krishnagiri',
      'Natural'
    )
    WHERE group_label IS NOT NULL;

    UPDATE public.configurator_options
    SET label_en = replace(
      replace(label_en, 'Kerala Rubberwood', 'Hardwood'),
      'Krishnagiri',
      'Natural'
    );

    UPDATE public.configurator_options
    SET spec_note = replace(
      replace(spec_note, 'Kerala rubberwood', 'hardwood'),
      'Krishnagiri',
      'natural'
    )
    WHERE spec_note IS NOT NULL;
  END IF;

  IF to_regclass('public.material_rates') IS NOT NULL THEN
    UPDATE public.material_rates
    SET display_name = replace(
      replace(display_name, 'Kerala Rubberwood', 'Hardwood'),
      'Krishnagiri',
      'Natural'
    );
  END IF;
END $$;
