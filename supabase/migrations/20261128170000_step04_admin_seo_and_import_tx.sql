-- STEP 04: Product SEO table, cost import optional columns, and atomic cost import RPC.

CREATE TABLE IF NOT EXISTS public.product_seo (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  seo_title TEXT,
  meta_description TEXT,
  product_h1 TEXT,
  image_alt_text TEXT,
  og_image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.product_seo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product seo for active products" ON public.product_seo;
CREATE POLICY "Public read product seo for active products"
  ON public.product_seo FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.is_active = true
    )
  );

ALTER TABLE public.cost_import_rows
  ADD COLUMN IF NOT EXISTS lead_time_days INT,
  ADD COLUMN IF NOT EXISTS availability TEXT;

-- Atomic transactional cost import application.
-- Ensures bulk imports cannot partially apply and never auto-publishes DRAFT variants.
CREATE OR REPLACE FUNCTION public.apply_cost_import_batch_tx(
  p_batch_id UUID,
  p_actor_email TEXT,
  p_effective_from DATE DEFAULT CURRENT_DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
  v_row RECORD;
  v_variant_id UUID;
  v_old_cost NUMERIC(12, 2);
  v_applied INT := 0;
BEGIN
  SELECT status INTO v_status
  FROM public.cost_import_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch not found';
  END IF;

  IF v_status <> 'VALIDATED' THEN
    RAISE EXCEPTION 'Import batch must be VALIDATED before applying (current: %)', v_status;
  END IF;

  FOR v_row IN
    SELECT variant_code, manufacturing_cost, lead_time_days, availability
    FROM public.cost_import_rows
    WHERE batch_id = p_batch_id
      AND validation_error IS NULL
      AND manufacturing_cost IS NOT NULL
  LOOP
    SELECT id INTO v_variant_id
    FROM public.product_variants
    WHERE variant_code = v_row.variant_code;

    IF v_variant_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT manufacturing_cost INTO v_old_cost
    FROM public.variant_pricing_private
    WHERE variant_id = v_variant_id;

    INSERT INTO public.variant_pricing_private (
      variant_id,
      manufacturing_cost,
      cost_source,
      cost_effective_from,
      updated_by,
      updated_at
    )
    VALUES (
      v_variant_id,
      v_row.manufacturing_cost,
      'EXCEL_IMPORT',
      p_effective_from,
      p_actor_email,
      timezone('utc'::text, now())
    )
    ON CONFLICT (variant_id) DO UPDATE SET
      manufacturing_cost = EXCLUDED.manufacturing_cost,
      cost_source = 'EXCEL_IMPORT',
      cost_effective_from = EXCLUDED.cost_effective_from,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;

    IF v_row.lead_time_days IS NOT NULL OR v_row.availability IS NOT NULL THEN
      UPDATE public.product_variants
      SET
        lead_time_days = COALESCE(v_row.lead_time_days, lead_time_days),
        availability = COALESCE(v_row.availability, availability),
        updated_at = timezone('utc'::text, now())
      WHERE id = v_variant_id;
    END IF;

    INSERT INTO public.price_history (
      entity_type,
      entity_id,
      variant_id,
      field,
      old_value,
      new_value,
      reason,
      source,
      actor_email,
      batch_id
    )
    VALUES (
      'VARIANT_PRICING',
      v_variant_id,
      v_variant_id,
      'manufacturing_cost',
      v_old_cost::TEXT,
      v_row.manufacturing_cost::TEXT,
      'Excel/CSV manufacturing cost import',
      'EXCEL_IMPORT',
      p_actor_email,
      p_batch_id
    );

    v_applied := v_applied + 1;
  END LOOP;

  UPDATE public.cost_import_batches
  SET
    status = 'APPLIED',
    applied_at = timezone('utc'::text, now())
  WHERE id = p_batch_id;

  RETURN v_applied;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_cost_import_batch_tx(UUID, TEXT, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_cost_import_batch_tx(UUID, TEXT, DATE) TO service_role;
