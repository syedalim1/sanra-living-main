-- STEP 02 Legacy Compatibility Backfill
-- Creates a default economic variant for each existing product without inventing manufacturing costs.
-- Incomplete variants remain DRAFT / QUOTE_ONLY until manufacturing costs are imported.

INSERT INTO public.product_variants (
  product_id,
  variant_code,
  frame_material,
  build_category_id,
  size_code,
  size_label,
  length_ft,
  width_ft,
  height_ft,
  variant_image_url,
  availability,
  status,
  is_active,
  sort_order
)
SELECT
  p.id,
  p.sku || '-DEFAULT',
  CASE WHEN UPPER(COALESCE(p.frame_material, 'MS')) = 'SS' THEN 'SS' ELSE 'MS' END,
  bc.id,
  COALESCE(NULLIF(TRIM(p.base_length_ft::TEXT) || 'x' || TRIM(p.base_width_ft::TEXT), ''), 'STANDARD'),
  TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM p.base_length_ft::TEXT))
    || ' x '
    || TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM p.base_width_ft::TEXT))
    || ' ft',
  p.base_length_ft,
  p.base_width_ft,
  COALESCE(p.base_height_ft, 2.50),
  p.main_image_url,
  CASE WHEN COALESCE(NULLIF(r.direct_price, 0), 0) > 0 THEN 'MADE_TO_ORDER' ELSE 'QUOTE_ONLY' END,
  CASE WHEN p.is_active = true AND COALESCE(NULLIF(r.direct_price, 0), 0) > 0 THEN 'PUBLISHED' ELSE 'DRAFT' END,
  p.is_active,
  10
FROM public.products p
JOIN public.build_categories bc
  ON bc.code = CASE
    WHEN UPPER(COALESCE(p.frame_material, 'MS')) = 'SS' THEN 'SS_STANDARD'
    ELSE 'MS_STANDARD'
  END
LEFT JOIN public.product_pricing_rules r
  ON r.product_id = p.id
ON CONFLICT (variant_code) DO NOTHING;

INSERT INTO public.variant_pricing_private (
  variant_id,
  manufacturing_cost,
  cost_source,
  price_override_ex_gst
)
SELECT
  pv.id,
  NULL,
  CASE WHEN COALESCE(NULLIF(r.direct_price, 0), 0) > 0 THEN 'LEGACY_OVERRIDE' ELSE 'UNSET' END,
  NULLIF(r.direct_price, 0)
FROM public.product_variants pv
LEFT JOIN public.product_pricing_rules r
  ON r.product_id = pv.product_id
WHERE pv.variant_code LIKE '%-DEFAULT'
ON CONFLICT (variant_id) DO NOTHING;
