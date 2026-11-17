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

If a company value is missing, the UI shows a visible `UPDATE ME` placeholder instead of crashing. The GST wording on the PDF comes from `GST_NOTE` in `lib/company.ts` and can be edited directly.

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

### Step 5: Verify the Database Connection

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"ok": true}
```

---

### Step 6: Verify Pricing Data Privacy (Security Check)

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

### Step 7: Verify WhatsApp Booking, PDF Quotes and Delivery Estimator

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
