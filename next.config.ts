import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function supabaseOrigin(): string {
  try {
    return new URL(supabaseUrl ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
}

const supabase = supabaseOrigin();
const supabaseWs = supabase.replace(/^http/, "ws");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase} https://*.supabase.co https://images.unsplash.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} https://*.supabase.co ${supabaseWs} wss://*.supabase.co https://wa.me${
    isProduction ? "" : " ws: http: https:"
  }`,
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self' https://wa.me",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const globalSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const publicPageCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, s-maxage=3600, stale-while-revalidate=86400",
  },
];

const catalogCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, s-maxage=300, stale-while-revalidate=600",
  },
];

const adminSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "no-store" },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {
    "/api/quote-pdf": ["./lib/fonts/**/*"],
    "/api/warranty-pdf": ["./lib/fonts/**/*"],
    "/api/bulk-quote-pdf": ["./lib/fonts/**/*"],
    "/*": ["./lib/fonts/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
  images: {
    localPatterns: [
      { pathname: "/images/**" },
      { pathname: "/og-default.png" },
      { pathname: "/api/media/catalog/**" },
    ],
  },
  async rewrites() {
    return [
      { source: "/images/:name(cat-[a-z-]+).jpg", destination: "/images/:name.webp" },
      {
        source: "/.well-known/security.txt",
        destination: "/security-txt",
      },
    ];
  },
  async headers() {
    return [
      { source: "/(.*)", headers: globalSecurityHeaders },
      { source: "/", headers: publicPageCacheHeaders },
      { source: "/contact", headers: publicPageCacheHeaders },
      { source: "/privacy", headers: publicPageCacheHeaders },
      { source: "/terms", headers: publicPageCacheHeaders },
      { source: "/products", headers: catalogCacheHeaders },
      { source: "/products/:path*", headers: catalogCacheHeaders },
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/og-default.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      { source: "/admin", headers: adminSecurityHeaders },
      { source: "/admin/:path*", headers: adminSecurityHeaders },
      { source: "/api/admin/:path*", headers: adminSecurityHeaders },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
