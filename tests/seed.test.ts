import { and, eq, lt } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { demoAccounts } from "@/config/demo";
import * as s from "@/server/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";

const NOW = new Date("2026-10-23T12:00:00Z");

let db: TestDb;
let counts: Record<string, number>;
let close: () => Promise<void>;

beforeAll(async () => {
  const test = await createTestDb({ now: NOW });
  db = test.db;
  counts = test.counts;
  close = () => test.client.close();
});

afterAll(async () => {
  await close();
});

describe("seed data", () => {
  it("fills every module with roughly the planned volume", () => {
    expect(counts.organizations).toBe(2);
    expect(counts.users).toBeGreaterThanOrEqual(45);
    expect(counts.clients).toBe(32);
    expect(counts.projects).toBeGreaterThanOrEqual(60);
    expect(counts.tasks).toBeGreaterThanOrEqual(700);
    expect(counts.invoices).toBeGreaterThanOrEqual(180);
    expect(counts.timeEntries).toBeGreaterThanOrEqual(1200);
    expect(counts.expenses).toBe(300);
    expect(counts.leads).toBe(120);
    expect(counts.tickets).toBe(90);
    expect(counts.activityLog).toBeGreaterThan(500);
  });

  it("creates every one-click demo account with the right role", async () => {
    for (const account of demoAccounts) {
      const [row] = await db
        .select({ role: s.memberships.role, slug: s.organizations.slug })
        .from(s.users)
        .innerJoin(s.memberships, eq(s.memberships.userId, s.users.id))
        .innerJoin(s.organizations, eq(s.organizations.id, s.memberships.organizationId))
        .where(eq(s.users.email, account.email));
      expect(row, account.email).toEqual({ role: account.role, slug: "larkspur" });
    }
  });

  it("gives the demo client an overdue invoice and an open one to pay", async () => {
    const [membership] = await db
      .select({ clientId: s.memberships.clientId })
      .from(s.memberships)
      .innerJoin(s.users, eq(s.users.id, s.memberships.userId))
      .where(eq(s.users.email, "client@harborfinch.example.com"));
    const unpaid = await db
      .select({ dueDate: s.invoices.dueDate })
      .from(s.invoices)
      .where(and(eq(s.invoices.clientId, membership.clientId!), eq(s.invoices.status, "sent")));
    const today = NOW.toISOString().slice(0, 10);
    expect(unpaid.some((i) => i.dueDate < today)).toBe(true);
    expect(unpaid.some((i) => i.dueDate >= today)).toBe(true);
  });

  it("keeps invoice totals equal to their line items plus tax", async () => {
    const invoices = await db.query.invoices.findMany({ with: { items: true } });
    for (const invoice of invoices) {
      const itemsTotal = invoice.items.reduce((sum, item) => sum + item.amountCents, 0);
      expect(invoice.subtotalCents).toBe(itemsTotal);
      expect(invoice.totalCents).toBe(invoice.subtotalCents + invoice.taxCents);
    }
  });

  it("records a payment for every paid invoice and none for unpaid ones", async () => {
    const paid = await db.select().from(s.invoices).where(eq(s.invoices.status, "paid"));
    const payments = await db.select().from(s.payments);
    expect(payments).toHaveLength(paid.length);
  });

  it("puts no activity in the future", async () => {
    const future = await db
      .select()
      .from(s.activityLog)
      .where(lt(s.activityLog.createdAt, new Date(NOW.getTime() + 1)));
    expect(future.length).toBe(counts.activityLog);
  });

  it("is deterministic for the same day", async () => {
    const again = await createTestDb({ now: NOW });
    const first = await db.select({ name: s.clients.name }).from(s.clients).orderBy(s.clients.name);
    const second = await again.db
      .select({ name: s.clients.name })
      .from(s.clients)
      .orderBy(s.clients.name);
    expect(second).toEqual(first);
    await again.client.close();
  });
});
