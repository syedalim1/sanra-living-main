-- 016_privacy_granite_label.sql
-- Removes regional quarry naming from the white granite option.

UPDATE public.configurator_options
SET label_en = 'Classic Pearl White Granite'
WHERE option_code = 'GRANITE_KWHITE_OPT';

UPDATE public.configurator_options
SET group_label = replace(group_label, 'Kashmir White', 'Classic Pearl White Granite')
WHERE option_code = 'GRANITE_KWHITE_OPT' AND group_label IS NOT NULL;

UPDATE public.material_rates
SET display_name = 'Classic Pearl White Granite 18mm'
WHERE material_code = 'GRANITE_KWHITE';
