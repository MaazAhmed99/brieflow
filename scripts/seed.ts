// Wipes the database and fills it with the demo data.
// Usage: corepack pnpm@9.15.4 db:seed
// Reads DATABASE_URL and DEMO_USER_PASSWORD from .env.local (or .env.development).

import { loadEnvConfig } from "@next/env";
import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/server/db/schema";
import { resetDatabase, seedDatabase } from "../src/server/db/seed/seed";
import { refreshExchangeRates } from "../src/server/integrations/exchange-rates";

loadEnvConfig(process.cwd(), true);

async function main() {
  const url = process.env.DATABASE_URL;
  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  }
  if (!demoPassword || demoPassword.length < 12) {
    throw new Error("DEMO_USER_PASSWORD must be at least 12 characters. Add it to .env.local.");
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle({ client: pool, schema, casing: "snake_case" });
  const started = Date.now();

  // One transaction, so nobody ever sees a half-empty demo.
  const counts = await db.transaction(async (tx) => {
    await resetDatabase(tx);
    return seedDatabase(tx, { passwordHash: await hashPassword(demoPassword) });
  });

  console.table(counts);
  console.log(`Seeded ${new URL(url).hostname} in ${((Date.now() - started) / 1000).toFixed(1)} s`);

  // Best effort: today's ECB rates instead of the fixed demo ones.
  try {
    const { date, rates } = await refreshExchangeRates(db);
    console.log(`Exchange rates from Frankfurter (${date}):`, rates);
  } catch (error) {
    console.warn("Couldn't fetch exchange rates; keeping the fixed demo rates.", (error as Error).message);
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
