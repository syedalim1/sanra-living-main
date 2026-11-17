-- ==============================================================================
-- SANRA LIVING | Indian Make Steel Industries - SIDCO Coimbatore
-- Database Migration: 001_init.sql
-- ==============================================================================

-- 0. EXTENSIONS & FUNCTIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to generate random, non-sequential tracking codes: SANRA-XXXX
-- Uses uppercase letters (A-Z) and digits (0-9) excluding easily confused characters
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  chars CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code TEXT;
  exists_already BOOLEAN;
  i INT;
BEGIN
  LOOP
    code := 'SANRA-';
    FOR i IN 1..4 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    SELECT EXISTS (SELECT 1 FROM orders WHERE tracking_code = code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 1. MATERIAL_RATES (PRIVATE)
CREATE TABLE IF NOT EXISTS material_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('METAL', 'WOOD', 'STONE')),
  unit TEXT NOT NULL CHECK (unit IN ('KG', 'SQFT')),
  cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  swatch_color_hex TEXT,
  swatch_texture_img TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PRODUCTS (PUBLIC READ)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('TABLE', 'CHAIR', 'STAND', 'RACK', 'SS_UNIT')),
  base_length_ft NUMERIC(6, 2) NOT NULL,
  base_width_ft NUMERIC(6, 2) NOT NULL,
  allowed_top_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_knockdown_available BOOLEAN NOT NULL DEFAULT true,
  warranty_text TEXT NOT NULL DEFAULT '10-Yr MIG Structural Warranty',
  main_image_url TEXT NOT NULL,
  hover_blueprint_img TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. PRODUCT_PRICING_RULES (PRIVATE)
CREATE TABLE IF NOT EXISTS product_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  base_pipe_weight_18g_kg NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  top_area_sqft NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  consumables_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  labor_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  overhead_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  retail_margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  b2b_margin_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. PRODUCT_VISUAL_VARIANTS (PUBLIC READ)
CREATE TABLE IF NOT EXISTS product_visual_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  top_material_code TEXT,
  frame_color TEXT NOT NULL CHECK (frame_color IN ('MATTE_BLACK', 'WHITE', 'GREY', 'GOLD', 'SS')),
  preview_image_url TEXT NOT NULL,
  size_option TEXT NOT NULL,
  size_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ORDERS (PROTECTED)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code TEXT NOT NULL UNIQUE DEFAULT generate_tracking_code(),
  customer_name_masked TEXT NOT NULL,
  customer_phone_full TEXT NOT NULL,
  phone_last_4 VARCHAR(4) NOT NULL,
  configured_items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12, 2) NOT NULL,
  advance_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  current_stage TEXT NOT NULL DEFAULT 'PIPE_CUT' CHECK (
    current_stage IN ('PIPE_CUT', 'WELDED', 'COATED', 'MASTER_CHECKED', 'READY')
  ),
  wip_photo_url TEXT,
  warranty_expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. SECRET_JIG_VAULT (PRIVATE)
CREATE TABLE IF NOT EXISTS secret_jig_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_sku TEXT NOT NULL UNIQUE,
  pin_hole_coordinates TEXT NOT NULL,
  spigot_sleeve_spec TEXT NOT NULL,
  cut_list_bom_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. CASH_AND_WORKER_LOGS (PRIVATE)
CREATE TABLE IF NOT EXISTS cash_and_worker_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('CASH_SPLIT', 'WORKER_QUOTA')),
  bucket_1_amt NUMERIC(12, 2) DEFAULT 0.00,
  bucket_2_amt NUMERIC(12, 2) DEFAULT 0.00,
  bucket_3_amt NUMERIC(12, 2) DEFAULT 0.00,
  worker_name TEXT,
  frames_completed INT DEFAULT 0,
  bonus_amt NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS on ALL 7 tables
ALTER TABLE material_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_visual_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_jig_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_and_worker_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read active products" ON products;
DROP POLICY IF EXISTS "Public read visual variants" ON product_visual_variants;

-- Policy 1: products (anon and authenticated may SELECT only is_active = true)
CREATE POLICY "Public read active products"
  ON products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Policy 2: product_visual_variants (anon and authenticated may SELECT only)
CREATE POLICY "Public read visual variants"
  ON product_visual_variants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- CRITICAL NOTE ON REMAINING TABLES:
-- material_rates, product_pricing_rules, orders, secret_jig_vault, cash_and_worker_logs
-- NO policies are created for 'anon' or 'authenticated'.
-- Because RLS is ENABLED and no matching policy exists for anon/authenticated roles,
-- these tables are 100% BLOCKED from browser / client queries.
-- Only PostgreSQL superuser and the Supabase 'service_role' (which bypasses RLS) can access them.

-- ==============================================================================
-- STORAGE CONFIGURATION
-- ==============================================================================

-- Create public storage bucket: "product-images"
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[];

-- Policy: Allow public read access on product-images bucket
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Note: Uploads, updates, and deletes on storage.objects are restricted to service_role (no public policies created).

