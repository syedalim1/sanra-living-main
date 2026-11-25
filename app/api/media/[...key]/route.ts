import { createServerClient } from "@/lib/supabase/server";
import { isMediaKey, mediaUrl, MEDIA_DERIVATIVES_BUCKET, projectIdFromMediaKey } from "@/lib/media/paths";

const unavailable = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!isMediaKey(key)) return unavailable();

  try {
    const db = createServerClient();
    const projectId = projectIdFromMediaKey(key);
    if (projectId) {
      const { data, error } = await db.from("supply_projects").select("id")
        .eq("id", projectId).eq("published", true)
        .contains("photo_urls", [mediaUrl(key)]).maybeSingle();
      if (error || !data) return unavailable();
    }

    const mobile = new URL(request.url).searchParams.get("size") === "mobile";
    const { data } = await db.storage.from(MEDIA_DERIVATIVES_BUCKET).download(mobile ? "mobile/" + key : key);
    if (!data) return unavailable();

    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": projectId ? "private, no-store" : "public, max-age=60, s-maxage=60",
      },
    });
  } catch {
    return unavailable();
  }
}
