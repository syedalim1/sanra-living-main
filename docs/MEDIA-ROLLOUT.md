# Photo protection rollout

Use staging first. Production provisioning, uploads, deployment and bucket changes require approval. Pause legacy photo edits during the final production sync. Take a database backup and retain a private copy of the legacy objects before release.

## 1. Provision

1. Confirm the target Supabase project. Apply [the provisioning migration](../supabase/migrations/20261125124253_media_protection_and_projects.sql) in its SQL Editor. It creates two private buckets, a staff-managed project table and an owner-only readiness view. Apply the [project deletion grant](../supabase/migrations/20261125131100_allow_supply_project_deletion.sql) afterward. The existing `product-images` bucket keeps serving the current storefront during preparation.
2. Start the redesigned app on a restricted preview connected to that target. For a staging clone, rebase copied legacy storage URL origins to the staging Supabase origin in staging only. The app resolves legacy paths for the Supabase origin it is configured to use.
3. Run this read-only query in the target SQL Editor. Include inactive catalog rows so their photographs are available if republished.

```sql
SELECT references_in_catalog, source_origin, legacy_key, protected_url,
       original_archived, full_ready, mobile_ready, status
FROM sanra_internal.legacy_media_readiness
ORDER BY status, legacy_key;
```

## 2. Backfill

1. Match each `legacy_key` to the clean source photograph. For an `unsupported_url`, replace that image reference through the normal admin upload with its clean source, then rerun the inventory.
2. In **Admin → Photo protection**, optionally upload the approved logo first. Select the clean source files and enter one `filename=legacy_key` per line using the exact filename selected. For example, `original.jpg=products/SKU/previous-name.webp`. Select the clean-source confirmation and process the batch. Each batch accepts 1–12 references, up to 8 MB per file and subject to the host's total request limit.
3. If the private original exists but a derivative is missing, submit the `protected_url` alone to regenerate both derivatives. Previously stamped files without clean sources remain a release blocker until the originals are recovered or an approved replacement is uploaded.
4. Rerun the inventory. Every row must be `ready` and its `source_origin` must match the app's configured Supabase origin. Open each `protected_url` through the preview and confirm both the full image and `?size=mobile` return WebP. Use the staff preview to confirm the embedded mark. Verify order tracking still uses signed links for customer-visible order photos.

## 3. Cut over after approval

1. With all rows ready, switch production traffic to the protected app. Confirm the public catalog, sets and projects load from the protected image paths. Keep the old app available for rollback until this check passes.
2. Run [the guarded cutover SQL](../supabase/legacy-media-cutover.sql). It rechecks readiness and removes legacy anonymous and authenticated object access. Then, under **Supabase Storage → product-images → Edit bucket**, set the bucket to **Private**. The public object endpoint bypasses RLS while the bucket is public, so both steps are required.
3. Probe previously public legacy image URLs without credentials, including a cache-busted URL. Direct access to all three private media buckets and anonymous requests to staff original URLs must fail. Confirm the protected catalog endpoints still return WebP, draft or unpublished project images return 404, and staff can download an archived original.
4. Retire cached and separately hosted legacy copies. Pre-existing downloads and client caches cannot be recalled. If a protected image fails after cutover, fix the derivative and keep the source bucket private.

Under **Admin → Projects**, record the actual delivery details and select up to eight approved photos. Arrange the photos before saving. The first photo becomes the gallery cover. Saved projects can be edited, unpublished or deleted from the same editor.
