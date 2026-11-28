import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PRIVATE_DISALLOW = ["/admin", "/api/", "/track", "/enquiry"];
const PUBLIC_ALLOW = ["/", "/api/media/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "Bingbot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        userAgent: "PerplexityBot",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
      {
        // Keep model-training crawler separate from OAI-SearchBot search indexing
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW,
        disallow: PRIVATE_DISALLOW,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
