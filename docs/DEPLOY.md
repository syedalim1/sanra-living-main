# SANRA LIVING — Deploy Checklist

## 1. Push to GitHub

1. Commit the final source.
2. Push to a private GitHub repository.
3. Confirm `.env.local` is not committed.

## 2. Choose a host

A free host such as Vercel, Netlify or Cloudflare Pages can run a Next.js app. Free plans can have terms about commercial use and usage limits. Check the current terms of whichever host you choose before launching a business site. Paid plans may be needed for commercial traffic.

## 3. Environment variables

Set these by NAME in the host dashboard. Values stay in the host secret store.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAIL
NEXT_PUBLIC_WHATSAPP_NUMBER
NEXT_PUBLIC_SITE_URL
COMPANY_ADDRESS
COMPANY_GSTIN
COMPANY_PHONE
COMPANY_EMAIL
GOOGLE_MAPS_URL
```

`NEXT_PUBLIC_SITE_URL` must be the final HTTPS origin, for example `https://sanraliving.com`. `ADMIN_EMAIL` must exactly match the Supabase Auth user email. `COMPANY_EMAIL` is the public contact email and must not be the admin login address. `NEXT_PUBLIC_WHATSAPP_NUMBER` is digits only with country code.

## 4. Database

1. Run migrations in order: `001_init.sql` through `009_use_cases_and_loads.sql`.
2. Run `supabase/seed.sql` if you want the sample catalog.
3. Create the admin Auth user with the exact `ADMIN_EMAIL` and a strong password.
4. Keep the email/password provider enabled; disable public sign-ups.
5. Set **Authentication → URL Configuration → Site URL** to the production origin.
6. Add the production origin to **Redirect URLs** (for example `https://sanraliving.com/**`).
7. Create the private storage buckets used by migrations: `order-photos`, `cad-files`; `product-images` remains the public image bucket.

## 5. Host project settings

- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`
- Start command: `npm run start` (or the host's Next.js serverless preset)
- Node version: 22+ recommended
- Do not commit local paths; the build must use only environment variables.

## 6. Custom domain and HTTPS

1. Add the domain in the host dashboard.
2. Copy the DNS records the host gives you.
3. Update DNS at your domain registrar.
4. Wait for DNS and automatic HTTPS certificate issuance.
5. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS URL and redeploy.
6. Update the Supabase Auth Site URL and Redirect URLs to the same domain.

## 7. Post-deploy smoke tests

- `GET /api/health` returns `{"ok":true}`.
- Homepage, `/products`, one product page, `/b2b`, `/track`, `/contact`, `/privacy`, `/terms` load.
- Admin login works; `/admin` is not linked publicly.
- Save one rate change and check a product price.
- Create a test order, copy the tracking code, move it to READY, and download the warranty PDF.
- Submit a sample lead and a bulk quote PDF.
- Upload a small CAD test file and download it after the lead form.
- Check `robots.txt`, `sitemap.xml`, `/.well-known/security.txt` and `/og-default.png`.
- Check response headers on `/admin/login`: `X-Frame-Options: DENY`, `Cache-Control: no-store`, CSP present.
- Open DevTools Network and confirm no service-role key or admin email appears in browser responses.
- Repeat a quick mobile check at 360 px for horizontal scrolling.
