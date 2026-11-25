import { requireAdminApi } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { isMediaKey, isOriginalKey, LEGACY_IMAGE_BUCKET, MEDIA_DERIVATIVES_BUCKET, MEDIA_ORIGINALS_BUCKET } from "@/lib/media/paths";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const missing = () => new Response(null, { status: 404, headers });
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (!(await requireAdminApi())) return new Response(null, { status: 401, headers });
  const key = (await params).key.join("/");
  const original = new URL(request.url).searchParams.get("view") === "original";
  if (original ? !isOriginalKey(key) : !isMediaKey(key)) return missing();

  const db = createServerClient();
  const bucket = original ? MEDIA_ORIGINALS_BUCKET : MEDIA_DERIVATIVES_BUCKET;
  const protectedFile = await db.storage.from(bucket).download(key);

  if (protectedFile.data) {
    return new Response(protectedFile.data, {
      headers: {
        ...headers,
        "Content-Type": original ? "application/octet-stream" : "image/webp",
        ...(original ? { "Content-Disposition": "attachment" } : {}),
      },
    });
  }

  // Staff can inspect legacy catalog photos while replacing them with clean uploads.
  if (!original && key.startsWith("catalog/legacy/")) {
    const { data } = await db.storage.from(LEGACY_IMAGE_BUCKET).download(key.slice("catalog/legacy/".length));
    if (data && imageTypes.has(data.type)) {
      return new Response(data, { headers: { ...headers, "Content-Type": data.type } });
    }
  }
  return missing();
}
