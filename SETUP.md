# SANRA LIVING — Supabase Database Setup Guide

Follow these steps to run the database migrations and sample seed data in your Supabase project.

---

### Prerequisites
Make sure your `.env.local` contains your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

*(Note: `.env.local` is git-ignored and must never be committed or shared).*

A value-free template is available in `.env.example`.

---

### Environment Variables

Add these to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service role key |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp number, digits only with country code (for example `919876543210`) |
| `COMPANY_ADDRESS` | Factory address printed on the PDF quote and Contact page |
| `COMPANY_GSTIN` | GSTIN printed on the PDF quote and Contact page |
| `COMPANY_PHONE` | Factory phone printed on the PDF quote and Contact page |
| `ADMIN_EMAIL` | Exact email of the single Supabase Auth user allowed into `/admin` |

If a company value is missing, the UI shows a visible `UPDATE ME` placeholder instead of crashing. The GST wording on the PDF comes from `GST_NOTE` in `lib/company.ts` and can be edited directly.

`ADMIN_EMAIL` is server-only. It must exactly match the Supabase Auth user email (case-insensitive). If it is missing, every admin sign-in is rejected.

---

### Step 1: Run Base Migration (`001_init.sql`)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. In the left navigation menu, click on the **SQL Editor** (icon `>_`).
3. Click **"New query"**.
4. Open [supabase/migrations/001_init.sql](file:///d:/Downloads/sanra-living-i/supabase/migrations/001_init.sql) and copy the entire file content.
5. Paste it into the query editor and click **Run** (or press `Ctrl + Enter` / `Cmd + Enter`).
6. Confirm the result shows `Success. No rows returned`.

This creates:
- The `generate_tracking_code()` function (`SANRA-XXXX`).
- All 7 base tables (`material_rates`, `products`, `product_pricing_rules`, `product_visual_variants`, `orders`, `secret_jig_vault`, `cash_and_worker_logs`).
- Row Level Security (RLS) on all 7 tables with strict browser isolation on private tables.
- The `product-images` public storage bucket.

---

### Step 2: Run Catalog Migration (`002_catalog.sql`)

1. In the Supabase **SQL Editor**, click **"New query"**.
2. Open [supabase/migrations/002_catalog.sql](file:///d:/Downloads/sanra-living-i/supabase/migrations/002_catalog.sql) and copy the entire file content.
3. Paste it into the query editor and click **Run**.
4. Confirm execution succeeds with `Success. No rows returned`.

This adds to `products`:
- `use_cases TEXT[]` (`CAFE`, `OFFICE`, `HOME`, `HOSPITAL`, `HOSTEL`)
- `material_tags TEXT[]` (`MS`, `SS`, `WOOD`, `GRANITE`)
- `sort_order INT`

---

### Step 3: Run Configurator Migration (`003_configurator.sql`)

1. In the Supabase **SQL Editor**, click **"New query"**.
2. Open [supabase/migrations/003_configurator.sql](file:///d:/Downloads/sanra-living-i/supabase/migrations/003_configurator.sql) and copy the entire file content.
3. Paste it into the query editor and click **Run**.
4. Confirm execution succeeds with `Success. No rows returned`.

This creates:
- 6 new material rates (`GRANITE_TAN_BROWN`, `WPC_OUTDOOR`, `SHEET_PERFORATED`, `SHEET_MESH`, `SHEET_CR_16G`, `SHEET_SS304`).
- Public table `configurator_options` (public read-only; zero cost data).
- Private table `option_pricing` (RLS enabled, zero public policy; holds multipliers & flat add-ons).
- Private table `pricing_globals` (RLS enabled, zero public policy; holds bumper rates, center cross support, wholesale tier discounts).
- Full option seed data across all 4 top tabs, wood/granite/metal swatches, gauges, colors, sizes, and add-ons.

---

### Step 4: Run Seed Data (`seed.sql`)

1. In the Supabase **SQL Editor**, click **"New query"**.
2. Open [supabase/seed.sql](file:///d:/Downloads/sanra-living-i/supabase/seed.sql) and copy the entire file content.
3. Paste it into the query editor and click **Run**.
4. Confirm execution succeeds.

---

### Step 5: Run Admin Migration (`004_admin.sql`)

1. In the Supabase **SQL Editor**, click **"New query"**.
2. Open [supabase/migrations/004_admin.sql](file:///d:/Downloads/sanra-living-i/supabase/migrations/004_admin.sql) and copy the entire file content.
3. Paste it into the query editor and click **Run**.
4. Confirm the result shows `Success. No rows returned`.

This creates:

- The private `admin_audit_log` table with RLS enabled and no public policies.
- An index on `admin_audit_log.at` for the latest-200 audit view.
- The `RAW` frame-color option on `product_visual_variants`.
- An 8 MB `product-images` bucket limit for the admin upload pipeline.

The audit table is accessible only through the service-role client after `requireAdmin()`. Do not add a public RLS policy.

### Step 6: Configure Supabase Auth for the Admin User

1. Open **Authentication → Users** in the Supabase Dashboard.
2. Click **Add user → Create new user**.
3. Enter the exact email you will put in `ADMIN_EMAIL`.
4. Set a strong password and enable **Auto Confirm User**.
5. Do not create any other admin users.
6. In **Authentication → Providers → Email**, keep email/password enabled.
7. Disable public sign-ups if your project settings expose that option. The app only signs in an existing user.

The login page never displays the admin email, never reveals whether the email or password was wrong, and signs out any authenticated user whose email does not exactly match `ADMIN_EMAIL`.

### Step 7: Verify the Database Connection

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"ok": true}
```

---

### Step 8: Verify Pricing Data Privacy (Security Check)

The configurator and from-price engines are **strictly server-only**. Here is how to confirm that no internal cost data is ever leaked to the browser:

#### Method A — Browser DevTools (Recommended)

1. Open `http://localhost:3000/products/IMS-CF-42` in Chrome or Firefox.
2. Open **DevTools** → **Network** tab.
3. Switch options (e.g., Wood $\to$ Stone, change gauge, add quantity) and click on the `/api/price` network requests.
4. Inspect the request response body.
5. **Expected result:** Response strictly contains only:
```json
{
  "unit_price": 7199,
  "total_price": 63351,
  "discount_pct": 12,
  "bumper_included": true,
  "requires_quote": false
}
```
6. Use `Ctrl+F` to search the response body for any of these words:
   - `pipe_weight`
   - `labor`
   - `overhead`
   - `margin`
   - `cost_per_unit`
   - `base_pipe_weight`
   - `consumables_cost`
   - `multiplier`
   - `rate`
7. **Expected result:** Zero matches. All internal costs, formulas, and margins remain private on the server.

---

### Step 9: Verify WhatsApp Booking, PDF Quotes and Delivery Estimator

Start the dev server:

```bash
npm run dev
```

Open these URLs:

- `http://localhost:3000/products/IMS-CF-42` — normal configuration, WhatsApp button and PDF download.
- `http://localhost:3000/products/IMS-CF-42?top_tab=STONE&top_material=GRANITE_JET_BLACK_OPT&gauge=G16&size=4x2&quantity=4` — granite configuration with bumper note in the PDF.
- `http://localhost:3000/products/IMS-CF-42?size=CUSTOM` — custom-size inputs; WhatsApp asks for a custom quote and the PDF button is disabled.
- `http://localhost:3000/products/IMS-CF-42?pin=641021` — local factory tempo message.
- `http://localhost:3000/products/IMS-CF-42?pin=600001` — flat-pack courier recommendation and one-click Flat-Pack selection.
- `http://localhost:3000/products?category=__no_match__` — empty state with the WhatsApp button.
- `http://localhost:3000/contact` — company placeholders and the WhatsApp desk.

Run the checks:

```bash
npm test
npm run typecheck
```

The two protected routes accept only configuration options and recompute prices on the server:

```powershell
$body = '{"sku":"IMS-CF-42","top_tab":"WOOD","top_material":"RUBBER_HONEY_TEAK","gauge":"G16","frame_color":"MATTE_BLACK","build_type":"WELDED","size":"4x2","addons":[],"quantity":1}'
Invoke-WebRequest -Uri "http://localhost:3000/api/whatsapp-link" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
```

```powershell
$body = '{"sku":"IMS-CF-42","top_tab":"WOOD","top_material":"RUBBER_HONEY_TEAK","gauge":"G16","frame_color":"MATTE_BLACK","build_type":"WELDED","size":"4x2","addons":[],"quantity":1}'
Invoke-WebRequest -Uri "http://localhost:3000/api/quote-pdf" -Method POST -ContentType "application/json" -Body $body -OutFile "SANRA-Quote.pdf" -UseBasicParsing
```

The WhatsApp route returns only `{ "url": "..." }`. The PDF route returns `application/pdf` with `Cache-Control: no-store` and is limited to roughly 10 requests per minute per IP.

---

### Step 10: Verify the Admin Console

After setting `ADMIN_EMAIL`, creating the Supabase Auth user, and running `004_admin.sql`:

- `http://localhost:3000/admin/login` — staff sign-in. No public link points here.
- `http://localhost:3000/admin` — redirects to `/admin/rates` after login.
- `http://localhost:3000/admin/rates` — Rate Master, global pricing values, option pricing, price preview.
- `http://localhost:3000/admin/products` — product list, search, active toggle, archive.
- `http://localhost:3000/admin/products/new` — create a product and private costing block.
- `http://localhost:3000/admin/products/<id>` — edit product, upload images, variants and swatch textures.
- `http://localhost:3000/admin/audit` — latest 200 audit rows.
- `http://localhost:3000/api/admin/health` — returns `401 Unauthorized` without an admin session.
- `http://localhost:3000/robots.txt` — disallows `/admin` and `/api/admin/`.

Admin routes return these headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Cache-Control: no-store`. Admin pages also emit `noindex, nofollow`.

Run the live protection tests against the dev server:

```powershell
$env:ADMIN_TEST_BASE_URL="http://localhost:3000"
npx vitest run tests/admin-http.test.ts
```

The tests confirm:

- `/admin/*` redirects to the staff sign-in without a session.
- `/api/admin/*` returns `401` without a session.
- Public HTML contains no admin links, admin email, or costing fields.
- The public `/api/price` response keys are unchanged.

Note: admin data, service-role queries, private costing, audit writes and image processing all run only after `requireAdmin()`. The service-role key is never sent to the browser.

---

### Step 11: Run Product Types Migration (`005_product_types.sql`)

1. Open the Supabase **SQL Editor**.
2. Open [supabase/migrations/005_product_types.sql](file:///d:/Downloads/sanra-living-i/supabase/migrations/005_product_types.sql), copy the whole file, paste it into the editor, and click **Run**.
3. Confirm `Success. No rows returned`.
4. Optional: re-run [supabase/seed.sql](file:///d:/Downloads/sanra-living-i/supabase/seed.sql). It includes the seven sample products and is idempotent. Run it after all migrations.

Migration 005 adds:

- The public `product_type_option_groups` mapping and the `QTY_TIER` membership.
- The new CHAIR / STAND / RACK / SS_UNIT option groups, labels and private `option_pricing` rows.
- `product_visual_variants.selection_key` and a unique partial index.
- `PACK2_SAVING` in `pricing_globals`.
- Seven sample products with pricing rules and placeholder preview variants.

Test one product of each type:

```text
Chair:   http://localhost:3000/products/IMS-CH-01
Stand:   http://localhost:3000/products/IMS-ST-12
Rack:    http://localhost:3000/products/IMS-RK-01
SS unit: http://localhost:3000/products/IMS-SS-CT
```

Other seeded products: `/products/IMS-CH-BS`, `/products/IMS-ST-INV`, `/products/IMS-ST-KD`.

### Placeholder rates and images to fill in Admin

**Admin → Rate Master → Material Rates**
- `MS_CR` — MS metal base for chairs, stands and racks.
- `SS_202` / `SS_304` — chair metal types, stand SS 304 and SS-unit grades.
- `WOOD_RUBBER_18` — chair rubberwood seat and rack rubberwood shelf.
- `PRELAM_18` — rack pre-lam shelf.
- `SHEET_PERFORATED` — chair perforated metal seat.

**Admin → Rate Master → Global Pricing Values**
- `PACK2_SAVING` — pack-of-2 saving (seeded at 150).
- `SS_WEIGHT_FACTOR` and `KNOCKDOWN_PRICE_PCT` — reused by the new strategies.

**Admin → Rate Master → Option Pricing**
- `R4` 1.00, `R5` 1.25, `R6` 1.50 — rack size multipliers.
- `TH_18G` 1.00, `TH_16G` 1.28 — SS top thickness multipliers.
- `REXINE_BLACK`, `REXINE_TAN`, `REXINE_CHERRY` — rexine color flat add-ons.
- `BASE_CASTOR` 350 — lockable castor add-on.
- `RF_GOLD_PAINT` 450, `RF_GOLD_PVD` 900 — rack finish add-ons.
- `SSF_MIRROR` 350 — mirror-buff finish add-on.
- Rows marked “Linked to material rate” are read-only; edit those values in Material Rates.
- `PACK_1` / `PACK_2` are read-only; edit the saving in Global Pricing Values.

**Admin → Products → each sample product**
- Upload main and optional hover images for:
  `IMS-CH-01`, `IMS-CH-BS`, `IMS-ST-12`, `IMS-ST-INV`, `IMS-ST-KD`, `IMS-RK-01`, `IMS-SS-CT`.
- Add or replace variant preview images with these selection keys:
  - `IMS-CH-01`: `SEAT_RUBBER||MS_COATED|MATTE_BLACK`, `SEAT_REXINE|REXINE_TAN|MS_COATED|MATTE_BLACK`, `SEAT_RUBBER||SS304|`
  - `IMS-CH-BS`: `SEAT_RUBBER||MS_COATED|MATTE_BLACK`, `SEAT_PERFORATED||SS202|`
  - `IMS-ST-12`: `ST_MS|PACK_1|BASE_BUSH`, `ST_SS304|PACK_2|BASE_CASTOR`
  - `IMS-RK-01`: `RF_BLACK|SH_NONE|R4`, `RF_GOLD_PVD|SH_RUBBER|R6`
  - `IMS-SS-CT`: `SSG_202|TH_18G|SSF_HAIRLINE`, `SSG_304|TH_16G|SSF_MIRROR`
- Swatch textures can be uploaded for top materials, frame colors, seat colors, rack finishes and SS finishes.

Run the full checks:

```powershell
npm run typecheck
npm test
```

---

### Step 12: Run Orders Migration (`006_orders.sql`)

1. Open the Supabase **SQL Editor**.
2. Open [supabase/migrations/006_orders.sql](file:///d:/Downloads/sanra-living-i/supabase/migrations/006_orders.sql), copy the whole file, paste it into the editor, and click **Run**.
3. Confirm `Success. No rows returned`.

Migration 006 adds:

- `customer_name_full`, `warranty_years`, `delivered_on`, `notes_internal` and `archived` to `orders` if missing.
- Private `order_stage_events`, `order_photos` and `tracking_attempts` tables.
- RLS enabled on all three new tables with **no anon/authenticated policies**.
- A private `order-photos` storage bucket with no public policy.
- Indexes for order search and tracking-attempt lockout checks.

The existing random `SANRA-XXXX` tracking generator is reused. Do not replace it with a sequence, date-based code or counter.

### Edit non-code warranty wording

Open [lib/company.ts](file:///d:/Downloads/sanra-living-i/lib/company.ts) and edit:

```ts
export const WARRANTY_TERMS = "…";
```

That constant is printed on the warranty PDF. The certificate adds the order's warranty years, expiry date and the standard exclusions. Do not add legal promises outside this constant.

### Test public tracking and warranty

1. Sign in at `/admin/login`.
2. Create an order at `/admin/orders/new`. Use a real 10-digit test mobile number.
3. On the order detail page, use **Copy tracking link & code**.
4. Open `/track`, enter the code and the last 4 digits of the test phone, then **Check Status**.
5. Move the order step by step through Pipe Cut → Welded → Coated → Master Checked → Ready. On Ready, enter the delivery date; the warranty expiry is calculated from that date.
6. Upload a WIP photo, keep it visible, and check the public tracker photo card/gallery.
7. Download the warranty certificate only after Ready.

URLs:

```text
http://localhost:3000/track
http://localhost:3000/admin/orders
http://localhost:3000/admin/orders/new
http://localhost:3000/admin/orders/<order-id>
```

API endpoints:

```text
POST http://localhost:3000/api/track
POST http://localhost:3000/api/warranty-pdf
```

Privacy and abuse controls:

- `/api/track` requires both the tracking code and the last 4 phone digits.
- Wrong code, wrong phone and unknown code all return: `No order found. Please check your code and phone digits.`
- Per-IP limit: roughly 10 tracking requests per 10 minutes.
- Per-code lockout: after 5 failed attempts in 15 minutes, the code is locked for 15 minutes with: `Too many attempts. Please try again later or contact us on WhatsApp.`
- Every attempt is logged to `tracking_attempts` with a hashed IP only.
- Public responses and the warranty PDF contain masked names, no full phone, no amounts, no addresses, no internal notes and no database IDs.
- Tracking codes are submitted by POST and never placed in the page URL.
- The tracker form page may be indexed; the result view injects `noindex, nofollow`.

Run the live tracking response test against the dev server:

```powershell
$env:SANRA_TEST_BASE_URL="http://localhost:3000"
npx vitest run tests/track-http.test.ts
```

Order photos use the private `order-photos` bucket and 10-minute signed URLs. The bucket name and storage path are never returned as fields by the public API.

---

### Step 13: Run B2B Migration (`007_b2b.sql`)

1. Open the Supabase **SQL Editor**.
2. Open [supabase/migrations/007_b2b.sql](file:///d:/Downloads/sanra-living-i/supabase/migrations/007_b2b.sql), copy the whole file, paste it into the editor, and click **Run**.
3. Confirm `Success. No rows returned`.

Migration 007 creates:

- Private `leads` with sample / CAD / bulk quote kinds, status and archive flag.
- Private `cad_files` metadata.
- A private `cad-files` storage bucket with a 50 MB limit and no public policy.
- RLS enabled on both tables with **no anon/authenticated policies**.

Do not add a public policy to `leads`, `cad_files` or the `cad-files` storage bucket. Public CAD downloads are generated through a short-lived signed URL only after a lead is saved.

### What to fill yourself

- Check `NEXT_PUBLIC_WHATSAPP_NUMBER` in `.env.local` so the B2B sample, CAD, bulk WhatsApp and project-team buttons open the correct number.
- Sign in at `/admin/cad` and upload the actual `.skp` / `.dwg` models. No CAD files are seeded.
- Add a linked product SKU to each CAD file if you want the product name shown on `/b2b`.
- Review the sample / CAD / bulk leads at `/admin/leads`.
- No new environment variables are required for the B2B page.

### B2B URLs

```text
http://localhost:3000/b2b
http://localhost:3000/admin/leads
http://localhost:3000/admin/cad
```

Public API routes:

```text
POST /api/b2b/lead
POST /api/b2b/cad-download
POST /api/bulk-price
POST /api/bulk-quote-pdf
```

### B2B test flow

1. Open `/b2b` and submit the express sample form. Confirm the success message and the WhatsApp continuation button.
2. Use the room calculator. Confirm the estimated table/seat counts and use **Get a quote for these tables** to prefill the bulk sheet.
3. Add rows, change configurations and confirm the debounced live row prices / grand total. A `CUSTOM` table size should show **Quote on WhatsApp** and be excluded from the total.
4. Download the Bulk Quote PDF. Enter name and phone in the dialog first. Confirm the PDF filename uses the quote reference and the grand total uses Indian digit grouping.
5. Open **Send this list on WhatsApp**; confirm the row list and quote reference. Large lists summarize to the first 10 rows and point to the PDF.
6. On `/admin/cad`, upload a `.skp` or `.dwg` up to 50 MB, set a title and active status. Confirm it appears on `/b2b` and downloads only after the CAD lead form is submitted.
7. On `/admin/leads`, test kind/status filters, search, the detail drawer, status updates, WhatsApp/copy phone, archive and CSV export.

The B2B lead and CAD routes use a honeypot plus a 5-requests-per-hour IP limit. Bulk pricing is limited to 20 requests per minute; bulk PDF generation to 5 per minute. Lead data never appears on a public page or public API response.

Run the checks:

```powershell
npm run typecheck
npm test
```
