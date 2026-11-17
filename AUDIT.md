# SANRA LIVING — Hardening Audit

Date: 2026-11-17

## 1. Secrets

- No service-role key, admin email value, password, or other secret value is hardcoded in tracked source.
- `.env.local` is absent from the repository and gitignored. `.env.example` contains names only.
- Browser build scan (`.next/static`) found no `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `service_role`, or JWT-looking secret values.
- Only `NEXT_PUBLIC_*` values are intended for the browser: Supabase URL, anon key, WhatsApp number and site URL.
- The admin email and service-role client remain server-only. The admin email is displayed only after an authenticated admin session.

## 2. Server-only service client

All 30 files that directly import `@/lib/supabase/server` were checked and now import `server-only`. This includes route handlers, admin pages/actions, the sitemap, product pages and the shared rate limiter. `lib/supabase/server.ts` itself imports `server-only`.

The proxy and admin auth client use the `@supabase/ssr` anon client, not the service-role client.

## 3. Content and cost-word scan

Fixed during this pass:

- Removed “zero showroom margins” from the public catalog subtitle.
- Removed public welding-bead and inner-sleeve descriptions from the homepage and table comparison copy.
- Normalized public wood/granite group labels to the approved exact strings and added the same label update to migration 008.

Scan results:

- No `Perumbavoor`, `Bargur`, `ELEMENTS`, or `9585` hits.
- No public API response contains lead, order, cost, amount or internal-note data.
- The only remaining `pin` hits are the public pincode URL parameter, not an authentication PIN.
- The only remaining `sleeve` hit is “bubble sleeves” in packaging copy, not an inner-sleeve size.
- The only `margin` hits in code are the CSS `margin` property in the global error page and authenticated admin costing fields.
- The only cost-adjacent hits in browser JS are the private costing **field labels** in the admin ProductForm client chunk. No values are included. The admin route is authenticated, noindex and unlinked.
- Public pages, public APIs and PDFs contain selling prices only, never internal cost, labor, overhead, material rates or margins.

## 4. Admin and tracking discovery

- No public page, navigation, footer, sitemap or robots allow-list links to `/admin`.
- `robots.txt` disallows `/admin`, `/api` and `/track`.
- Admin metadata is `noindex, nofollow`; `/track` page metadata is noindex and the result view also injects noindex.
- Admin routes keep `X-Frame-Options: DENY` and `Cache-Control: no-store`.
- Sitemap contains only home, catalog, active product pages, `/b2b` and `/contact`.

## 5. RLS status

Public-read tables with RLS and SELECT policies:

- `products` — active products only
- `product_visual_variants`
- `configurator_options` — active options
- `product_type_option_groups`

Private tables (RLS enabled, no anon/authenticated policies):

- `material_rates`
- `product_pricing_rules`
- `orders`
- `secret_jig_vault`
- `cash_and_worker_logs`
- `option_pricing`
- `pricing_globals`
- `admin_audit_log`
- `order_stage_events`
- `order_photos`
- `tracking_attempts`
- `leads`
- `cad_files`
- `rate_limits`

That is the original 8 private tables plus 6 newer private tables. Storage: `product-images` is public-read; `order-photos` and `cad-files` are private with no public storage policy.

## 6. Environment

- `.env.local` is gitignored.
- `.env.example` contains variable names only, including `NEXT_PUBLIC_SITE_URL` and `ADMIN_EMAIL`.
- No secret values are committed in docs or migrations.

## 7. Dependency audit

`npm audit --omit=dev`: **0 vulnerabilities** in production dependencies.

Full `npm audit` (including dev tooling): 2 critical and 1 moderate, all through the Vitest test runner (`vitest` / `@vitest/mocker` / `tinypool`). The only fix is Vitest 5, a breaking major upgrade. It was not applied because this project is on Node 20 and the requested policy was safe patch/minor fixes only. Plan: move to Node 22+, then upgrade Vitest and re-run the suite. The installed Vitest is 3.2.7 after safe fixes.

Node 20 deprecation warnings from `@supabase/supabase-js` remain. Node 22+ is recommended before launch.

## 8. Build and Lighthouse

Production build: passes. Browser source maps: 0. `X-Powered-By` is disabled. Security headers, CSP, admin headers, robots, sitemap, security.txt and OG image were verified on a production server.

Lighthouse mobile (360 px emulation), no production database connected:

| Page | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/` | 98 | 96 | 100 | 100 |
| `/products` | 87 | 94 | 100 | 100 |
| `/products/ims-cf-42` | 85 | 92 | 96 | 92 |

Homepage meets the 90+ target. Catalog/product Performance is below target in this preview because every Supabase query had to time out with no database configured; the catalog Speed Index reflected that wait. The catalog/product accessibility defects found in the first run were fixed afterward (emerald button contrast, footer copyright contrast, result heading order, quantity input label) and need a final re-run with a real database and production environment.

## Known limitations

- Lighthouse catalog/product performance was measured without a Supabase database; a production-rate Lighthouse run is still required.
- Manual 360 px visual testing of every page is still required; automated mobile Lighthouse used 360 px emulation.
- Admin MFA is not implemented in the app. Supabase account MFA can be enabled separately, but the admin login remains password-only.
- Privacy and Terms are placeholders and must be reviewed by a legal advisor.
