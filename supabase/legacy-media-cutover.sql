-- Run only after the protected app is live, before making product-images private.
-- This script leaves existing bucket metadata, objects and catalog records intact.
BEGIN;

DO $$
DECLARE
  pending_images bigint;
BEGIN
  SELECT count(*) INTO pending_images
  FROM sanra_internal.legacy_media_readiness
  WHERE status <> 'ready';

  IF pending_images > 0 THEN
    RAISE EXCEPTION 'Legacy image cutover blocked: % URL(s) are not ready. Check sanra_internal.legacy_media_readiness.', pending_images;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-images') THEN
    RAISE EXCEPTION 'Legacy image cutover blocked: product-images does not exist.';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "SANRA legacy images service access only" ON storage.objects;
CREATE POLICY "SANRA legacy images service access only"
  ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'product-images')
  WITH CHECK (bucket_id <> 'product-images');

COMMIT;
