-- STEP 02 Variant, Build Category, Surface, Pricing Profile & Bulk Rules Architecture
-- Additive migration. Preserves existing products, SKUs, URLs, orders, leads, and projects.

-- 1. Public build categories (Economy, Standard, Heavy Duty)
CREATE TABLE IF NOT EXISTS public.build_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  frame_material TEXT NOT NULL CHECK (frame_material IN ('SS', 'MS')),
  level TEXT NOT NULL CHECK (level IN ('ECONOMY', 'STANDARD', 'HEAVY_DUTY')),
  public_label TEXT NOT NULL CHECK (public_label IN ('Economy', 'Standard', 'Heavy Duty')),
  public_description TEXT,
  public_spec_summary TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Private gauge and nominal pipe thickness mapping (never exposed publicly)
CREATE TABLE IF NOT EXISTS public.build_category_specs_private (
  build_category_id UUID PRIMARY KEY REFERENCES public.build_categories(id) ON DELETE CASCADE,
  gauge_code TEXT NOT NULL,
  nominal_thickness_mm NUMERIC(5, 2) NOT NULL CHECK (nominal_thickness_mm > 0),
  legacy_gauge_code TEXT,
  internal_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Public surface options (tabletop, seat, frame-only)
CREATE TABLE IF NOT EXISTS public.surface_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('TABLETOP', 'SEAT', 'FRAME_ONLY')),
  label TEXT NOT NULL,
  material_family TEXT,
  public_description TEXT,
  applicable_product_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Economic product variants (public-safe fields only)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_code TEXT NOT NULL UNIQUE,
  frame_material TEXT NOT NULL CHECK (frame_material IN ('SS', 'MS')),
  build_category_id UUID NOT NULL REFERENCES public.build_categories(id),
  surface_option_id UUID REFERENCES public.surface_options(id),
  size_code TEXT NOT NULL,
  size_label TEXT NOT NULL,
  length_ft NUMERIC(6, 2) CHECK (length_ft IS NULL OR length_ft > 0),
  width_ft NUMERIC(6, 2) CHECK (width_ft IS NULL OR width_ft > 0),
  height_ft NUMERIC(6, 2) CHECK (height_ft IS NULL OR height_ft > 0),
  finish_label TEXT,
  variant_image_url TEXT,
  availability TEXT NOT NULL DEFAULT 'MADE_TO_ORDER'
    CHECK (availability IN ('IN_STOCK', 'MADE_TO_ORDER', 'QUOTE_ONLY', 'UNAVAILABLE')),
  lead_time_days INT CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_lookup
  ON public.product_variants(product_id, frame_material, build_category_id, surface_option_id, size_code);

-- Link visual variants optionally to economic variants
ALTER TABLE public.product_visual_variants
  ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

-- 5. Private pricing profiles (no hardcoded/invented margin defaults)
CREATE TABLE IF NOT EXISTS public.pricing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'RETAIL' CHECK (channel IN ('RETAIL', 'B2B')),
  margin_type TEXT NOT NULL DEFAULT 'GROSS_MARGIN' CHECK (margin_type IN ('GROSS_MARGIN', 'MARKUP')),
  default_margin_pct NUMERIC(6, 2) CHECK (default_margin_pct IS NULL OR (default_margin_pct >= 0 AND default_margin_pct < 100)),
  min_margin_pct NUMERIC(6, 2) CHECK (min_margin_pct IS NULL OR (min_margin_pct >= 0 AND min_margin_pct < 100)),
  rounding_rule TEXT NOT NULL DEFAULT 'UP_99'
    CHECK (rounding_rule IN ('NONE', 'UP_9', 'UP_99', 'UP_10', 'UP_50', 'UP_100', 'NEAREST_99')),
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00 CHECK (gst_rate >= 0 AND gst_rate <= 100),
  gst_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE' CHECK (gst_mode IN ('INCLUSIVE', 'EXCLUSIVE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Private per-variant manufacturing cost & pricing overrides
CREATE TABLE IF NOT EXISTS public.variant_pricing_private (
  variant_id UUID PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE CASCADE,
  manufacturing_cost NUMERIC(12, 2) CHECK (manufacturing_cost IS NULL OR manufacturing_cost >= 0),
  cost_source TEXT NOT NULL DEFAULT 'UNSET'
    CHECK (cost_source IN ('UNSET', 'EXCEL_IMPORT', 'MANUAL', 'LEGACY_OVERRIDE')),
  cost_effective_from DATE,
  pricing_profile_id UUID REFERENCES public.pricing_profiles(id),
  price_override_ex_gst NUMERIC(12, 2) CHECK (price_override_ex_gst IS NULL OR price_override_ex_gst >= 0),
  price_override_inc_gst NUMERIC(12, 2) CHECK (price_override_inc_gst IS NULL OR price_override_inc_gst >= 0),
  min_selling_price NUMERIC(12, 2) CHECK (min_selling_price IS NULL OR min_selling_price >= 0),
  internal_notes TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Private quantity pricing tiers
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('PRODUCT_TYPE', 'PRODUCT', 'VARIANT')),
  product_type TEXT CHECK (product_type IS NULL OR product_type IN ('TABLE', 'CHAIR', 'STAND', 'RACK', 'SS_UNIT', 'SET')),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  min_qty INT NOT NULL CHECK (min_qty >= 1),
  max_qty INT CHECK (max_qty IS NULL OR max_qty >= min_qty),
  model TEXT NOT NULL CHECK (model IN ('DISCOUNT_PCT', 'FIXED_UNIT_PRICE', 'MARGIN_PCT', 'QUOTE_REQUIRED')),
  value NUMERIC(12, 2) CHECK (value IS NULL OR value >= 0),
  priority INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_scope ON public.pricing_tiers(scope, product_type, product_id, variant_id);

-- 8. Private configurable bulk & MOQ rules
CREATE TABLE IF NOT EXISTS public.bulk_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type TEXT NOT NULL UNIQUE CHECK (product_type IN ('TABLE', 'CHAIR', 'STAND', 'RACK', 'SS_UNIT', 'SET')),
  min_qty INT NOT NULL CHECK (min_qty >= 1),
  below_min_action TEXT NOT NULL DEFAULT 'QUOTE_REQUIRED'
    CHECK (below_min_action IN ('SURCHARGE_PCT', 'QUOTE_REQUIRED', 'BLOCK')),
  below_min_value NUMERIC(10, 2) CHECK (below_min_value IS NULL OR below_min_value >= 0),
  special_quote_qty INT CHECK (special_quote_qty IS NULL OR special_quote_qty >= min_qty),
  special_quote_action TEXT NOT NULL DEFAULT 'QUOTE_REQUIRED'
    CHECK (special_quote_action IN ('QUOTE_REQUIRED', 'NONE')),
  scope TEXT NOT NULL DEFAULT 'LINE' CHECK (scope IN ('LINE', 'BASKET')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Private Excel/CSV cost import batches & staged rows
CREATE TABLE IF NOT EXISTS public.cost_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  checksum TEXT NOT NULL,
  row_count INT NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  status TEXT NOT NULL DEFAULT 'STAGED' CHECK (status IN ('STAGED', 'VALIDATED', 'APPLIED', 'FAILED', 'CANCELLED')),
  mapping_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  applied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.cost_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.cost_import_batches(id) ON DELETE CASCADE,
  row_number INT NOT NULL CHECK (row_number >= 1),
  sku TEXT NOT NULL,
  variant_code TEXT NOT NULL,
  manufacturing_cost NUMERIC(12, 2) CHECK (manufacturing_cost IS NULL OR manufacturing_cost >= 0),
  effective_from DATE,
  validation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cost_import_rows_batch_id ON public.cost_import_rows(batch_id);

-- 10. Private append-only price history
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('VARIANT_PRICING', 'PRICING_PROFILE', 'PRICING_TIER', 'BULK_RULE')),
  entity_id UUID NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  source TEXT NOT NULL CHECK (source IN ('MANUAL', 'EXCEL_IMPORT', 'MIGRATION')),
  actor_email TEXT NOT NULL,
  batch_id UUID REFERENCES public.cost_import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_price_history_variant_id ON public.price_history(variant_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.build_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_category_specs_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surface_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_pricing_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Public read-only policies on safe catalog tables only.
-- All private tables have RLS enabled with ZERO anon/authenticated policies.
DROP POLICY IF EXISTS "Public read active build categories" ON public.build_categories;
CREATE POLICY "Public read active build categories"
  ON public.build_categories FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Public read active surface options" ON public.surface_options;
CREATE POLICY "Public read active surface options"
  ON public.surface_options FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Public read published product variants" ON public.product_variants;
CREATE POLICY "Public read published product variants"
  ON public.product_variants FOR SELECT TO anon, authenticated
  USING (is_active = true AND status = 'PUBLISHED');

-- ── Seed reference data ───────────────────────────────────────────────────────
INSERT INTO public.build_categories (code, frame_material, level, public_label, public_description, sort_order)
VALUES
  ('SS_ECONOMY', 'SS', 'ECONOMY', 'Economy', 'Commercial stainless steel — Economy grade', 10),
  ('SS_STANDARD', 'SS', 'STANDARD', 'Standard', 'Commercial stainless steel — Standard grade', 20),
  ('SS_HEAVY_DUTY', 'SS', 'HEAVY_DUTY', 'Heavy Duty', 'Commercial stainless steel — Heavy Duty grade', 30),
  ('MS_ECONOMY', 'MS', 'ECONOMY', 'Economy', 'Powder-coated mild steel — Economy grade', 40),
  ('MS_STANDARD', 'MS', 'STANDARD', 'Standard', 'Powder-coated mild steel — Standard grade', 50),
  ('MS_HEAVY_DUTY', 'MS', 'HEAVY_DUTY', 'Heavy Duty', 'Powder-coated mild steel — Heavy Duty grade', 60)
ON CONFLICT (code) DO UPDATE SET
  public_label = EXCLUDED.public_label,
  public_description = EXCLUDED.public_description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.build_category_specs_private (build_category_id, gauge_code, nominal_thickness_mm, legacy_gauge_code)
SELECT id,
  CASE code
    WHEN 'SS_ECONOMY' THEN '20G'
    WHEN 'SS_STANDARD' THEN '18G'
    WHEN 'SS_HEAVY_DUTY' THEN '16G'
    WHEN 'MS_ECONOMY' THEN '19G'
    WHEN 'MS_STANDARD' THEN '18G'
    WHEN 'MS_HEAVY_DUTY' THEN '16G'
  END,
  CASE code
    WHEN 'SS_ECONOMY' THEN 0.90
    WHEN 'SS_STANDARD' THEN 1.20
    WHEN 'SS_HEAVY_DUTY' THEN 1.60
    WHEN 'MS_ECONOMY' THEN 1.00
    WHEN 'MS_STANDARD' THEN 1.20
    WHEN 'MS_HEAVY_DUTY' THEN 1.60
  END,
  CASE code
    WHEN 'SS_STANDARD' THEN 'SS202'
    WHEN 'SS_HEAVY_DUTY' THEN 'SS304'
    WHEN 'MS_ECONOMY' THEN 'G18'
    WHEN 'MS_STANDARD' THEN 'G16'
    WHEN 'MS_HEAVY_DUTY' THEN 'G14'
    ELSE NULL
  END
FROM public.build_categories
ON CONFLICT (build_category_id) DO UPDATE SET
  gauge_code = EXCLUDED.gauge_code,
  nominal_thickness_mm = EXCLUDED.nominal_thickness_mm,
  legacy_gauge_code = EXCLUDED.legacy_gauge_code;

INSERT INTO public.surface_options (code, kind, label, material_family, applicable_product_types, sort_order)
VALUES
  ('RUBBERWOOD', 'TABLETOP', 'Rubberwood', 'WOOD', ARRAY['TABLE'], 10),
  ('PLYWOOD', 'TABLETOP', 'Plywood', 'WOOD', ARRAY['TABLE'], 20),
  ('PARTICLE_BOARD', 'TABLETOP', 'Particle Board', 'WOOD', ARRAY['TABLE'], 30),
  ('GRANITE', 'TABLETOP', 'Granite', 'STONE', ARRAY['TABLE'], 40),
  ('CUSHION_UPHOLSTERY', 'SEAT', 'Cushion / Upholstery', 'UPHOLSTERY', ARRAY['CHAIR'], 50),
  ('METAL_SEAT', 'SEAT', 'Metal Seat', 'METAL', ARRAY['CHAIR'], 60),
  ('FRAME_ONLY', 'FRAME_ONLY', 'Frame Only', 'METAL', ARRAY['TABLE'], 70)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  applicable_product_types = EXCLUDED.applicable_product_types,
  sort_order = EXCLUDED.sort_order;

-- Configurable business quantity defaults (no profit margins invented)
INSERT INTO public.bulk_rules (product_type, min_qty, below_min_action, special_quote_qty, special_quote_action, scope)
VALUES
  ('CHAIR', 20, 'QUOTE_REQUIRED', 50, 'QUOTE_REQUIRED', 'LINE'),
  ('TABLE', 10, 'QUOTE_REQUIRED', 50, 'QUOTE_REQUIRED', 'LINE'),
  ('SET', 10, 'QUOTE_REQUIRED', NULL, 'NONE', 'LINE')
ON CONFLICT (product_type) DO NOTHING;
