# SANRA LIVING — Operations Notes

Simple English, for the factory owner and staff.

## 1. Rotate the Supabase service-role key

1. Open the Supabase Dashboard for the SANRA project.
2. Go to **Settings → API**.
3. Create a new secret/service-role key if the dashboard offers rotation.
4. Put the new value in `SUPABASE_SERVICE_ROLE_KEY` in your hosting environment.
5. Redeploy or restart the app.
6. Test admin login, rate saving, product image upload and PDF generation.
7. Revoke the old service-role key only after the new deploy works.

Never paste the service-role key into chat, email, screenshots, or a public repository.

## 2. Rotate the admin password

1. Open **Authentication → Users**.
2. Find the user whose email matches `ADMIN_EMAIL`.
3. Reset the password to a long random password.
4. Sign in at `/admin/login` with the new password.
5. Confirm the old password no longer works.

There is no hardcoded PIN or password in the application.

## 3. Backups

1. Open **Database → Backups** in Supabase.
2. Download a manual backup before every migration or bulk rate change.
3. Keep an off-site copy of the backup file.
4. Free plans may have limited backup retention. Check the current Supabase plan terms.
5. Suggested minimum: a manual backup before migrations, after a large price change, and at least once a week while orders are active.

## 4. Updating rates and photos

- Rates: `/admin/rates` → edit → **Save All Changes**. Public “From” prices are revalidated immediately.
- Products, swatches, photos and variants: `/admin/products`.
- CAD models: `/admin/cad`.
- After a change, check `/products` and one affected product page in a private browser window.

## 5. Restore after a mistake

1. Stop taking new orders if data is being overwritten.
2. Download the latest good backup or open the Supabase restore option.
3. Restore into a staging project first if possible.
4. Verify products, pricing rules, orders, leads and audit data.
5. Point the app back to the restored project only after verification.
6. Rotate keys if there is any chance they were exposed.

## 6. Suspicious login or admin activity

1. Open `/admin/audit` and review recent actions.
2. Open Supabase **Authentication → Users** and review the account/session activity.
3. Change the admin password immediately.
4. Sign out all sessions in Supabase if available.
5. Enable MFA on the Supabase account and plan app-level MFA if required.
6. If the service-role key may have leaked, rotate it and redeploy.
7. Check `/admin/leads` and `/admin/orders` for unexpected changes.

## 7. Rate limits

Migration 008 stores shared rate limits in the private `rate_limits` table and cleans old rows opportunistically. If login or `/track` fails with a rate-limit message while the database is unavailable, that is expected fail-closed behavior for those routes. Public price routes fail open.

## 8. Health check

`GET /api/health` returns `{"ok":true}` and checks only a product count. Use it for host uptime checks.

## 9. Node and testing

- Run `npm run typecheck` and `npm test` before deploying.
- Node 20 currently works but Supabase warns it is deprecated. Node 22+ is recommended.
- The full `npm audit` has dev-only Vitest advisories; upgrade to Vitest 5 after moving to Node 22.
