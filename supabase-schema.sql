-- ============================================================
-- SANRA LIVING — Complete Supabase Database Schema
-- Run this in the Supabase SQL Editor (or via psql).
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PRODUCTS
-- ============================================================
create table products (
  id               uuid primary key default uuid_generate_v4(),
  sku              text not null unique,
  name             text not null,
  category         text not null,
  product_type     text not null check (product_type in ('TABLE','CHAIR','STAND','RACK','SS_UNIT')),
  base_length_ft   numeric not null default 0,
  base_width_ft    numeric not null default 0,
  allowed_top_categories text[] not null default '{}',
  is_knockdown_available boolean not null default false,
  warranty_text    text not null default '',
  main_image_url   text not null default '/images/product-placeholder.svg',
  hover_blueprint_img text,
  is_active        boolean not null default true,
  use_cases        text[] not null default '{}',
  material_tags    text[] not null default '{}',
  sort_order       integer not null default 100,
  top_overlay_note text,
  from_price       numeric,
  created_at       timestamptz not null default now()
);

create index idx_products_sku on products (sku);
create index idx_products_active on products (is_active);
create index idx_products_type on products (product_type);

-- ============================================================
-- 2. PRODUCT PRICING RULES  (1-to-1 with products)
-- ============================================================
create table product_pricing_rules (
  id                        uuid primary key default uuid_generate_v4(),
  product_id                uuid not null unique references products(id) on delete cascade,
  base_pipe_weight_18g_kg   numeric not null default 0,
  top_area_sqft             numeric not null default 0,
  consumables_cost          numeric not null default 0,
  labor_cost                numeric not null default 0,
  overhead_pct              numeric not null default 0,
  retail_margin_pct         numeric not null default 0,
  b2b_margin_pct            numeric not null default 0,
  created_at                timestamptz not null default now()
);

-- ============================================================
-- 3. PRODUCT VISUAL VARIANTS
-- ============================================================
create table product_visual_variants (
  id                 uuid primary key default uuid_generate_v4(),
  product_id         uuid not null references products(id) on delete cascade,
  top_material_code  text,
  frame_color        text not null default '',
  preview_image_url  text not null default '/images/product-placeholder.svg',
  size_option        text not null default '',
  size_multiplier    numeric not null default 1.0,
  selection_key      text,
  created_at         timestamptz not null default now()
);

create index idx_variants_product on product_visual_variants (product_id);

-- ============================================================
-- 4. CONFIGURATOR OPTIONS
-- ============================================================
create table configurator_options (
  id                  uuid primary key default uuid_generate_v4(),
  option_group        text not null,
  option_code         text not null unique,
  parent_code         text,
  label_en            text not null,
  group_label         text,
  swatch_color_hex    text,
  swatch_texture_img  text,
  spec_note           text,
  load_kg             numeric,
  warranty_text       text,
  badge_text          text,
  sort_order          integer not null default 100,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create index idx_config_options_group on configurator_options (option_group);
create index idx_config_options_active on configurator_options (is_active);

-- ============================================================
-- 5. PRODUCT TYPE OPTION GROUPS
-- ============================================================
create table product_type_option_groups (
  id             uuid primary key default uuid_generate_v4(),
  product_type   text not null check (product_type in ('TABLE','CHAIR','STAND','RACK','SS_UNIT')),
  option_group   text not null,
  group_title    text not null,
  sort_order     integer not null default 100,
  is_required    boolean not null default false,
  default_code   text,
  created_at     timestamptz not null default now(),
  unique (product_type, option_group)
);

create index idx_type_groups_type on product_type_option_groups (product_type);

-- ============================================================
-- 6. MATERIAL RATES
-- ============================================================
create table material_rates (
  id              uuid primary key default uuid_generate_v4(),
  material_code   text not null unique,
  display_name    text not null,
  category        text not null check (category in ('METAL','WOOD','STONE')),
  unit            text not null default '₹/kg',
  cost_per_unit   numeric not null default 0,
  updated_at      timestamptz default now()
);

-- ============================================================
-- 7. PRICING GLOBALS
-- ============================================================
create table pricing_globals (
  key             text primary key,
  numeric_value   numeric not null default 0,
  description     text,
  updated_at      timestamptz default now()
);

-- ============================================================
-- 8. OPTION PRICING
-- ============================================================
create table option_pricing (
  option_code            text primary key,
  material_code          text,
  metal_cost_multiplier  numeric not null default 1.0,
  flat_addon             numeric not null default 0,
  created_at             timestamptz not null default now()
);

-- ============================================================
-- 9. ORDERS
-- ============================================================
create table orders (
  id                     uuid primary key default uuid_generate_v4(),
  tracking_code          text not null unique default ('SLO-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 8))),
  customer_name_full     text,
  customer_name_masked   text not null,
  customer_phone_full    text not null,
  phone_last_4           text not null,
  configured_items_json  jsonb not null default '[]',
  total_amount           numeric not null default 0,
  advance_paid           numeric not null default 0,
  balance_due            numeric not null default 0,
  current_stage          text not null default 'PIPE_CUT' check (current_stage in ('PIPE_CUT','WELDED','COATED','MASTER_CHECKED','READY')),
  warranty_years         integer not null default 10,
  warranty_expiry_date   date,
  delivered_on           date,
  notes_internal         text,
  archived               boolean not null default false,
  created_at             timestamptz not null default now()
);

create index idx_orders_tracking on orders (tracking_code);
create index idx_orders_archived on orders (archived);
create index idx_orders_stage on orders (current_stage);

-- ============================================================
-- 10. ORDER STAGE EVENTS
-- ============================================================
create table order_stage_events (
  id         uuid primary key default uuid_generate_v4(),
  order_id   uuid not null references orders(id) on delete cascade,
  stage      text not null check (stage in ('PIPE_CUT','WELDED','COATED','MASTER_CHECKED','READY')),
  note       text,
  at         timestamptz not null default now()
);

create index idx_stage_events_order on order_stage_events (order_id);
create index idx_stage_events_at on order_stage_events (order_id, at);

-- ============================================================
-- 11. ORDER PHOTOS
-- ============================================================
create table order_photos (
  id                       uuid primary key default uuid_generate_v4(),
  order_id                 uuid not null references orders(id) on delete cascade,
  storage_path             text not null,
  caption                  text,
  is_visible_to_customer   boolean not null default false,
  at                       timestamptz not null default now()
);

create index idx_order_photos_order on order_photos (order_id);
create index idx_order_photos_visible on order_photos (order_id, is_visible_to_customer);

-- ============================================================
-- 12. TRACKING ATTEMPTS  (rate-limiting for order tracking)
-- ============================================================
create table tracking_attempts (
  id              uuid primary key default uuid_generate_v4(),
  tracking_code   text not null,
  ip_hash         text not null,
  ok              boolean not null default false,
  at              timestamptz not null default now()
);

create index idx_tracking_attempts_code on tracking_attempts (tracking_code, ok, at);

-- ============================================================
-- 13. LEADS
-- ============================================================
create table leads (
  id             uuid primary key default uuid_generate_v4(),
  kind           text not null check (kind in ('SAMPLE_REQUEST','CAD_DOWNLOAD','BULK_QUOTE')),
  name           text not null,
  phone          text not null,
  email          text,
  company        text,
  city           text,
  details_json   jsonb not null default '{}',
  status         text not null default 'NEW' check (status in ('NEW','CONTACTED','CLOSED')),
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);

create index idx_leads_status on leads (status);
create index idx_leads_kind on leads (kind);
create index idx_leads_archived on leads (archived);

-- ============================================================
-- 14. CAD FILES
-- ============================================================
create table cad_files (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  description    text,
  file_type      text not null check (file_type in ('SKP','DWG')),
  product_sku    text,
  storage_path   text not null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create index idx_cad_files_active on cad_files (is_active);

-- ============================================================
-- 15. ADMIN AUDIT LOG
-- ============================================================
create table admin_audit_log (
  id              uuid primary key default uuid_generate_v4(),
  at              timestamptz not null default now(),
  actor_email     text not null,
  action          text not null,
  target_table    text not null,
  target_id       text not null,
  summary         text not null
);

create index idx_audit_log_at on admin_audit_log (at desc);


-- ============================================================
-- 16. STORAGE BUCKETS  (create via Supabase Dashboard or API)
-- ============================================================
-- Run these in Supabase SQL Editor or use the Dashboard UI:

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('order-photos', 'order-photos', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('cad-files', 'cad-files', false)
  on conflict (id) do nothing;


-- ============================================================
-- 17. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table products enable row level security;
alter table product_pricing_rules enable row level security;
alter table product_visual_variants enable row level security;
alter table configurator_options enable row level security;
alter table product_type_option_groups enable row level security;
alter table material_rates enable row level security;
alter table pricing_globals enable row level security;
alter table option_pricing enable row level security;
alter table orders enable row level security;
alter table order_stage_events enable row level security;
alter table order_photos enable row level security;
alter table tracking_attempts enable row level security;
alter table leads enable row level security;
alter table cad_files enable row level security;
alter table admin_audit_log enable row level security;

-- ── Public read policies (anon + authenticated) ─────────────
-- Products catalog: anyone can read active products
create policy "Public read active products"
  on products for select using (is_active = true);

-- Configurator options: anyone can read active options
create policy "Public read active configurator options"
  on configurator_options for select using (is_active = true);

-- Product type option groups: anyone can read
create policy "Public read product type option groups"
  on product_type_option_groups for select using (true);

-- Material rates: anyone can read (needed for live pricing)
create policy "Public read material rates"
  on material_rates for select using (true);

-- Pricing globals: anyone can read (needed for live pricing)
create policy "Public read pricing globals"
  on pricing_globals for select using (true);

-- Option pricing: anyone can read (needed for live pricing)
create policy "Public read option pricing"
  on option_pricing for select using (true);

-- Visual variants: anyone can read
create policy "Public read visual variants"
  on product_visual_variants for select using (true);

-- Orders: public read for tracking (by tracking_code)
create policy "Public read orders by tracking code"
  on orders for select using (true);

-- Order stage events: anyone can read (for tracking)
create policy "Public read order stage events"
  on order_stage_events for select using (true);

-- Order photos: anyone can read visible photos
create policy "Public read visible order photos"
  on order_photos for select using (is_visible_to_customer = true);

-- CAD files: anyone can read active files
create policy "Public read active cad files"
  on cad_files for select using (is_active = true);

-- Tracking attempts: allow insert from anon (logging)
create policy "Anon insert tracking attempts"
  on tracking_attempts for insert with check (true);

-- Tracking attempts: allow select (for counting failures)
create policy "Anon select tracking attempts"
  on tracking_attempts for select using (true);

-- Leads: allow insert from anon (public lead forms)
create policy "Anon insert leads"
  on leads for insert with check (true);

-- ── Service-role full access (admin server actions) ─────────
-- The service_role key bypasses RLS, so admin server actions
-- using SUPABASE_SERVICE_ROLE_KEY have full CRUD access.
-- No explicit policies are needed for the service role.

-- ── Storage bucket policies ─────────────────────────────────
-- product-images bucket: public read
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- product-images bucket: service role upload/delete
create policy "Service upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

create policy "Service delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images');

-- order-photos bucket: service role upload/delete, signed URLs for read
create policy "Service upload order photos"
  on storage.objects for insert
  with check (bucket_id = 'order-photos');

create policy "Service read order photos"
  on storage.objects for select
  using (bucket_id = 'order-photos');

create policy "Service delete order photos"
  on storage.objects for delete
  using (bucket_id = 'order-photos');

-- cad-files bucket: service role upload/delete, signed URLs for read
create policy "Service upload cad files"
  on storage.objects for insert
  with check (bucket_id = 'cad-files');

create policy "Service read cad files"
  on storage.objects for select
  using (bucket_id = 'cad-files');

create policy "Service delete cad files"
  on storage.objects for delete
  using (bucket_id = 'cad-files');


-- ============================================================
-- 18. SEED DATA — MATERIAL RATES
-- ============================================================
insert into material_rates (material_code, display_name, category, unit, cost_per_unit) values
  ('MS_CR',              'MS Cold Rolled (Tata/Apollo)',         'METAL', '₹/kg',   78.50),
  ('SS_202',             'Jindal SS 202',                        'METAL', '₹/kg',  185.00),
  ('SS_304',             'Jindal SS 304',                        'METAL', '₹/kg',  260.00),
  ('WOOD_RUBBER_18',     'Kerala Rubberwood 18mm',               'WOOD',  '₹/sqft', 165.00),
  ('PRELAM_18',          'Pre-Lam Board 18mm',                   'WOOD',  '₹/sqft',  68.00),
  ('PRELAM_25',          'Pre-Lam Board 25mm',                   'WOOD',  '₹/sqft',  95.00),
  ('BWR_PLY_MICA',       'BWR Plywood + Mica 18mm',              'WOOD',  '₹/sqft', 140.00),
  ('WPC_OUTDOOR',        'WPC Outdoor Planks',                   'WOOD',  '₹/sqft', 220.00),
  ('GRANITE_JET_BLACK',  'Granite Jet Black 18mm',               'STONE', '₹/sqft', 210.00),
  ('GRANITE_GALAXY',     'Granite Black Galaxy 18mm',            'STONE', '₹/sqft', 245.00),
  ('GRANITE_KWHITE',     'Granite K-White 18mm',                 'STONE', '₹/sqft', 190.00),
  ('GRANITE_RED',        'Granite Ruby Red 18mm',                'STONE', '₹/sqft', 180.00),
  ('GRANITE_TAN_BROWN',  'Granite Tan Brown 18mm',               'STONE', '₹/sqft', 195.00),
  ('MARBLE_QUARTZ',      'Marble / Quartz 18mm',                 'STONE', '₹/sqft', 320.00),
  ('SHEET_PERFORATED',   'Perforated Sheet',                     'METAL', '₹/sqft', 145.00),
  ('SHEET_MESH',         'Expanded Diamond Mesh',                'METAL', '₹/sqft', 130.00),
  ('SHEET_CR_16G',       '16G Solid CR Sheet',                   'METAL', '₹/sqft', 180.00),
  ('SHEET_SS304',        'SS 304 Sheet',                         'METAL', '₹/sqft', 380.00)
on conflict (material_code) do nothing;

-- ============================================================
-- 19. SEED DATA — PRICING GLOBALS
-- ============================================================
insert into pricing_globals (key, numeric_value, description) values
  ('BUMPER_RATE_PER_FT',       65.00,  'Stone bumper frame cost per running foot'),
  ('CENTER_SUPPORT_FLAT',     280.00,  'Flat cost for center cross support (stone tops)'),
  ('KNOCKDOWN_PRICE_PCT',       0.00,  'Price adjustment % for flat-pack / knock-down build'),
  ('QTY_DISCOUNT_4_9_PCT',      5.00,  'Quantity discount % for 4-9 pieces'),
  ('QTY_DISCOUNT_10_PLUS_PCT', 12.00,  'Quantity discount % for 10+ pieces'),
  ('SS_WEIGHT_FACTOR',          1.05,  'Weight multiplier for stainless steel vs MS'),
  ('PACK2_SAVING',            150.00,  'Saving amount for pack of 2 nesting stands')
on conflict (key) do nothing;

-- ============================================================
-- 20. SEED DATA — OPTION PRICING
-- ============================================================
insert into option_pricing (option_code, material_code, metal_cost_multiplier, flat_addon) values
  -- Gauge multipliers
  ('G18',              'MS_CR',            1.00,    0),
  ('G16',              'MS_CR',            1.28,    0),
  ('G14',              'MS_CR',            1.60,    0),
  ('SS202',            'SS_202',           1.00,    0),
  ('SS304',            'SS_304',           1.00,    0),
  -- Frame colors
  ('MATTE_BLACK',       null,              1.00,    0),
  ('WHITE',             null,              1.00,    0),
  ('GREY',              null,              1.00,    0),
  ('RAW',               null,              1.00,    0),
  ('GOLD',              null,              1.00,  150),
  -- Add-ons
  ('GROMMET',           null,              1.00,   50),
  ('CPU_HOLDER',        null,              1.00,  150),
  ('CHAIRS4',           null,              1.00,  600),
  -- Chair metal types
  ('MS_COATED',        'MS_CR',            1.00,    0),
  -- Chair seats
  ('SEAT_RUBBER',      'WOOD_RUBBER_18',   1.00,    0),
  ('SEAT_REXINE',       null,              1.00,    0),
  ('SEAT_PERFORATED',  'SHEET_PERFORATED', 1.00,    0),
  -- Seat colors
  ('REXINE_BLACK',      null,              1.00,    0),
  ('REXINE_TAN',        null,              1.00,    0),
  ('REXINE_CHERRY',     null,              1.00,    0),
  -- Build types
  ('WELDED',            null,              1.00,    0),
  ('KNOCKDOWN',         null,              1.00,    0),
  -- Stand materials
  ('ST_MS',            'MS_CR',            1.00,    0),
  ('ST_SS304',         'SS_304',           1.00,    0),
  -- Stand packs
  ('PACK_1',            null,              1.00,    0),
  ('PACK_2',            null,              1.00,    0),
  -- Stand base types
  ('BASE_BUSH',         null,              1.00,    0),
  ('BASE_CASTOR',       null,              1.00,  350),
  -- Rack finishes
  ('RF_BLACK',          null,              1.00,    0),
  ('RF_GOLD_PAINT',     null,              1.00,  450),
  ('RF_GOLD_PVD',       null,              1.00,  900),
  -- Rack shelves
  ('SH_NONE',           null,              1.00,    0),
  ('SH_RUBBER',        'WOOD_RUBBER_18',   1.00,    0),
  ('SH_PRELAM_WHITE',  'PRELAM_18',        1.00,    0),
  ('SH_PRELAM_BLACK',  'PRELAM_18',        1.00,    0),
  -- Rack sizes
  ('R4',                null,              1.00,    0),
  ('R5',                null,              1.25,    0),
  ('R6',                null,              1.50,    0),
  -- SS Unit grades
  ('SSG_202',          'SS_202',           1.00,    0),
  ('SSG_304',          'SS_304',           1.00,    0),
  -- SS Unit thickness
  ('TH_18G',            null,              1.00,    0),
  ('TH_16G',            null,              1.28,    0),
  -- SS Unit finishes
  ('SSF_HAIRLINE',      null,              1.00,    0),
  ('SSF_MIRROR',        null,              1.00,  350),
  -- Top materials (linking to material rates)
  ('RUBBER_HONEY_TEAK',       'WOOD_RUBBER_18',    1.00, 0),
  ('RUBBER_DARK_WALNUT',      'WOOD_RUBBER_18',    1.00, 0),
  ('RUBBER_CLEAR_MATTE',      'WOOD_RUBBER_18',    1.00, 0),
  ('PRELAM_WHITE',            'PRELAM_25',         1.00, 0),
  ('PRELAM_CARBON_BLACK',     'PRELAM_25',         1.00, 0),
  ('PRELAM_LIGHT_OAK',        'PRELAM_25',         1.00, 0),
  ('PRELAM_COLUMBIA_WALNUT',  'PRELAM_25',         1.00, 0),
  ('BWR_WARM_TEAK',           'BWR_PLY_MICA',      1.00, 0),
  ('BWR_CONCRETE_GREY',       'BWR_PLY_MICA',      1.00, 0),
  ('WPC_TEAK_BROWN',          'WPC_OUTDOOR',       1.00, 0),
  ('WPC_CHARCOAL_GREY',       'WPC_OUTDOOR',       1.00, 0),
  ('GRANITE_JET_BLACK_OPT',   'GRANITE_JET_BLACK', 1.00, 0),
  ('GRANITE_GALAXY_OPT',      'GRANITE_GALAXY',    1.00, 0),
  ('GRANITE_KWHITE_OPT',      'GRANITE_KWHITE',    1.00, 0),
  ('GRANITE_RED_OPT',         'GRANITE_RED',        1.00, 0),
  ('GRANITE_TAN_BROWN_OPT',   'GRANITE_TAN_BROWN', 1.00, 0),
  ('QUARTZ_CARRARA',          'MARBLE_QUARTZ',     1.00, 0),
  ('QUARTZ_NERO_MARQUINA',    'MARBLE_QUARTZ',     1.00, 0),
  ('SHEET_PERFORATED_OPT',    'SHEET_PERFORATED',  1.00, 0),
  ('SHEET_MESH_OPT',          'SHEET_MESH',        1.00, 0),
  ('SHEET_CR_16G_OPT',        'SHEET_CR_16G',      1.00, 0),
  ('SHEET_SS304_OPT',         'SHEET_SS304',       1.00, 0)
on conflict (option_code) do nothing;

-- ============================================================
-- 21. SEED DATA — CONFIGURATOR OPTIONS
-- ============================================================
insert into configurator_options (option_group, option_code, parent_code, label_en, group_label, swatch_color_hex, swatch_texture_img, spec_note, load_kg, warranty_text, badge_text, sort_order) values
  -- TOP_TAB
  ('TOP_TAB',      'FRAME_ONLY',           null,    'Frame Only',                                      null, null, null, null, null, null, null, 10),
  ('TOP_TAB',      'WOOD',                 null,    'Wood Tops',                                       null, null, null, null, null, null, null, 20),
  ('TOP_TAB',      'STONE',                null,    'Granite & Marble Tops',                           null, null, null, null, null, null, null, 30),
  ('TOP_TAB',      'METAL',                null,    'Industrial Metal Top',                            null, null, null, null, null, null, null, 40),

  -- TOP_MATERIAL — WOOD
  ('TOP_MATERIAL', 'RUBBER_HONEY_TEAK',    'WOOD',  'Natural Honey Teak Polish',                       'Solid Kerala Rubberwood (18mm Finger-Jointed)', '#C28B38', null, null, null, null, null, 101),
  ('TOP_MATERIAL', 'RUBBER_DARK_WALNUT',   'WOOD',  'Dark Walnut Luxury Polish',                       'Solid Kerala Rubberwood (18mm Finger-Jointed)', '#4A2A18', null, null, null, null, null, 102),
  ('TOP_MATERIAL', 'RUBBER_CLEAR_MATTE',   'WOOD',  'Clear Matte Natural Wood',                        'Solid Kerala Rubberwood (18mm Finger-Jointed)', '#D8BA84', null, null, null, null, null, 103),
  ('TOP_MATERIAL', 'PRELAM_WHITE',         'WOOD',  'Frosty Corporate White',                          'IT Office Pre-Lam Board (25mm + 2mm PVC Edge)', '#F8FAFC', null, null, null, null, null, 104),
  ('TOP_MATERIAL', 'PRELAM_CARBON_BLACK',  'WOOD',  'Matte Carbon Black',                              'IT Office Pre-Lam Board (25mm + 2mm PVC Edge)', '#1E293B', null, null, null, null, null, 105),
  ('TOP_MATERIAL', 'PRELAM_LIGHT_OAK',     'WOOD',  'Light Oak Woodgrain',                             'IT Office Pre-Lam Board (25mm + 2mm PVC Edge)', '#D4B996', null, null, null, null, null, 106),
  ('TOP_MATERIAL', 'PRELAM_COLUMBIA_WALNUT','WOOD', 'Columbia Dark Walnut',                            'IT Office Pre-Lam Board (25mm + 2mm PVC Edge)', '#5D4037', null, null, null, null, null, 107),
  ('TOP_MATERIAL', 'BWR_WARM_TEAK',        'WOOD',  'Cafe Warm Teak Mica',                             'BWR Waterproof Plywood (18mm + 1mm Scratch-Proof Mica)', '#9E6B40', null, null, null, null, null, 108),
  ('TOP_MATERIAL', 'BWR_CONCRETE_GREY',    'WOOD',  'Concrete Loft Grey Mica',                         'BWR Waterproof Plywood (18mm + 1mm Scratch-Proof Mica)', '#78909C', null, null, null, null, null, 109),
  ('TOP_MATERIAL', 'WPC_TEAK_BROWN',       'WOOD',  'Weatherproof Teak Brown',                         'Outdoor WPC Solid Planks (100% Waterproof)', '#5C4033', null, null, null, null, null, 110),
  ('TOP_MATERIAL', 'WPC_CHARCOAL_GREY',    'WOOD',  'Charcoal Grey',                                   'Outdoor WPC Solid Planks (100% Waterproof)', '#2F3538', null, null, null, null, null, 111),

  -- TOP_MATERIAL — STONE
  ('TOP_MATERIAL', 'GRANITE_JET_BLACK_OPT',  'STONE', 'Absolute Jet Black',                           'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#0A0A0A', null, null, null, null, null, 201),
  ('TOP_MATERIAL', 'GRANITE_GALAXY_OPT',     'STONE', 'Black Galaxy',                                 'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#1C1C1E', null, null, null, null, null, 202),
  ('TOP_MATERIAL', 'GRANITE_KWHITE_OPT',     'STONE', 'K-White / Colonial White',                     'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#F1F5F9', null, null, null, null, null, 203),
  ('TOP_MATERIAL', 'GRANITE_RED_OPT',        'STONE', 'Ruby Red',                                     'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#7F1D1D', null, null, null, null, null, 204),
  ('TOP_MATERIAL', 'GRANITE_TAN_BROWN_OPT',  'STONE', 'Tan Brown',                                    'Natural Granite (18mm Export-Grade Krishnagiri, Zero-Wax)', '#451A03', null, null, null, null, null, 205),
  ('TOP_MATERIAL', 'QUARTZ_CARRARA',         'STONE', 'Italian Carrara White Marble Look',             'Luxury Marble / Quartz Finish (18mm)', '#F8FAFC', null, null, null, null, null, 206),
  ('TOP_MATERIAL', 'QUARTZ_NERO_MARQUINA',   'STONE', 'Nero Marquina Black Marble Look',               'Luxury Marble / Quartz Finish (18mm)', '#0F172A', null, null, null, null, null, 207),

  -- TOP_MATERIAL — METAL
  ('TOP_MATERIAL', 'SHEET_PERFORATED_OPT',   'METAL', 'Perforated Sheet Top',                         'Industrial Steel Tops', '#334155', null, null, null, null, null, 301),
  ('TOP_MATERIAL', 'SHEET_MESH_OPT',         'METAL', 'Expanded Diamond Mesh Top',                    'Industrial Steel Tops', '#475569', null, null, null, null, null, 302),
  ('TOP_MATERIAL', 'SHEET_CR_16G_OPT',       'METAL', '16G Solid CR Sheet Top',                       'Industrial Steel Tops', '#1E293B', null, null, null, null, null, 303),
  ('TOP_MATERIAL', 'SHEET_SS304_OPT',        'METAL', 'Jindal SS 304 Food-Grade Sheet Top',           'Industrial Steel Tops', '#E2E8F0', null, null, null, null, null, 304),

  -- GAUGE
  ('GAUGE', 'G18',  null, '18 Gauge Economy (1.2mm Tata/Apollo CR)',              null, null, null, 'Home & office use',           150, '7 Years Weld Warranty',                                           null,          1),
  ('GAUGE', 'G16',  null, '16 Gauge Heavy Commercial (1.6mm Tata Structura)',     null, null, null, 'Cafe, hotel, IT office',      250, '10 Years Structural MIG Warranty',                                'Recommended', 2),
  ('GAUGE', 'G14',  null, '14 Gauge Extra-Heavy Industrial (2.0mm)',              null, null, null, 'College, hostel, factory',    400, '15 Years Warranty',                                                null,          3),
  ('GAUGE', 'SS202',null, 'Jindal SS 202 (Indoor Luxury)',                        null, null, null, 'Indoor luxury styling',       200, '10 Years Weld Warranty',                                           null,          4),
  ('GAUGE', 'SS304',null, 'Jindal SS 304 (100% Rust-Proof + Argon TIG)',          null, null, null, 'Food & sanitary grade',       300, '3-Year Free Replacement Guarantee + 15 Years Rust-Free Warranty',  null,          5),

  -- FRAME_COLOR
  ('FRAME_COLOR', 'MATTE_BLACK', null, 'Matte Black Powder Coated', null, '#111111', null, null, null, null, null, 1),
  ('FRAME_COLOR', 'WHITE',       null, 'Pure White Coated',         null, '#FFFFFF', null, null, null, null, null, 2),
  ('FRAME_COLOR', 'GREY',        null, 'Industrial Grey',           null, '#4B5563', null, null, null, null, null, 3),
  ('FRAME_COLOR', 'RAW',         null, 'Raw Primed',                null, '#9CA3AF', null, null, null, null, null, 4),
  ('FRAME_COLOR', 'GOLD',        null, 'Gold',                      null, '#D4AF37', null, null, null, null, null, 5),

  -- BUILD_TYPE
  ('BUILD_TYPE', 'WELDED',    null, '100% Factory Welded (Coimbatore Local Delivery)',      null, null, null, 'Pre-assembled on surface plate. 0-min setup.',              null, null, null, 1),
  ('BUILD_TYPE', 'KNOCKDOWN', null, '5-Min Flat-Pack Knock-Down (Pan-India Courier)',       null, null, null, 'Telescopic zero-shake lock. Dispatches nationwide.',         null, null, null, 2),

  -- SIZE
  ('SIZE', '2x2',    null, '2 x 2 ft',           null, null, null, 'Compact side or single cafe table',       null, null, null, 1),
  ('SIZE', '3x2',    null, '3 x 2 ft',           null, null, null, 'Standard 2-seater cafe table',            null, null, null, 2),
  ('SIZE', '4x2',    null, '4 x 2 ft',           null, null, null, 'Standard 4-seater cafe or compact desk',  null, null, null, 3),
  ('SIZE', '4x2.5',  null, '4 x 2.5 ft',         null, null, null, 'Spacious executive IT workstation',       null, null, null, 4),
  ('SIZE', '6x3',    null, '6 x 3 ft',           null, null, null, 'Large 6-seater dining or conference table',null, null, null, 5),
  ('SIZE', 'CUSTOM', null, 'Custom Size Request', null, null, null, 'Engineered to your exact site millimeter dimensions', null, null, null, 6),

  -- ADDON
  ('ADDON', 'GROMMET',    null, '+ ₹50 Laptop Wire Grommet Hole',          null, null, null, 'Precision CNC circular cable portal with brush cap',                        null, null, null, 1),
  ('ADDON', 'CPU_HOLDER', null, '+ ₹150 Under-Table CPU / Bag Holder',     null, null, null, 'Heavy-gauge steel suspended cradle for tower / backpacks',                  null, null, null, 2),
  ('ADDON', 'CHAIRS4',    null, '+ ₹600 Add 4 Matching Chairs Combo',      null, null, null, 'Matching structural steel frame chairs with bumper feet',                   null, null, null, 3),

  -- METAL_TYPE (Chair)
  ('METAL_TYPE', 'MS_COATED', null, 'MS Powder Coated (Tata/Apollo CR)',              null, '#111111', null, 'Durable powder-coated MS frame',    null, '7 Years Weld Warranty',                                          null, 1),
  ('METAL_TYPE', 'SS202',     null, 'Jindal SS 202 (Indoor Luxury)',                  null, '#D1D1D6', null, 'Indoor stainless styling',           null, '10 Years Weld Warranty',                                 'Indoor Luxury', 2),
  ('METAL_TYPE', 'SS304',     null, 'Jindal SS 304 (100% Rust-Proof + Argon TIG)',    null, '#E5E5EA', null, 'Food and sanitary grade',            null, '3-Year Free Replacement + 15 Years Rust-Free Warranty',  'Rust-Proof',    3),

  -- SEAT (Chair)
  ('SEAT', 'SEAT_RUBBER',     null, 'Solid Kerala Rubberwood Seat (100% Seasoned Grade-A)', null, '#C29B38', null, '100% seasoned Grade-A rubberwood', null, null, null, 1),
  ('SEAT', 'SEAT_REXINE',     null, '40-Density Cushion Seat with Rexine',                  null, '#222222', null, 'Cushioned comfort seat',           null, null, null, 2),
  ('SEAT', 'SEAT_PERFORATED', null, 'Perforated Metal Seat',                                null, '#334155', null, 'Ventilated industrial steel seat',  null, null, null, 3),

  -- SEAT_COLOR (Chair)
  ('SEAT_COLOR', 'REXINE_BLACK',  null, 'Black',      null, '#111111', null, null, null, null, null, 1),
  ('SEAT_COLOR', 'REXINE_TAN',    null, 'Tan Brown',  null, '#8B5E3C', null, null, null, null, null, 2),
  ('SEAT_COLOR', 'REXINE_CHERRY', null, 'Cherry Red', null, '#7F1D1D', null, null, null, null, null, 3),

  -- STAND_MATERIAL
  ('STAND_MATERIAL', 'ST_MS',    null, '18G MS Matte Black', null, '#111111', null, 'Powder-coated mild steel', null, null, null,          1),
  ('STAND_MATERIAL', 'ST_SS304', null, 'Jindal SS 304',      null, '#E5E5EA', null, 'Rust-proof stainless steel',null, null, 'Rust-Proof', 2),

  -- PACK (Stand)
  ('PACK', 'PACK_1', null, 'Single Pack',                                null, null, null, 'One complete stand',                        null, null, null,          1),
  ('PACK', 'PACK_2', null, 'Pack of 2 Nesting Combo (Save ₹150!)',      null, null, null, 'Two stands, nesting space-saving design',    null, null, 'Save ₹150', 2),

  -- BASE (Stand)
  ('BASE', 'BASE_BUSH',   null, 'Heavy Leveling Bush',      null, null, null, 'Stable leveling feet',           null, null, null, 1),
  ('BASE', 'BASE_CASTOR', null, 'Lockable Castor Wheels',   null, null, null, 'Easy to move and lock in place', null, null, null, 2),

  -- FINISH (Rack)
  ('FINISH', 'RF_BLACK',      null, 'Matte Black',           null, '#111111', null, 'Powder-coated matte black', null, null, null, 1),
  ('FINISH', 'RF_GOLD_PAINT', null, 'Metallic Gold Paint',   null, '#D4AF37', null, 'Metallic gold paint finish',null, null, null, 2),
  ('FINISH', 'RF_GOLD_PVD',   null, 'Rose-Gold / Gold PVD SS',null,'#B76E79', null, 'PVD stainless finish',      null, null, null, 3),

  -- SHELF (Rack)
  ('SHELF', 'SH_NONE',         null, 'No Shelf',              null, null,      null, 'Open frame',                null, null, null, 1),
  ('SHELF', 'SH_RUBBER',       null, 'Rubberwood Shelf',      null, '#C29B38', null, 'Solid Kerala rubberwood',   null, null, null, 2),
  ('SHELF', 'SH_PRELAM_WHITE', null, 'Pre-Lam White Shelf',   null, '#F8FAFC', null, 'White engineered board',    null, null, null, 3),
  ('SHELF', 'SH_PRELAM_BLACK', null, 'Pre-Lam Black Shelf',   null, '#1E293B', null, 'Black engineered board',    null, null, null, 4),

  -- RACK_SIZE
  ('RACK_SIZE', 'R4', null, '4 ft', null, null, null, 'Compact height & length', null, null, null, 1),
  ('RACK_SIZE', 'R5', null, '5 ft', null, null, null, 'Mid height & length',     null, null, null, 2),
  ('RACK_SIZE', 'R6', null, '6 ft', null, null, null, 'Full height & length',    null, null, null, 3),

  -- GRADE (SS Unit)
  ('GRADE', 'SSG_202', null, 'Jindal SS 202 (Indoor)',                  null, '#D1D1D6', null, 'Indoor stainless grade',                null, null, null,                        1),
  ('GRADE', 'SSG_304', null, 'Jindal SS 304 (Medical / Food Grade)',    null, '#E5E5EA', null, 'Medical and food-grade stainless',       null, null, 'Medical / Food Grade',     2),

  -- THICKNESS (SS Unit)
  ('THICKNESS', 'TH_18G', null, '18G Top',           null, null, null, 'Standard top thickness', null, null, null, 1),
  ('THICKNESS', 'TH_16G', null, '16G Top (Heavier)', null, null, null, 'Heavier top thickness',  null, null, null, 2),

  -- SS_FINISH (SS Unit)
  ('SS_FINISH', 'SSF_HAIRLINE', null, 'Matt Hairline',  null, '#C7CBD1', null, 'Easy-clean matt finish',   null, null, null, 1),
  ('SS_FINISH', 'SSF_MIRROR',   null, 'Mirror Buffed',  null, '#E5E7EB', null, 'Mirror-buffed finish',     null, null, null, 2),

  -- QTY_TIER
  ('QTY_TIER', 'TIER_1_3',      null, '1-3 Pcs (Retail Price)',                           null, null, null, 'Direct factory price with GST invoice',               null, null, null, 1),
  ('QTY_TIER', 'TIER_4_9',      null, '4-9 Pcs (5% Small Biz Discount)',                  null, null, null, '5% factory rebate applied automatically',              null, null, null, 2),
  ('QTY_TIER', 'TIER_10_PLUS',  null, '10+ Pcs (12% B2B Factory Wholesale Discount)',     null, null, null, '12% direct volume bulk pricing',                       null, null, null, 3)
on conflict (option_code) do nothing;

-- ============================================================
-- 22. SEED DATA — PRODUCT TYPE OPTION GROUPS
-- ============================================================
insert into product_type_option_groups (product_type, option_group, group_title, sort_order, is_required, default_code) values
  -- TABLE
  ('TABLE', 'TOP_TAB',      'Top surface',              10, true,  'WOOD'),
  ('TABLE', 'TOP_MATERIAL', 'Top material',             20, false, 'RUBBER_HONEY_TEAK'),
  ('TABLE', 'GAUGE',        'Structural steel gauge',   30, true,  'G16'),
  ('TABLE', 'FRAME_COLOR',  'Frame color',              40, true,  'MATTE_BLACK'),
  ('TABLE', 'SIZE',         'Frame size',               50, true,  '4x2'),
  ('TABLE', 'BUILD_TYPE',   'Delivery & assembly',      60, true,  'WELDED'),
  ('TABLE', 'ADDON',        'Optional add-ons',         70, false, null),
  ('TABLE', 'QTY_TIER',     'Quantity',                 80, false, null),
  -- CHAIR
  ('CHAIR', 'METAL_TYPE',   'Metal type',               10, true,  'MS_COATED'),
  ('CHAIR', 'SEAT',         'Seat',                     20, true,  'SEAT_RUBBER'),
  ('CHAIR', 'SEAT_COLOR',   'Seat color',               30, false, 'REXINE_BLACK'),
  ('CHAIR', 'FRAME_COLOR',  'Frame color',              40, false, 'MATTE_BLACK'),
  ('CHAIR', 'BUILD_TYPE',   'Delivery & assembly',      50, true,  'WELDED'),
  ('CHAIR', 'QTY_TIER',     'Quantity',                 60, false, null),
  -- STAND
  ('STAND', 'STAND_MATERIAL','Material',                10, true,  'ST_MS'),
  ('STAND', 'PACK',         'Pack size',                20, true,  'PACK_1'),
  ('STAND', 'BASE',         'Base type',                30, true,  'BASE_BUSH'),
  ('STAND', 'QTY_TIER',     'Quantity',                 40, false, null),
  -- RACK
  ('RACK', 'FINISH',        'Finish',                   10, true,  'RF_BLACK'),
  ('RACK', 'SHELF',         'Bottom shelf',             20, true,  'SH_NONE'),
  ('RACK', 'RACK_SIZE',     'Height & length',          30, true,  'R4'),
  ('RACK', 'QTY_TIER',      'Quantity',                 40, false, null),
  -- SS_UNIT
  ('SS_UNIT', 'GRADE',      'Stainless grade',          10, true,  'SSG_202'),
  ('SS_UNIT', 'THICKNESS',  'Top thickness',            20, true,  'TH_18G'),
  ('SS_UNIT', 'SS_FINISH',  'Finish',                   30, true,  'SSF_HAIRLINE'),
  ('SS_UNIT', 'QTY_TIER',   'Quantity',                 40, false, null)
on conflict (product_type, option_group) do nothing;

-- ============================================================
-- Done! Your SANRA LIVING database is ready.
-- ============================================================

