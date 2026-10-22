import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Each test file builds its own in-memory Postgres; seeding takes a few seconds.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
