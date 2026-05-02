import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  async rewrites() {
    return [
      { source: "/pitch", destination: "/pitch.html" },
      { source: "/pitch/", destination: "/pitch.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default config;
