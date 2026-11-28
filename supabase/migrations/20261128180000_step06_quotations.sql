-- STEP 06: Persistent Quotations, Quote Line Items, and Private Cost Snapshots.

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  city TEXT,
  delivery_notes TEXT,
  lead_source TEXT NOT NULL DEFAULT 'WEB_ENQUIRY'
    CHECK (lead_source IN ('WEB_ENQUIRY', 'WHATSAPP_ENQUIRY', 'BULK_PDF', 'ADMIN_MANUAL')),
  status TEXT NOT NULL DEFAULT 'NEW_ENQUIRY'
    CHECK (status IN ('NEW_ENQUIRY', 'QUOTATION_SENT', 'NEGOTIATION', 'CONFIRMED', 'EXPIRED', 'CLOSED')),
  price_basis TEXT CHECK (price_basis IN ('GST_INCLUSIVE', 'GST_EXCLUSIVE', 'MIXED', 'QUOTE_ONLY')),
  gst_rate NUMERIC(5, 2) DEFAULT 18.00,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  valid_until DATE NOT NULL,
  notes_internal TEXT,
  converted_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  whatsapp_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  public_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantity INT NOT NULL CHECK (quantity >= 1),
  unit_price NUMERIC(12, 2),
  negotiated_unit_price NUMERIC(12, 2),
  line_total NUMERIC(12, 2),
  price_basis TEXT,
  requires_quote BOOLEAN NOT NULL DEFAULT false,
  lead_time_days INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);

CREATE TABLE IF NOT EXISTS public.quote_item_costs (
  quote_item_id UUID PRIMARY KEY REFERENCES public.quote_items(id) ON DELETE CASCADE,
  manufacturing_cost_snapshot NUMERIC(12, 2),
  cost_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Strict privacy: zero anon/authenticated policies on quote tables.
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_item_costs ENABLE ROW LEVEL SECURITY;
