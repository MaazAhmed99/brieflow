import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/config/api-docs";
import { demoApiKey } from "@/config/demo";
import { apiKeyPrefix, generateApiKey, hashApiKey } from "@/lib/api-keys";
import {
  clientResource,
  invoiceDetailResource,
  invoiceResource,
  projectDetailResource,
  projectResource,
} from "@/server/api/schemas";
import * as s from "@/server/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", () => ({
  get db() {
    return state.db;
  },
}));

// The handler refuses requests when no database is configured; the tests use PGlite instead.
process.env.DATABASE_URL = "postgres://pglite-in-memory";

const clientsRoute = await import("@/app/api/v1/clients/route");
const projectsRoute = await import("@/app/api/v1/projects/route");
const projectRoute = await import("@/app/api/v1/projects/[id]/route");
const invoicesRoute = await import("@/app/api/v1/invoices/route");
const invoiceRoute = await import("@/app/api/v1/invoices/[id]/route");

let db: TestDb;
let close: () => Promise<void>;
let fernvaleKey: string;
let revokedKey: string;
let larkspurId: string;

beforeAll(async () => {
  const test = await createTestDb();
  db = test.db;
  state.db = db;
  close = () => test.client.close();

  const [larkspur] = await db.select().from(s.organizations).where(eq(s.organizations.slug, "larkspur"));
  const [fernvale] = await db.select().from(s.organizations).where(eq(s.organizations.slug, "fernvale"));
  larkspurId = larkspur.id;
  fernvaleKey = generateApiKey();
  revokedKey = generateApiKey();
  await db.insert(s.apiKeys).values([
    { organizationId: fernvale.id, name: "Fernvale", prefix: apiKeyPrefix(fernvaleKey), keyHash: hashApiKey(fernvaleKey) },
    {
      organizationId: larkspur.id,
      name: "Old key",
      prefix: apiKeyPrefix(revokedKey),
      keyHash: hashApiKey(revokedKey),
      revokedAt: new Date(),
    },
  ]);
});

afterAll(async () => {
  await close();
});

type Handler<P> = (request: Request, context: { params: Promise<P> }) => Promise<Response>;

async function call<P = object>(handler: Handler<P>, path: string, key?: string, params = {} as P) {
  const request = new Request(`http://localhost${path}`, {
    headers: key === undefined ? {} : { authorization: `Bearer ${key}` },
  });
  const response = await handler(request, { params: Promise.resolve(params) });
  return { status: response.status, headers: response.headers, body: await response.json() };
}

describe("API key authentication", () => {
  it("answers 503 when the deployment has no database", async () => {
    const url = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const res = await call(clientsRoute.GET, "/api/v1/clients", demoApiKey);
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("unavailable");
    } finally {
      process.env.DATABASE_URL = url;
    }
  });

  it("rejects requests without a key", async () => {
    const res = await call(clientsRoute.GET, "/api/v1/clients");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: "unauthorized", message: expect.any(String) } });
  });

  it("rejects malformed, unknown and revoked keys", async () => {
    for (const key of ["not-a-key", generateApiKey(), revokedKey]) {
      const res = await call(clientsRoute.GET, "/api/v1/clients", key);
      expect(res.status, key).toBe(401);
      expect(res.body.error.code).toBe("unauthorized");
    }
  });

  it("accepts the seeded demo key and records when it was used", async () => {
    const res = await call(clientsRoute.GET, "/api/v1/clients", demoApiKey);
    expect(res.status).toBe(200);
    const [row] = await db.select().from(s.apiKeys).where(eq(s.apiKeys.keyHash, hashApiKey(demoApiKey)));
    expect(row.lastUsedAt).not.toBeNull();
  });

  it("rate limits each key to 60 requests a minute", async () => {
    const key = generateApiKey();
    await db
      .insert(s.apiKeys)
      .values({ organizationId: larkspurId, name: "Busy", prefix: apiKeyPrefix(key), keyHash: hashApiKey(key) });
    const missing = { id: "00000000-0000-4000-8000-000000000000" };
    for (let i = 0; i < 60; i++) {
      expect((await call(projectRoute.GET, "/api/v1/projects/x", key, missing)).status).toBe(404);
    }
    const res = await call(projectRoute.GET, "/api/v1/projects/x", key, missing);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("rate_limited");
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("organization isolation", () => {
  it("only lists the key's own organization", async () => {
    const larkspurClients = await db.$count(s.clients, eq(s.clients.organizationId, larkspurId));
    const demo = await call(clientsRoute.GET, "/api/v1/clients?pageSize=100", demoApiKey);
    expect(demo.body.pagination.total).toBe(larkspurClients);

    const fernvale = await call(clientsRoute.GET, "/api/v1/clients?pageSize=100", fernvaleKey);
    const larkspurIds = new Set(demo.body.data.map((c: { id: string }) => c.id));
    expect(fernvale.body.data.length).toBeGreaterThan(0);
    expect(fernvale.body.data.some((c: { id: string }) => larkspurIds.has(c.id))).toBe(false);
  });

  it("returns 404, not someone else's data, for another organization's records", async () => {
    const projects = await call(projectsRoute.GET, "/api/v1/projects", demoApiKey);
    const invoices = await call(invoicesRoute.GET, "/api/v1/invoices", demoApiKey);
    const project = await call(projectRoute.GET, "/api/v1/projects/x", fernvaleKey, { id: projects.body.data[0].id });
    const invoice = await call(invoiceRoute.GET, "/api/v1/invoices/x", fernvaleKey, { id: invoices.body.data[0].id });
    expect(project.status).toBe(404);
    expect(invoice.status).toBe(404);
    expect(project.body.error.code).toBe("not_found");
  });
});

describe("responses", () => {
  it("paginates with a standard envelope", async () => {
    const first = await call(projectsRoute.GET, "/api/v1/projects?pageSize=5", demoApiKey);
    const second = await call(projectsRoute.GET, "/api/v1/projects?pageSize=5&page=2", demoApiKey);
    expect(first.body.data).toHaveLength(5);
    expect(first.body.pagination).toMatchObject({ page: 1, pageSize: 5 });
    expect(first.body.pagination.totalPages).toBe(Math.ceil(first.body.pagination.total / 5));
    expect(second.body.data[0].id).not.toBe(first.body.data[0].id);
  });

  it("rejects invalid query parameters with a 400", async () => {
    for (const query of ["pageSize=500", "page=0", "status=lost", "clientId=abc"]) {
      const res = await call(projectsRoute.GET, `/api/v1/projects?${query}`, demoApiKey);
      expect(res.status, query).toBe(400);
      expect(res.body.error.code).toBe("invalid_request");
    }
  });

  it("returns only the documented fields", async () => {
    const res = await call(clientsRoute.GET, "/api/v1/clients", demoApiKey);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ["activeProjects", "city", "country", "id", "industry", "name", "outstanding", "status"].sort(),
    );
    expect(JSON.stringify(res.body)).not.toContain("organizationId");
  });

  it("filters invoices by their reported status", async () => {
    const res = await call(invoicesRoute.GET, "/api/v1/invoices?status=overdue&pageSize=100", demoApiKey);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((i: { status: string }) => i.status === "overdue")).toBe(true);
  });

  it("returns invoice detail whose lines add up", async () => {
    const list = await call(invoicesRoute.GET, "/api/v1/invoices?status=paid", demoApiKey);
    const res = await call(invoiceRoute.GET, "/api/v1/invoices/x", demoApiKey, { id: list.body.data[0].id });
    const invoice = res.body.data;
    const lines = invoice.items.reduce((sum: number, item: { amount: { amountCents: number } }) => sum + item.amount.amountCents, 0);
    expect(lines).toBe(invoice.subtotal.amountCents);
    expect(invoice.subtotal.amountCents + invoice.tax.amountCents).toBe(invoice.total.amountCents);
    expect(invoice.payments.length).toBeGreaterThan(0);
    expect(invoice.paidAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns project detail with milestones and task counts", async () => {
    const list = await call(projectsRoute.GET, "/api/v1/projects?status=active", demoApiKey);
    const res = await call(projectRoute.GET, "/api/v1/projects/x", demoApiKey, { id: list.body.data[0].id });
    expect(res.status).toBe(200);
    expect(res.body.data.milestones.length).toBeGreaterThan(0);
    expect(res.body.data.tasks.done).toBeLessThanOrEqual(res.body.data.tasks.total);
    expect(res.body.data.client.name).toEqual(expect.any(String));
  });

  it("treats a malformed id as not found", async () => {
    const res = await call(invoiceRoute.GET, "/api/v1/invoices/x", demoApiKey, { id: "not-a-uuid" });
    expect(res.status).toBe(404);
  });
});

describe("API docs", () => {
  const schemas = {
    "list-clients": clientResource,
    "list-projects": projectResource,
    "get-project": projectDetailResource,
    "list-invoices": invoiceResource,
    "get-invoice": invoiceDetailResource,
  } as const;

  it("documents every endpoint with an example the real schema accepts unchanged", () => {
    expect(apiEndpoints.map((e) => e.id).sort()).toEqual(Object.keys(schemas).sort());
    for (const endpoint of apiEndpoints) {
      const schema = schemas[endpoint.id as keyof typeof schemas];
      const { data } = endpoint.response as { data: unknown };
      for (const item of Array.isArray(data) ? data : [data]) {
        // parse() drops unknown fields, so equality also catches fields the API doesn't return.
        expect(schema.parse(item), endpoint.id).toEqual(item);
      }
    }
  });
});
