# SANRA LIVING — Database Migration Sequence & Compatibility Guide

## Important: Quarantined Snapshot
`supabase-schema.sql` has been quarantined as `supabase-schema.sql.quarantined`. **Never execute it** — it contains legacy permissive RLS policies. `supabase/migrations/*.sql` is the sole source of truth.

## Historical `018_simple_product_form.sql` Compatibility
In `001_init.sql`, `products.allowed_top_categories` was created as `jsonb` and `products.from_price` did not exist. `018_simple_product_form.sql` assumed `allowed_top_categories` was `text[]` and `from_price` existed.
- **On existing production databases** where `001`–`019` are already applied: `20261128160000_step02_schema_compat.sql` safely ensures `from_price` exists and converts `allowed_top_categories` from `jsonb` to `text[]` if needed without altering applied migration history.
- **On a fresh database replay**: before running `018_simple_product_form.sql`, ensure `from_price NUMERIC(12,2)` exists and `allowed_top_categories` is `text[]` (or apply `20261128160000_step02_schema_compat.sql` prior to `018`).

## Upgrade Deployment Sequence (After Taking a Full Backup)
Apply in exact order via Supabase CLI or SQL Editor:
1. `20261128150000_step01_security_lock.sql` — Restricts direct anon/authenticated PostgREST access on private configurator groups (`GAUGE`, `THICKNESS`, `GRADE`).
2. `20261128160000_step02_schema_compat.sql` — Reconciles `products.from_price` and `products.allowed_top_categories`.
3. `20261128161000_step02_variant_architecture.sql` — Creates `build_categories`, `build_category_specs_private`, `surface_options`, `product_variants`, `pricing_profiles`, `variant_pricing_private`, `pricing_tiers`, `bulk_rules`, `cost_import_batches`, `cost_import_rows`, `price_history`, and seeds default `bulk_rules`.
4. `20261128162000_step02_legacy_variant_backfill.sql` — Idempotently backfills `-DEFAULT` variants for existing products without inventing manufacturing costs.
5. `20261128170000_step04_admin_seo_and_import_tx.sql` — Creates `product_seo`, extends `cost_import_rows`, and creates atomic `apply_cost_import_batch_tx` RPC.
6. `20261128180000_step06_quotations.sql` — Creates `quotes`, `quote_items`, `quote_item_costs`, and links `orders.quote_id` / `leads.quote_id`.

## Rollback Considerations
- All STEP 01–07 migrations are **additive**; no existing tables, product IDs, SKUs, orders, leads, or projects are dropped.
- To roll back application behavior, redeploy the previous application commit while leaving additive tables intact.
- Do not drop `variant_pricing_private`, `quotes`, or `price_history` without taking a fresh database backup first.
