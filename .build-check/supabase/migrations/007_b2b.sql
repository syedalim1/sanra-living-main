-- ==============================================================================
-- SANRA LIVING | B2B leads, CAD files and private CAD storage
-- Database Migration: 007_b2b.sql
-- ==============================================================================

-- 1. PRIVATE LEADS
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('SAMPLE_REQUEST', 'CAD_DOWNLOAD', 'BULK_QUOTE')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NULL,
  company TEXT NULL,
  city TEXT NULL,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'CLOSED')),
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_kind_status_created_idx
  ON public.leads (kind, status, created_at DESC);

CREATE INDEX IF NOT EXISTS leads_phone_idx
  ON public.leads (phone);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 2. PRIVATE CAD FILES
CREATE TABLE IF NOT EXISTS public.cad_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('SKP', 'DWG')),
  storage_path TEXT NOT NULL,
  product_sku TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cad_files_active_created_idx
  ON public.cad_files (is_active, created_at DESC);

ALTER TABLE public.cad_files ENABLE ROW LEVEL SECURITY;

-- 3. PRIVATE CAD STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cad-files',
  'cad-files',
  false,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = NULL;

-- CRITICAL: leads and cad_files have RLS enabled and NO policies for anon or
-- authenticated. They are service-role only. The cad-files bucket is private
-- and has NO public storage.objects policy. Never add a customer-facing policy.
