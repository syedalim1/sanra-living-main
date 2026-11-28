-- Draft defaults apply to future inserts. Existing products and prices are untouched.
ALTER TABLE public.products
  ALTER COLUMN is_active SET DEFAULT false,
  ALTER COLUMN is_knockdown_available SET DEFAULT false;

DROP POLICY IF EXISTS "Public read published product variants" ON public.product_variants;
CREATE POLICY "Public read published product variants"
  ON public.product_variants FOR SELECT TO anon, authenticated
  USING (is_active AND status = 'PUBLISHED' AND EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active
  ));

CREATE FUNCTION public.admin_save_catalog_product(
  p_id uuid, p_patch jsonb, p_legacy jsonb, p_actor text
)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  current_product public.products;
  next_product public.products;
  legacy public.product_pricing_rules;
  is_new boolean := p_id IS NULL;
BEGIN
  IF NOT is_new THEN
    SELECT * INTO STRICT current_product FROM public.products WHERE id = p_id FOR UPDATE;
  END IF;

  next_product := jsonb_populate_record(current_product, p_patch);

  IF is_new THEN
    INSERT INTO public.products (
      sku, name, category, product_type, base_length_ft, base_width_ft, base_height_ft,
      short_description, frame_material, material_tags, use_cases, allowed_top_categories,
      warranty_text, is_knockdown_available, sort_order, is_active, main_image_url,
      hover_blueprint_img, top_category_images, gallery_images
    ) VALUES (
      next_product.sku, next_product.name, next_product.category, next_product.product_type,
      next_product.base_length_ft, next_product.base_width_ft, next_product.base_height_ft,
      next_product.short_description, next_product.frame_material, next_product.material_tags,
      next_product.use_cases, next_product.allowed_top_categories, next_product.warranty_text,
      next_product.is_knockdown_available, next_product.sort_order, false, next_product.main_image_url,
      next_product.hover_blueprint_img, next_product.top_category_images, next_product.gallery_images
    ) RETURNING id INTO p_id;
    p_legacy := p_legacy - ARRAY['direct_price', 'granite_top_price', 'wood_top_price'];
  ELSE
    IF current_product.is_active
      AND current_product.main_image_url <> '/images/product-placeholder.svg'
      AND next_product.main_image_url = '/images/product-placeholder.svg'
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Unpublish the product before removing its main photo.';
    END IF;
    IF current_product.is_active AND nullif(btrim(current_product.short_description), '') IS NOT NULL
      AND nullif(btrim(next_product.short_description), '') IS NULL
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Unpublish the product before clearing its catalog description.';
    END IF;

    IF p_patch ? 'top_category_images' THEN
      next_product.top_category_images := coalesce(current_product.top_category_images, '{}'::jsonb) || next_product.top_category_images;
      next_product.top_category_images := jsonb_strip_nulls(next_product.top_category_images);
    END IF;
    IF p_patch ? 'gallery_images' THEN
      next_product.gallery_images := current_product.gallery_images || next_product.gallery_images;
      next_product.gallery_images := next_product.gallery_images[greatest(1, cardinality(next_product.gallery_images) - 7):];
    END IF;

    UPDATE public.products SET
      name = next_product.name, category = next_product.category, product_type = next_product.product_type,
      base_length_ft = next_product.base_length_ft, base_width_ft = next_product.base_width_ft,
      base_height_ft = next_product.base_height_ft, short_description = next_product.short_description,
      frame_material = next_product.frame_material, material_tags = next_product.material_tags,
      use_cases = next_product.use_cases, allowed_top_categories = next_product.allowed_top_categories,
      warranty_text = next_product.warranty_text, is_knockdown_available = next_product.is_knockdown_available,
      sort_order = next_product.sort_order, main_image_url = next_product.main_image_url,
      hover_blueprint_img = next_product.hover_blueprint_img, top_category_images = next_product.top_category_images,
      gallery_images = next_product.gallery_images
    WHERE id = p_id;
  END IF;

  IF p_legacy <> '{}'::jsonb THEN
    SELECT * INTO legacy FROM public.product_pricing_rules WHERE product_id = p_id FOR UPDATE;
    legacy := jsonb_populate_record(legacy, p_legacy);
    INSERT INTO public.product_pricing_rules (
      product_id, pipe_spec, combo_config, direct_price, granite_top_price, wood_top_price
    ) VALUES (
      p_id, legacy.pipe_spec, coalesce(legacy.combo_config, '{}'::jsonb), legacy.direct_price,
      legacy.granite_top_price, legacy.wood_top_price
    )
    ON CONFLICT (product_id) DO UPDATE SET
      pipe_spec = CASE WHEN p_legacy ? 'pipe_spec' THEN excluded.pipe_spec ELSE product_pricing_rules.pipe_spec END,
      combo_config = CASE WHEN p_legacy ? 'combo_config' THEN product_pricing_rules.combo_config || excluded.combo_config ELSE product_pricing_rules.combo_config END,
      direct_price = CASE WHEN p_legacy ? 'direct_price' THEN excluded.direct_price ELSE product_pricing_rules.direct_price END,
      granite_top_price = CASE WHEN p_legacy ? 'granite_top_price' THEN excluded.granite_top_price ELSE product_pricing_rules.granite_top_price END,
      wood_top_price = CASE WHEN p_legacy ? 'wood_top_price' THEN excluded.wood_top_price ELSE product_pricing_rules.wood_top_price END;
  END IF;

  INSERT INTO public.admin_audit_log (actor_email, action, target_table, target_id, summary)
  VALUES (p_actor, CASE WHEN is_new THEN 'CREATE' ELSE 'UPDATE' END, 'products', p_id,
    concat('Saved product ', next_product.sku));
  RETURN p_id;
END;
$$;

CREATE FUNCTION public.admin_catalog_variant_ready(v public.product_variants)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(
    v.is_active AND nullif(btrim(v.size_label), '') IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.build_categories b
      WHERE b.id = v.build_category_id AND b.is_active AND b.frame_material = v.frame_material)
    AND (v.surface_option_id IS NULL OR EXISTS (SELECT 1 FROM public.surface_options s
      WHERE s.id = v.surface_option_id AND s.is_active))
    AND (v.size_code = 'CUSTOM' OR (v.length_ft > 0 AND v.width_ft > 0 AND v.height_ft > 0)
      OR (v.size_code = 'STANDARD' AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = v.product_id
        AND p.base_length_ft > 0 AND p.base_width_ft > 0 AND p.base_height_ft > 0)))
    AND (
      v.availability = 'QUOTE_ONLY' OR (
        v.size_code <> 'CUSTOM' AND v.availability IN ('IN_STOCK', 'MADE_TO_ORDER')
        AND EXISTS (
          SELECT 1 FROM public.variant_pricing_private vp
          LEFT JOIN public.pricing_profiles pp ON pp.id = vp.pricing_profile_id AND pp.is_active
          WHERE vp.variant_id = v.id AND CASE
            WHEN vp.cost_source <> 'LEGACY_OVERRIDE' AND coalesce(vp.price_override_ex_gst, vp.price_override_inc_gst) IS NOT NULL
              THEN coalesce(vp.price_override_ex_gst, vp.price_override_inc_gst) > 0
            WHEN vp.manufacturing_cost > 0 THEN pp.default_margin_pct IS NOT NULL
            ELSE vp.cost_source = 'LEGACY_OVERRIDE' AND vp.price_override_ex_gst > 0
          END
        )
      )
    ), false);
$$;

CREATE FUNCTION public.admin_publish_catalog_product(
  p_id uuid, p_active boolean, p_expected_active boolean, p_actor text
)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  product public.products;
BEGIN
  SELECT * INTO STRICT product FROM public.products WHERE id = p_id FOR UPDATE;

  IF product.is_active IS DISTINCT FROM p_expected_active THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Publication status changed. Refresh the product and try again.';
  END IF;

  IF p_active THEN
    IF nullif(btrim(product.main_image_url), '') IS NULL OR product.main_image_url = '/images/product-placeholder.svg' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Upload a main photo before publishing.';
    END IF;
    IF nullif(btrim(product.short_description), '') IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Add a catalog description before publishing.';
    END IF;
    IF NOT coalesce(product.base_length_ft > 0 AND product.base_width_ft > 0 AND product.base_height_ft > 0, false) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Enter all three product dimensions before publishing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.product_variants v
      WHERE v.product_id = p_id AND v.is_active AND v.status = 'PUBLISHED')
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Publish at least one complete variant before publishing the product.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.product_variants v
      WHERE v.product_id = p_id AND v.is_active AND v.status = 'PUBLISHED'
        AND NOT public.admin_catalog_variant_ready(v))
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Complete the published variants or move them to draft before publishing.';
    END IF;
  END IF;

  UPDATE public.products SET is_active = p_active WHERE id = p_id;
  INSERT INTO public.admin_audit_log (actor_email, action, target_table, target_id, summary)
  VALUES (p_actor, CASE WHEN p_active THEN 'PUBLISH_PRODUCT' ELSE 'UNPUBLISH_PRODUCT' END,
    'products', p_id, concat('Updated publication status for ', product.sku));
  RETURN product.sku;
END;
$$;

CREATE FUNCTION public.admin_generate_catalog_variants(
  p_id uuid, p_rows jsonb, p_replace boolean, p_actor text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  product public.products;
  item record;
  variant_id uuid;
  was_active boolean;
  created int := 0;
  reactivated int := 0;
  disabled int := 0;
  matched_ids uuid[] := '{}';
BEGIN
  SELECT * INTO STRICT product FROM public.products WHERE id = p_id FOR UPDATE;

  FOR item IN SELECT * FROM jsonb_to_recordset(p_rows) AS r(
    variant_code text, frame_material text, build_category_id uuid, surface_option_id uuid,
    size_code text, size_label text, length_ft numeric, width_ft numeric, pricing_profile_id uuid
  ) LOOP
    SELECT v.id, v.is_active INTO variant_id, was_active FROM public.product_variants v
    WHERE v.product_id = p_id AND v.frame_material = item.frame_material
      AND v.build_category_id = item.build_category_id
      AND v.surface_option_id IS NOT DISTINCT FROM item.surface_option_id AND v.size_code = item.size_code
      AND right(v.variant_code, 8) <> '-DEFAULT'
    ORDER BY v.is_active DESC, v.created_at, v.id LIMIT 1 FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.product_variants (
        product_id, variant_code, frame_material, build_category_id, surface_option_id, size_code,
        size_label, length_ft, width_ft, height_ft, availability
      ) VALUES (
        p_id, item.variant_code, item.frame_material, item.build_category_id, item.surface_option_id,
        item.size_code, item.size_label, item.length_ft, item.width_ft, product.base_height_ft,
        CASE WHEN item.size_code = 'CUSTOM' THEN 'QUOTE_ONLY' ELSE 'MADE_TO_ORDER' END
      ) RETURNING id INTO variant_id;
      IF item.pricing_profile_id IS NOT NULL THEN
        INSERT INTO public.variant_pricing_private (variant_id, pricing_profile_id)
        VALUES (variant_id, item.pricing_profile_id);
      END IF;
      created := created + 1;
    ELSIF NOT was_active THEN
      UPDATE public.product_variants SET is_active = true, status = 'DRAFT', updated_at = now()
      WHERE id = variant_id;
      reactivated := reactivated + 1;
    END IF;

    matched_ids := array_append(matched_ids, variant_id);
  END LOOP;

  IF p_replace THEN
    IF product.is_active AND EXISTS (
      SELECT 1 FROM public.product_variants v WHERE v.product_id = p_id AND v.is_active
        AND v.status = 'PUBLISHED' AND v.id <> ALL(matched_ids) AND right(v.variant_code, 8) <> '-DEFAULT'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.product_variants v WHERE v.product_id = p_id AND v.is_active AND v.status = 'PUBLISHED'
        AND (v.id = ANY(matched_ids) OR right(v.variant_code, 8) = '-DEFAULT') AND public.admin_catalog_variant_ready(v)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Keep a complete published variant on the live product, or unpublish it first.';
    END IF;

    UPDATE public.product_variants SET is_active = false, status = 'DRAFT', updated_at = now()
    WHERE product_id = p_id AND is_active AND id <> ALL(matched_ids) AND right(variant_code, 8) <> '-DEFAULT';
    GET DIAGNOSTICS disabled = ROW_COUNT;
  END IF;

  INSERT INTO public.admin_audit_log (actor_email, action, target_table, target_id, summary)
  VALUES (p_actor, 'GENERATE_VARIANTS', 'product_variants', p_id,
    format('Variants for %s: %s created, %s reactivated, %s disabled', product.sku, created, reactivated, disabled));
  RETURN jsonb_build_object('created', created, 'reactivated', reactivated, 'disabled', disabled);
END;
$$;

CREATE FUNCTION public.admin_save_catalog_variant_costs(
  p_id uuid, p_ids uuid[], p_details jsonb, p_pricing jsonb, p_expected jsonb, p_actor text
)
RETURNS int LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  product public.products;
  variant public.product_variants;
  next_variant public.product_variants;
  old_pricing public.variant_pricing_private;
  next_pricing public.variant_pricing_private;
  cost_changed boolean;
  demoted boolean := false;
  changed int := 0;
BEGIN
  SELECT * INTO STRICT product FROM public.products WHERE id = p_id FOR UPDATE;

  FOR variant IN SELECT * FROM public.product_variants v
    WHERE v.product_id = p_id AND v.is_active AND v.id = ANY(p_ids) ORDER BY v.id FOR UPDATE
  LOOP
    SELECT * INTO old_pricing FROM public.variant_pricing_private WHERE variant_id = variant.id FOR UPDATE;
    IF p_expected IS NOT NULL AND (
      variant.updated_at IS DISTINCT FROM (p_expected->>'variant')::timestamptz OR
      old_pricing.updated_at IS DISTINCT FROM (p_expected->>'pricing')::timestamptz
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'This variant changed since you opened it. Refresh the page and try again.';
    END IF;

    IF p_pricing <> '{}'::jsonb THEN
      next_pricing := jsonb_populate_record(old_pricing, p_pricing);
      IF next_pricing.pricing_profile_id IS DISTINCT FROM old_pricing.pricing_profile_id
        AND next_pricing.pricing_profile_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.pricing_profiles WHERE id = next_pricing.pricing_profile_id AND is_active)
      THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Choose an active pricing profile.';
      END IF;
      cost_changed := next_pricing.manufacturing_cost IS DISTINCT FROM old_pricing.manufacturing_cost;
      IF cost_changed THEN
        next_pricing.cost_source := CASE WHEN next_pricing.manufacturing_cost IS NULL THEN 'UNSET' ELSE 'MANUAL' END;
        next_pricing.cost_effective_from := CASE WHEN next_pricing.manufacturing_cost IS NOT NULL THEN current_date END;
      ELSIF next_pricing.price_override_ex_gst IS DISTINCT FROM old_pricing.price_override_ex_gst
        AND old_pricing.cost_source = 'LEGACY_OVERRIDE'
      THEN
        next_pricing.cost_source := 'MANUAL';
      END IF;

      INSERT INTO public.variant_pricing_private (
        variant_id, manufacturing_cost, cost_source, cost_effective_from, pricing_profile_id,
        price_override_ex_gst, min_selling_price, updated_by
      ) VALUES (
        variant.id, next_pricing.manufacturing_cost, coalesce(next_pricing.cost_source, 'UNSET'), next_pricing.cost_effective_from,
        next_pricing.pricing_profile_id, next_pricing.price_override_ex_gst, next_pricing.min_selling_price, p_actor
      )
      ON CONFLICT (variant_id) DO UPDATE SET
        manufacturing_cost = excluded.manufacturing_cost, cost_source = excluded.cost_source,
        cost_effective_from = excluded.cost_effective_from, pricing_profile_id = excluded.pricing_profile_id,
        price_override_ex_gst = excluded.price_override_ex_gst, min_selling_price = excluded.min_selling_price,
        updated_by = excluded.updated_by, updated_at = now();

      IF cost_changed THEN
        INSERT INTO public.price_history (entity_type, entity_id, variant_id, field, old_value, new_value, source, actor_email)
        VALUES ('VARIANT_PRICING', variant.id, variant.id, 'manufacturing_cost', old_pricing.manufacturing_cost,
          next_pricing.manufacturing_cost, 'MANUAL', p_actor);
      END IF;
    END IF;

    next_variant := jsonb_populate_record(variant, p_details);
    UPDATE public.product_variants SET status = next_variant.status, availability = next_variant.availability,
      lead_time_days = next_variant.lead_time_days, updated_at = now()
    WHERE id = variant.id;

    IF next_variant.status = 'PUBLISHED' AND NOT public.admin_catalog_variant_ready(next_variant) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = concat('Complete ', variant.variant_code,
        ' before publishing. Check dimensions, availability and pricing, or set it to quote only.');
    END IF;
    demoted := demoted OR (variant.status = 'PUBLISHED' AND next_variant.status = 'DRAFT');
    changed := changed + 1;
  END LOOP;

  IF changed <> cardinality(p_ids) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'One or more variants are no longer available on this product.';
  END IF;
  IF demoted AND product.is_active AND NOT EXISTS (
    SELECT 1 FROM public.product_variants v WHERE v.product_id = p_id AND v.is_active
      AND v.status = 'PUBLISHED' AND public.admin_catalog_variant_ready(v)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Keep a complete published variant on the live product, or unpublish it first.';
  END IF;

  INSERT INTO public.admin_audit_log (actor_email, action, target_table, target_id, summary)
  VALUES (p_actor, 'UPDATE_VARIANT_COSTING', 'product_variants', p_id, format('Updated %s variants', changed));
  RETURN changed;
END;
$$;

CREATE FUNCTION public.admin_save_catalog_seo(p_seo jsonb, p_actor text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  seo public.product_seo := jsonb_populate_record(NULL::public.product_seo, p_seo);
BEGIN
  INSERT INTO public.product_seo (product_id, seo_title, meta_description, product_h1, image_alt_text, og_image_url)
  VALUES (seo.product_id, seo.seo_title, seo.meta_description, seo.product_h1, seo.image_alt_text, seo.og_image_url)
  ON CONFLICT (product_id) DO UPDATE SET seo_title = excluded.seo_title, meta_description = excluded.meta_description,
    product_h1 = excluded.product_h1, image_alt_text = excluded.image_alt_text, og_image_url = excluded.og_image_url,
    updated_at = now();
  INSERT INTO public.admin_audit_log (actor_email, action, target_table, target_id, summary)
  VALUES (p_actor, 'SAVE_PRODUCT_SEO', 'product_seo', seo.product_id, 'Updated SEO metadata');
END;
$$;

CREATE FUNCTION public.admin_duplicate_catalog_product(p_id uuid, p_actor text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  source public.products;
  draft_id uuid;
  prefix text;
  new_sku text;
  suffix text;
BEGIN
  SELECT * INTO STRICT source FROM public.products WHERE id = p_id FOR SHARE;
  prefix := rtrim(left(source.sku, 42), '-');

  FOR attempt IN 1..99 LOOP
    suffix := CASE WHEN attempt = 1 THEN '-COPY' ELSE concat('-COPY', attempt) END;
    new_sku := concat(prefix, suffix);
    INSERT INTO public.products (
      sku, name, category, product_type, base_length_ft, base_width_ft, base_height_ft,
      allowed_top_categories, frame_material, short_description, is_knockdown_available,
      warranty_text, main_image_url, is_active, use_cases, material_tags, sort_order, top_overlay_note
    ) VALUES (
      new_sku, concat(left(source.name, 153), ' (Copy)'), source.category, source.product_type,
      source.base_length_ft, source.base_width_ft, source.base_height_ft, source.allowed_top_categories,
      source.frame_material, source.short_description, source.is_knockdown_available, source.warranty_text,
      '/images/product-placeholder.svg', false, source.use_cases, source.material_tags,
      source.sort_order, source.top_overlay_note
    )
    ON CONFLICT (sku) DO NOTHING RETURNING id INTO draft_id;
    EXIT WHEN draft_id IS NOT NULL;
  END LOOP;

  IF draft_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Unable to allocate a model number for the duplicate.';
  END IF;

  INSERT INTO public.product_pricing_rules (
    product_id, base_pipe_weight_18g_kg, top_area_sqft, consumables_cost, labor_cost,
    overhead_pct, retail_margin_pct, b2b_margin_pct, finishing_cost, b2b_moq, combo_config, pipe_spec
  )
  SELECT draft_id, base_pipe_weight_18g_kg, top_area_sqft, consumables_cost, labor_cost,
    overhead_pct, retail_margin_pct, b2b_margin_pct, finishing_cost, b2b_moq, combo_config, pipe_spec
  FROM public.product_pricing_rules WHERE product_id = p_id;

  INSERT INTO public.product_visual_variants (
    product_id, top_material_code, top_tab, frame_color, preview_image_url, size_option, size_multiplier, selection_key
  )
  SELECT draft_id, top_material_code, top_tab, frame_color, '/images/product-placeholder.svg',
    size_option, size_multiplier, selection_key
  FROM public.product_visual_variants WHERE product_id = p_id;

  INSERT INTO public.admin_audit_log (actor_email, action, target_table, target_id, summary)
  VALUES (p_actor, 'DUPLICATE', 'products', draft_id, concat('Duplicated ', source.sku, ' as ', new_sku));
  RETURN draft_id;
END;
$$;

CREATE FUNCTION public.admin_save_catalog_options(p_id uuid, p_type text, p_options jsonb, p_actor text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  model_type text;
BEGIN
  SELECT product_type INTO STRICT model_type FROM public.products WHERE id = p_id FOR UPDATE;
  IF (CASE WHEN model_type = 'CHAIR_TABLE_SET' THEN 'TABLE' ELSE model_type END) <> p_type THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'The product type has changed.';
  END IF;
  INSERT INTO public.product_option_availability (product_id, option_code, is_enabled)
  SELECT p_id, option_code, is_enabled FROM jsonb_to_recordset(p_options) AS r(option_code text, is_enabled boolean)
  ON CONFLICT (product_id, option_code) DO UPDATE SET is_enabled = excluded.is_enabled;
  INSERT INTO public.admin_audit_log (actor_email, action, target_table, target_id, summary)
  VALUES (p_actor, 'UPDATE', 'product_option_availability', p_id, 'Saved product option availability');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_catalog_product(uuid, jsonb, jsonb, text),
  public.admin_catalog_variant_ready(public.product_variants),
  public.admin_publish_catalog_product(uuid, boolean, boolean, text),
  public.admin_generate_catalog_variants(uuid, jsonb, boolean, text),
  public.admin_save_catalog_variant_costs(uuid, uuid[], jsonb, jsonb, jsonb, text),
  public.admin_save_catalog_seo(jsonb, text),
  public.admin_duplicate_catalog_product(uuid, text),
  public.admin_save_catalog_options(uuid, text, jsonb, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_save_catalog_product(uuid, jsonb, jsonb, text),
  public.admin_catalog_variant_ready(public.product_variants),
  public.admin_publish_catalog_product(uuid, boolean, boolean, text),
  public.admin_generate_catalog_variants(uuid, jsonb, boolean, text),
  public.admin_save_catalog_variant_costs(uuid, uuid[], jsonb, jsonb, jsonb, text),
  public.admin_save_catalog_seo(jsonb, text),
  public.admin_duplicate_catalog_product(uuid, text),
  public.admin_save_catalog_options(uuid, text, jsonb, text)
  TO service_role;
