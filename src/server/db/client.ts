import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// One Postgres pool per server instance. In production DATABASE_URL is Neon's
// pooled connection string; locally it points at `pnpm db:local` (PGlite)
// unless .env.local sets a Neon URL.

const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  if (!process.env.DATABASE_URL && process.env.NEXT_PHASE !== "phase-production-build") {
    console.error(
      "DATABASE_URL is not set. Locally, start `corepack pnpm@9.15.4 db:local`; on Vercel, add it in Project Settings → Environment Variables.",
    );
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  // Lets Vercel close idle connections cleanly when a function instance is suspended.
  attachDatabasePool(pool);
  return pool;
}

// Reuse the pool across hot reloads in development.
const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export type Db = typeof db;
