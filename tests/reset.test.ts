import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as s from "@/server/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", () => ({
  get db() {
    return state.db;
  },
}));

process.env.CRON_SECRET = "test-cron-secret";
process.env.DEMO_USER_PASSWORD = "test-demo-password";
delete process.env.BLOB_READ_WRITE_TOKEN;

// Frankfurter, stubbed so the test runs offline.
vi.stubGlobal(
  "fetch",
  vi.fn(async () => Response.json({ amount: 1, base: "USD", date: "2026-10-28", rates: { GBP: 0.75, EUR: 0.9 } })),
);

const { GET: reset } = await import("@/app/api/cron/reset/route");

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  const test = await createTestDb();
  db = test.db;
  state.db = db;
  close = () => test.client.close();
});

afterAll(async () => {
  await close();
  vi.unstubAllGlobals();
});

const call = (authorization?: string) =>
  reset(new Request("http://localhost/api/cron/reset", { headers: authorization ? { authorization } : {} }));

describe("nightly reset", () => {
  it("refuses callers without the cron secret", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
  });

  it("restores the sample data, undoing visitors' changes", async () => {
    // A visitor's change during the day.
    await db.update(s.clients).set({ name: "Renamed by a visitor" }).where(eq(s.clients.name, "Harbor & Finch"));

    const response = await call("Bearer test-cron-secret");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.rows).toBeGreaterThan(5000);

    expect(await db.select().from(s.clients).where(eq(s.clients.name, "Renamed by a visitor"))).toHaveLength(0);
    expect(await db.select().from(s.clients).where(eq(s.clients.name, "Harbor & Finch"))).toHaveLength(1);
  });

  it("stores today's exchange rates from Frankfurter", async () => {
    const rates = await db.select().from(s.exchangeRates).where(eq(s.exchangeRates.source, "frankfurter"));
    expect(rates.map((r) => [r.quote, r.rate]).sort()).toEqual([
      ["EUR", 0.9],
      ["GBP", 0.75],
    ]);
  });
});
