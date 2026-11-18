-- 013_sets.sql
-- Product sets and combos. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.product_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT,
  main_image_url TEXT,
  hover_image_url TEXT,
  use_cases TEXT[] NOT NULL DEFAULT '{}'::text[],
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.product_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active product sets" ON public.product_sets;
CREATE POLICY "Public read active product sets"
  ON public.product_sets
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.product_set_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES public.product_sets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 50),
  default_selection JSONB NOT NULL DEFAULT '{}'::jsonb,
  allow_customize BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 100
);

ALTER TABLE public.product_set_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product set items" ON public.product_set_items;
CREATE POLICY "Public read product set items"
  ON public.product_set_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.product_sets s
      WHERE s.id = product_set_items.set_id AND s.is_active = true
    )
  );

CREATE TABLE IF NOT EXISTS public.set_pricing (
  set_id UUID PRIMARY KEY REFERENCES public.product_sets(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL DEFAULT 'AMOUNT' CHECK (adjustment_type IN ('AMOUNT', 'PERCENT')),
  adjustment_value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.set_pricing ENABLE ROW LEVEL SECURITY;
-- No public policy: private pricing only.

CREATE INDEX IF NOT EXISTS product_set_items_set_idx
  ON public.product_set_items (set_id, sort_order);

CREATE INDEX IF NOT EXISTS product_set_items_product_idx
  ON public.product_set_items (product_id);

CREATE INDEX IF NOT EXISTS product_sets_active_sort_idx
  ON public.product_sets (is_active, sort_order);
