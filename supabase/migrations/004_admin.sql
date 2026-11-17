-- ==============================================================================
-- SANRA LIVING | Admin audit log and storage limits
-- Database Migration: 004_admin.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  summary TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_audit_log_at_idx
  ON admin_audit_log (at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public access to admin audit log" ON admin_audit_log;

ALTER TABLE product_visual_variants
  DROP CONSTRAINT IF EXISTS product_visual_variants_frame_color_check;

ALTER TABLE product_visual_variants
  ADD CONSTRAINT product_visual_variants_frame_color_check
  CHECK (frame_color IN ('MATTE_BLACK', 'WHITE', 'GREY', 'GOLD', 'RAW', 'SS'));

UPDATE storage.buckets
SET
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'product-images';
