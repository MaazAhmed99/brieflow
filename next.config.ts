import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No floating dev badge (it would show up in screenshots).
  devIndicators: false,
  experimental: {
    // File uploads (max 2 MB, checked again on the server) go through a Server
    // Action; leave room for the multipart overhead.
    serverActions: { bodySizeLimit: "2200kb" },
  },
  // Cache Components is off for v1: almost every page depends on the signed-in
  // user, so it would add Suspense rules everywhere for little gain.
  turbopack: {
    // New-Dev (the parent folder) has its own package-lock.json; pin the root to this app.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
