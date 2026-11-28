import "server-only";
import { SITE_URL } from "@/lib/site";

/**
 * Submits changed public URLs to IndexNow when INDEXNOW_KEY is configured.
 * Silently no-ops when disabled or unconfigured. Never throws.
 */
export async function submitIndexNow(paths: string[]): Promise<boolean> {
  const key = (process.env.INDEXNOW_KEY ?? "").trim();
  if (!key || paths.length === 0) return false;

  try {
    const host = new URL(SITE_URL).host;
    const urlList = paths.map((p) =>
      p.startsWith("http") ? p : `${SITE_URL}${p.startsWith("/") ? p : `/${p}`}`
    );

    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: urlList.slice(0, 100),
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}
