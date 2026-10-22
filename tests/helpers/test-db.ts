import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/server/db/schema";
import { seedDatabase } from "@/server/db/seed/seed";

// A real Postgres database running in memory (PGlite), with our migrations and
// seed applied. Tests use it instead of Neon: fast, offline and free.
export async function createTestDb(options: { now?: Date } = {}) {
  const client = new PGlite();
  const db = drizzle({ client, schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "drizzle" });
  // Tests never sign in with a password, so a placeholder hash is enough.
  const counts = await seedDatabase(db, { passwordHash: "test-hash", now: options.now });
  return { db, client, counts };
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>["db"];
