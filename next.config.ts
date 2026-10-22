import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
