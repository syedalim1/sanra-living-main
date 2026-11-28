# SANRA LIVING — Production Launch & Final Testing Checklist

## Pre-Launch Preparation
1. **Database Backup:** Take a full Supabase snapshot/pg_dump before applying any upgrade migrations.
2. **Migration Sequence:** Run the STEP 01–06 migrations in exact order on staging first, then production (see `docs/MIGRATIONS-UPGRADE.md`).
3. **Approved Pricing Profiles:** In `/admin/pricing-rules`, create and approve `pricing_profiles` for Retail/B2B, SS/MS, Chairs, Tables, and Sets with confirmed margin %, rounding, and GST mode/rate.
4. **Manufacturing Cost Import:** Export final variant costs from Excel as CSV using `/api/admin/cost-import/template` and apply via `/admin/cost-import`.
5. **Product Photos & Variants:** Verify watermarked product photos in `/admin/products/[id]`, sync variants, verify calculated selling prices, and publish ready variants.
6. **Business Contact Settings:** Verify `NEXT_PUBLIC_WHATSAPP_NUMBER`, `COMPANY_PHONE`, `COMPANY_SECONDARY_PHONE`, `COMPANY_EMAIL`, `COMPANY_ADDRESS`, `GOOGLE_MAPS_URL`, and `NEXT_PUBLIC_SITE_URL`.
7. **SEO Verification:** Set `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_BING_VERIFICATION`, `INDEXNOW_KEY` (with `public/${INDEXNOW_KEY}.txt`), and optional `NEXT_PUBLIC_GA_ID`.

## Final Testing Checklist (STEP 09)
- [ ] `npx tsc --noEmit` (TypeScript type check)
- [ ] `npm run lint` (ESLint)
- [ ] `npm test` (Vitest suite, including leak & pricing tests)
- [ ] `npm run build` (Next.js production build)
- [ ] Security verification: `/api/quote`, `/api/price`, `/api/enquiry/quote`, product RSC props, PDFs, and WhatsApp messages contain zero `baseCost`, `manufacturing_cost`, `gauge`, `thickness`, or `margin`.
- [ ] Public storefront smoke check: `/`, `/products`, `/collections/steel-chairs`, `/industries/restaurants`, `/products/[sku]`, `/enquiry`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`.
- [ ] Admin smoke check: `/admin`, `/admin/products/[id]`, `/admin/cost-import`, `/admin/pricing-rules`, `/admin/leads`, `/admin/quotes/[id]`.
