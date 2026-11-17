import type { NextConfig } from "next";

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
  outputFileTracingIncludes: {
    "/api/quote-pdf": ["./lib/fonts/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
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
