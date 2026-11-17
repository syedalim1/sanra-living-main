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
- All 7 tables (`material_rates`, `products`, `product_pricing_rules`, `product_visual_variants`, `orders`, `secret_jig_vault`, `cash_and_worker_logs`).
- Row Level Security (RLS) on all 7 tables with strict browser isolation on private tables.
- The `product-images` public storage bucket.

---

### Step 2: Run Catalog Migration (`002_catalog.sql`)

> Run this **after** Step 1 and **before** Step 3 (seed data).

1. In the Supabase **SQL Editor**, click **"New query"**.
2. Open [supabase/migrations/002_catalog.sql](file:///d:/Downloads/sanra-living-i/supabase/migrations/002_catalog.sql) and copy the entire file content.
3. Paste it into the query editor and click **Run**.
4. Confirm execution succeeds with `Success. No rows returned` or similar.

This adds to `products`:
- `use_cases TEXT[]` — allowed values: `CAFE`, `OFFICE`, `HOME`, `HOSPITAL`, `HOSTEL`
- `material_tags TEXT[]` — allowed values: `MS`, `SS`, `WOOD`, `GRANITE`
- `sort_order INT` — controls catalog display ordering

> **Fresh installs only:** If you are setting up for the first time (no prior data), you may skip this step and run `seed.sql` directly — the updated `seed.sql` already includes these columns.

---

### Step 3: Run Seed Data (`seed.sql`)

1. In the Supabase **SQL Editor**, click **"New query"**.
2. Open [supabase/seed.sql](file:///d:/Downloads/sanra-living-i/supabase/seed.sql) and copy the entire file content.
3. Paste it into the query editor and click **Run**.
4. Confirm execution succeeds.

This populates:
- All 14 material codes (MS, SS, Rubberwood, Granite, Prelam, etc.) with placeholder unit costs.
- 3 sample `TABLE` products (Cafe table 4×2 ft, Workstation 4×2.5 ft, Dining table 6×3 ft).
- Product pricing rules and visual variants for each table.
- Catalog tags (`use_cases`, `material_tags`, `sort_order`) on all sample products.

---

### Step 4: Verify the Database Connection

Once migrations and seed data are complete, verify the server health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"ok": true}
```

No table details, secrets, or internal schemas are exposed by this endpoint.

---

### Step 5: Verify Pricing Data Privacy (Security Check)

The from-price engine is **strictly server-only**. Here is how to confirm that no internal cost data is ever leaked to the browser:

#### Method A — Browser DevTools (Recommended)

1. Open `http://localhost:3000/products` in Chrome or Firefox.
2. Open **DevTools** → **Network** tab.
3. Reload the page and inspect the main HTML document response.
4. Use `Ctrl+F` to search the response body for any of these words:
   - `pipe_weight`
   - `labor`
   - `overhead`
   - `margin`
   - `cost_per_unit`
   - `base_pipe_weight`
   - `consumables_cost`
5. **Expected result:** None of these terms appear anywhere in the HTML payload. Only `from_price` as a computed rupee number is embedded.

#### Method B — View Page Source

1. Navigate to `http://localhost:3000/products`.
2. Right-click → **View Page Source**.
3. Press `Ctrl+F` and search for the words listed above.
4. **Expected result:** Zero matches.

#### Method C — API Response Check

```bash
# This should return only {"ok": true} — no product rows, no pricing fields
curl http://localhost:3000/api/health

# This returns only computed prices — no internal factors
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{"productId":"any-id","topMaterialCode":"WOOD_RUBBER_18","customerType":"RETAIL"}'
```

Expected `/api/quote` response shape — confirm it contains **only**:
```json
{
  "success": true,
  "data": {
    "baseCost": ...,
    "finalPrice": ...,
    "gstAmount": ...,
    "totalWithGst": ...,
    "customerType": "RETAIL",
    "topMaterialName": "...",
    "topMaterialCode": "...",
    "frameMaterialName": "...",
    "isCustomQuoteRequired": false
  }
}
```
Confirm the response body does **not** contain: `base_pipe_weight_18g_kg`, `labor_cost`, `overhead_pct`, `retail_margin_pct`, `cost_per_unit`.
