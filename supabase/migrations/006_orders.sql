-- ==============================================================================
-- SANRA LIVING | Order tracking, stage events, private photos and warranty
-- Database Migration: 006_orders.sql
-- ==============================================================================

-- 1. EXTEND THE EXISTING ORDERS TABLE
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name_full TEXT NULL,
  ADD COLUMN IF NOT EXISTS warranty_years INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS delivered_on DATE NULL,
  ADD COLUMN IF NOT EXISTS notes_internal TEXT NULL,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Keep the existing random SANRA-XXXX generator. Never replace it with a
-- sequence, date-based code or counter.

CREATE INDEX IF NOT EXISTS orders_archived_created_at_idx
  ON public.orders (archived, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_phone_last_4_idx
  ON public.orders (phone_last_4);

-- 2. PRIVATE STAGE EVENTS
CREATE TABLE IF NOT EXISTS public.order_stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (
    stage IN ('PIPE_CUT', 'WELDED', 'COATED', 'MASTER_CHECKED', 'READY')
  ),
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT NULL
);

CREATE INDEX IF NOT EXISTS order_stage_events_order_at_idx
  ON public.order_stage_events (order_id, at ASC);

ALTER TABLE public.order_stage_events ENABLE ROW LEVEL SECURITY;

-- 3. PRIVATE ORDER PHOTOS
CREATE TABLE IF NOT EXISTS public.order_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_visible_to_customer BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS order_photos_order_at_idx
  ON public.order_photos (order_id, at DESC);

ALTER TABLE public.order_photos ENABLE ROW LEVEL SECURITY;

-- 4. PRIVATE TRACKING ATTEMPTS (HASHED IP ONLY)
CREATE TABLE IF NOT EXISTS public.tracking_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracking_attempts_code_at_idx
  ON public.tracking_attempts (tracking_code, at DESC);

CREATE INDEX IF NOT EXISTS tracking_attempts_ip_at_idx
  ON public.tracking_attempts (ip_hash, at DESC);

ALTER TABLE public.tracking_attempts ENABLE ROW LEVEL SECURITY;

-- 5. PRIVATE STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-photos',
  'order-photos',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- CRITICAL: orders, order_stage_events, order_photos and tracking_attempts
-- have RLS enabled and NO policies for anon or authenticated. They are
-- service-role only. The order-photos bucket is private and has no public
-- storage.objects policy. Never add a customer-facing policy to these objects.
