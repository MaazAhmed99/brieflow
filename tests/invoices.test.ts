import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "@/server/auth/viewer";
import { ForbiddenError } from "@/server/authz/scope";
import * as s from "@/server/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";
import { otherOrganizationAdmin, viewerFor } from "./helpers/viewers";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", () => ({
  get db() {
    return state.db;
  },
}));

const { listInvoices } = await import("@/server/data/invoices");
const { markInvoicePaid } = await import("@/server/data/payments");

let db: TestDb;
let close: () => Promise<void>;
let accountant: Viewer;
let staff: Viewer;
let otherAdmin: Viewer;

beforeAll(async () => {
  const test = await createTestDb({ now: new Date("2026-10-27T12:00:00Z") });
  db = test.db;
  state.db = db;
  close = () => test.client.close();
  accountant = await viewerFor(db, "accountant@larkspur.example.com");
  staff = await viewerFor(db, "staff@larkspur.example.com");
  otherAdmin = await otherOrganizationAdmin(db);
});

afterAll(async () => {
  await close();
});

describe("marking an invoice paid", () => {
  it("records one payment, closes the invoice and writes the audit log", async () => {
    const [open] = await listInvoices(accountant, { status: ["sent"] });
    const result = await markInvoicePaid(accountant, open.id);
    expect(result).toEqual({ ok: true, number: open.number });

    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.id, open.id));
    expect(invoice.status).toBe("paid");
    expect(invoice.paidAt).not.toBeNull();

    const paymentRows = await db.select().from(s.payments).where(eq(s.payments.invoiceId, open.id));
    expect(paymentRows).toHaveLength(1);
    expect(paymentRows[0].amountCents).toBe(open.totalCents);

    const log = await db
      .select()
      .from(s.activityLog)
      .where(and(eq(s.activityLog.entityId, open.id), eq(s.activityLog.action, "invoice.paid")));
    expect(log.some((entry) => entry.actorId === accountant.userId)).toBe(true);
  });

  it("refuses to pay the same invoice twice", async () => {
    const [paid] = await listInvoices(accountant, { status: ["paid"] });
    const result = await markInvoicePaid(accountant, paid.id);
    expect(result.ok).toBe(false);
    const paymentRows = await db.select().from(s.payments).where(eq(s.payments.invoiceId, paid.id));
    expect(paymentRows).toHaveLength(1);
  });

  it("is not allowed for staff", async () => {
    const [open] = await listInvoices(accountant, { status: ["sent"] });
    await expect(markInvoicePaid(staff, open.id)).rejects.toThrow(ForbiddenError);
  });

  it("can't touch another organization's invoice", async () => {
    const [theirs] = await listInvoices(otherAdmin, { status: ["sent"] });
    const result = await markInvoicePaid(accountant, theirs.id);
    expect(result).toEqual({ ok: false, error: "Invoice not found." });
    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.id, theirs.id));
    expect(invoice.status).toBe("sent");
  });
});
