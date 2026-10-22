// Wipes the database and fills it with the demo data.
// Usage: corepack pnpm@9.15.4 db:seed   (reads DATABASE_URL and DEMO_USER_PASSWORD from .env.local)

import { loadEnvConfig } from "@next/env";
import { Pool } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../src/server/db/schema";
import { resetDatabase, seedDatabase } from "../src/server/db/seed/seed";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL;
  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  }
  if (!demoPassword || demoPassword.length < 12) {
    throw new Error("DEMO_USER_PASSWORD must be at least 12 characters. Add it to .env.local.");
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });
  const started = Date.now();

  // One transaction, so nobody ever sees a half-empty demo.
  const counts = await db.transaction(async (tx) => {
    await resetDatabase(tx);
    return seedDatabase(tx, { passwordHash: await hashPassword(demoPassword) });
  });

  console.table(counts);
  console.log(`Seeded in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
