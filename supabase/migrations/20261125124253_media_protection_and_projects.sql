BEGIN;

-- Provision private media buckets while the existing app still serves legacy URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('sanra-image-originals', 'sanra-image-originals', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('sanra-image-derivatives', 'sanra-image-derivatives', false, 8388608, ARRAY['image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id IN ('sanra-image-originals', 'sanra-image-derivatives') AND public IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'Media provisioning blocked: an existing media bucket is public.';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "SANRA image service access only" ON storage.objects;
CREATE POLICY "SANRA image service access only"
  ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id NOT IN ('sanra-image-originals', 'sanra-image-derivatives'))
  WITH CHECK (bucket_id NOT IN ('sanra-image-originals', 'sanra-image-derivatives'));


CREATE TABLE IF NOT EXISTS public.supply_projects (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  product_type text NOT NULL CHECK (char_length(product_type) BETWEEN 2 AND 100),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  location text NOT NULL CHECK (char_length(location) BETWEEN 2 AND 120),
  delivery_date date,
  delivery_details text CHECK (char_length(delivery_details) <= 800),
  photo_urls text[] NOT NULL DEFAULT '{}' CHECK (cardinality(photo_urls) <= 8),
  published boolean NOT NULL DEFAULT false CHECK (NOT published OR cardinality(photo_urls) > 0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supply_projects_published_delivery_idx
  ON public.supply_projects (delivery_date DESC NULLS LAST, created_at DESC) WHERE published;

ALTER TABLE public.supply_projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.supply_projects FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.supply_projects TO service_role;

-- Owner-only inventory for staging and cutover. No Storage metadata is changed here.
CREATE SCHEMA IF NOT EXISTS sanra_internal;
REVOKE ALL ON SCHEMA sanra_internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW sanra_internal.legacy_media_readiness AS
WITH image_references AS (
  SELECT 'product ' || p.sku || '/' || image.slot AS reference, image.url
  FROM public.products AS p
  CROSS JOIN LATERAL (
    VALUES ('main', p.main_image_url), ('alternate', p.hover_blueprint_img)
  ) AS image(slot, url)
  UNION ALL
  SELECT 'product ' || p.sku || '/top/' || image.key, image.value
  FROM public.products AS p
  CROSS JOIN LATERAL jsonb_each_text(
    CASE WHEN jsonb_typeof(p.top_category_images) = 'object' THEN p.top_category_images ELSE '{}'::jsonb END
  ) AS image
  UNION ALL
  SELECT 'product ' || p.sku || '/gallery', image.url
  FROM public.products AS p
  CROSS JOIN LATERAL unnest(p.gallery_images) AS image(url)
  UNION ALL
  SELECT 'set ' || s.sku || '/' || image.slot, image.url
  FROM public.product_sets AS s
  CROSS JOIN LATERAL (
    VALUES ('main', s.main_image_url), ('alternate', s.hover_image_url)
  ) AS image(slot, url)
  UNION ALL
  SELECT 'variant ' || v.id, v.preview_image_url FROM public.product_visual_variants AS v
  UNION ALL
  SELECT 'swatch ' || opt.option_group || '/' || opt.option_code, opt.swatch_texture_img
  FROM public.configurator_options AS opt
), remote_images AS (
  SELECT url, array_agg(DISTINCT reference ORDER BY reference) AS references_in_catalog
  FROM image_references
  WHERE url ~* '^https?://'
  GROUP BY url
), storage_keys AS (
  SELECT url, references_in_catalog, substring(url FROM '^https?://[^/?#]+') AS source_origin,
    substring(url FROM '^https?://[^/?#]+/storage/v1/object/(?:public|authenticated)/product-images/([^?#]+)') AS legacy_key
  FROM remote_images
), media_keys AS (
  SELECT *,
    CASE WHEN char_length(legacy_key) <= 340
        AND legacy_key ~* '^(?:[a-z0-9][a-z0-9_.-]*/){1,6}[a-z0-9][a-z0-9_.-]*[.](?:jpe?g|png|webp)$'
      THEN 'catalog/legacy/' || legacy_key END AS media_key
  FROM storage_keys
)
SELECT k.references_in_catalog, k.url AS source_url, k.source_origin, k.legacy_key,
  '/api/media/' || k.media_key AS protected_url,
  original.id IS NOT NULL AS original_archived,
  full_image.id IS NOT NULL AS full_ready,
  mobile_image.id IS NOT NULL AS mobile_ready,
  CASE
    WHEN k.media_key IS NULL THEN 'unsupported_url'
    WHEN original.id IS NULL OR full_image.id IS NULL OR mobile_image.id IS NULL THEN 'missing_media'
    ELSE 'ready'
  END AS status
FROM media_keys AS k
LEFT JOIN storage.objects AS original
  ON original.bucket_id = 'sanra-image-originals' AND original.name = k.media_key
LEFT JOIN storage.objects AS full_image
  ON full_image.bucket_id = 'sanra-image-derivatives' AND full_image.name = k.media_key
LEFT JOIN storage.objects AS mobile_image
  ON mobile_image.bucket_id = 'sanra-image-derivatives' AND mobile_image.name = 'mobile/' || k.media_key;

REVOKE ALL ON sanra_internal.legacy_media_readiness FROM PUBLIC, anon, authenticated;
COMMIT;
