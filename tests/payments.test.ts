import { and, desc, eq, ne } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "@/server/auth/viewer";
import { ForbiddenError } from "@/server/authz/scope";
import * as s from "@/server/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";
import { viewerFor } from "./helpers/viewers";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", () => ({
  get db() {
    return state.db;
  },
}));

// Offline Stripe test-mode settings: signatures are checked locally, nothing calls Stripe.
const WEBHOOK_SECRET = "whsec_test_brieflow";
process.env.STRIPE_SECRET_KEY = "sk_test_offline";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const { payInvoiceWithDemo, applyStripeCheckout } = await import("@/server/data/payments");
const { POST: stripeWebhook } = await import("@/app/api/stripe/webhook/route");

let db: TestDb;
let close: () => Promise<void>;
let client: Viewer;
let accountant: Viewer;

beforeAll(async () => {
  const test = await createTestDb({ now: new Date("2026-10-29T12:00:00Z") });
  db = test.db;
  state.db = db;
  close = () => test.client.close();
  client = await viewerFor(db, "client@harborandfinch.example.com");
  accountant = await viewerFor(db, "accountant@larkspur.example.com");
});

afterAll(async () => {
  await close();
});

async function openInvoice(where: "own" | "other") {
  const [row] = await db
    .select()
    .from(s.invoices)
    .where(
      and(
        eq(s.invoices.organizationId, client.organizationId),
        eq(s.invoices.status, "sent"),
        where === "own" ? eq(s.invoices.clientId, client.clientId!) : ne(s.invoices.clientId, client.clientId!),
      ),
    )
    .limit(1);
  return row;
}

const paymentsFor = (invoiceId: string) => db.select().from(s.payments).where(eq(s.payments.invoiceId, invoiceId));

describe("demo checkout", () => {
  it("lets a client pay their own open invoice, once", async () => {
    const invoice = await openInvoice("own");
    expect(await payInvoiceWithDemo(client, invoice.id)).toEqual({ ok: true, number: invoice.number });

    const [after] = await db.select().from(s.invoices).where(eq(s.invoices.id, invoice.id));
    expect(after.status).toBe("paid");
    const rows = await paymentsFor(invoice.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: "demo", amountCents: invoice.totalCents });

    const [log] = await db
      .select()
      .from(s.activityLog)
      .where(eq(s.activityLog.entityId, invoice.id))
      .orderBy(desc(s.activityLog.createdAt))
      .limit(1);
    expect(log.summary).toMatch(/paid invoice .* with a demo payment/);

    // Paying again is refused and adds nothing.
    expect((await payInvoiceWithDemo(client, invoice.id)).ok).toBe(false);
    expect(await paymentsFor(invoice.id)).toHaveLength(1);
  });

  it("won't let a client pay another client's invoice", async () => {
    const invoice = await openInvoice("other");
    expect(await payInvoiceWithDemo(client, invoice.id)).toEqual({ ok: false, error: "Invoice not found." });
    expect(await paymentsFor(invoice.id)).toHaveLength(0);
  });

  it("is only for client users", async () => {
    const invoice = await openInvoice("other");
    await expect(payInvoiceWithDemo(accountant, invoice.id)).rejects.toThrow(ForbiddenError);
  });
});

describe("Stripe payments", () => {
  it("records a completed checkout once, however many times Stripe retries", async () => {
    const invoice = await openInvoice("other");
    const session = {
      id: "cs_test_1",
      paymentIntentId: "pi_test_1",
      amountTotal: invoice.totalCents,
      currency: invoice.currency.toLowerCase(),
      metadata: { invoiceId: invoice.id, organizationId: invoice.organizationId },
    };
    expect(await applyStripeCheckout(session)).toEqual({ applied: true });
    expect(await applyStripeCheckout(session)).toEqual({ applied: false, reason: "already recorded" });
    const rows = await paymentsFor(invoice.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: "stripe", providerRef: "pi_test_1" });
  });

  it("ignores a checkout whose metadata points at another organization", async () => {
    const invoice = await openInvoice("own");
    const [otherOrg] = await db.select().from(s.organizations).where(ne(s.organizations.id, client.organizationId));
    const result = await applyStripeCheckout({
      id: "cs_test_2",
      paymentIntentId: "pi_test_2",
      amountTotal: 100,
      currency: "usd",
      metadata: { invoiceId: invoice.id, organizationId: otherOrg.id },
    });
    expect(result).toEqual({ applied: false, reason: "invoice not found" });
  });
});

describe("Stripe webhook route", () => {
  const stripe = new Stripe("sk_test_offline");

  async function deliver(event: object, options: { secret?: string } = {}) {
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: options.secret ?? WEBHOOK_SECRET });
    return stripeWebhook(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": signature },
        body: payload,
      }),
    );
  }

  const checkoutEvent = (invoice: { id: string; organizationId: string; totalCents: number }, livemode = false) => ({
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    livemode,
    data: {
      object: {
        id: "cs_test_hook",
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: "pi_test_hook",
        amount_total: invoice.totalCents,
        currency: "usd",
        metadata: { invoiceId: invoice.id, organizationId: invoice.organizationId },
      },
    },
  });

  it("rejects a request with a wrong signature", async () => {
    const invoice = await openInvoice("other");
    const response = await deliver(checkoutEvent(invoice), { secret: "whsec_wrong" });
    expect(response.status).toBe(400);
    expect(await paymentsFor(invoice.id)).toHaveLength(0);
  });

  it("rejects live-mode events", async () => {
    const invoice = await openInvoice("other");
    const response = await deliver(checkoutEvent(invoice, true));
    expect(response.status).toBe(400);
  });

  it("marks the invoice paid for a valid signed event", async () => {
    const invoice = await openInvoice("other");
    const response = await deliver(checkoutEvent(invoice));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true, applied: true });
    const [after] = await db.select().from(s.invoices).where(eq(s.invoices.id, invoice.id));
    expect(after.status).toBe("paid");
  });
});
