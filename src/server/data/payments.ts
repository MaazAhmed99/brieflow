import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { formatMoney } from "@/lib/format";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan, isUuid } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import { activityLog, clients, invoices, payments, paymentProvider } from "@/server/db/schema";

// Every way of paying an invoice (manual, demo checkout, Stripe webhook) ends
// in recordInvoicePayment, inside a transaction that has locked the invoice.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Provider = (typeof paymentProvider.enumValues)[number];

const methodText: Record<Provider, string> = {
  stripe: "by card (Stripe test mode)",
  demo: "with a demo payment",
  manual: "by bank transfer",
};

/** Locks an invoice row for the rest of the transaction. */
async function lockInvoice(tx: Tx, organizationId: string, invoiceId: string) {
  const [invoice] = await tx
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      clientId: invoices.clientId,
      totalCents: invoices.totalCents,
      currency: invoices.currency,
      clientName: clients.name,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId)))
    .for("update", { of: invoices });
  return invoice ?? null;
}

/**
 * Saves a payment and marks the invoice paid, once. The payment's providerRef
 * is unique, so a repeated Stripe webhook (or double click) records nothing new.
 */
export async function recordInvoicePayment(
  tx: Tx,
  input: {
    organizationId: string;
    invoice: NonNullable<Awaited<ReturnType<typeof lockInvoice>>>;
    provider: Provider;
    providerRef: string;
    amountCents: number;
    currency: string;
    actorId: string | null;
    /** The audit-log line, e.g. "Harbor & Finch paid invoice INV-1042 ($3,360.00) by card". */
    summary: string;
  },
) {
  const inserted = await tx
    .insert(payments)
    .values({
      organizationId: input.organizationId,
      invoiceId: input.invoice.id,
      provider: input.provider,
      providerRef: input.providerRef,
      amountCents: input.amountCents,
      currency: input.currency,
      status: "succeeded",
    })
    .onConflictDoNothing({ target: payments.providerRef })
    .returning({ id: payments.id });
  if (inserted.length === 0) return { recorded: false as const };

  await tx.update(invoices).set({ status: "paid", paidAt: new Date() }).where(eq(invoices.id, input.invoice.id));
  await tx.insert(activityLog).values({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "invoice.paid",
    entityType: "invoice",
    entityId: input.invoice.id,
    summary: input.summary,
    metadata: { provider: input.provider },
  });
  return { recorded: true as const };
}

export type PaymentResult = { ok: true; number: string } | { ok: false; error: string };

/** Agency staff record a bank transfer. */
export async function markInvoicePaid(viewer: Viewer, invoiceId: string): Promise<PaymentResult> {
  assertCan(viewer, "invoice:write");
  if (!isUuid(invoiceId)) return { ok: false, error: "Invoice not found." };
  return db.transaction(async (tx) => {
    const invoice = await lockInvoice(tx, viewer.organizationId, invoiceId);
    if (!invoice) return { ok: false, error: "Invoice not found." };
    if (invoice.status !== "sent") {
      return { ok: false, error: `Only open invoices can be marked paid (this one is ${invoice.status}).` };
    }
    await recordInvoicePayment(tx, {
      organizationId: viewer.organizationId,
      invoice,
      provider: "manual",
      providerRef: `manual_${randomUUID()}`,
      amountCents: invoice.totalCents,
      currency: invoice.currency,
      actorId: viewer.userId,
      summary: `${viewer.name} recorded a bank transfer for invoice ${invoice.number} (${formatMoney(invoice.totalCents, invoice.currency)})`,
    });
    return { ok: true, number: invoice.number };
  });
}

/** A client pays their own open invoice in the demo checkout. */
export async function payInvoiceWithDemo(viewer: Viewer, invoiceId: string): Promise<PaymentResult> {
  assertCan(viewer, "invoice:pay");
  if (!isUuid(invoiceId)) return { ok: false, error: "Invoice not found." };
  return db.transaction(async (tx) => {
    const invoice = await lockInvoice(tx, viewer.organizationId, invoiceId);
    // A client can only ever pay their own company's invoices.
    if (!invoice || invoice.clientId !== viewer.clientId) return { ok: false, error: "Invoice not found." };
    if (invoice.status !== "sent") return { ok: false, error: "This invoice isn't open for payment." };
    await recordInvoicePayment(tx, {
      organizationId: viewer.organizationId,
      invoice,
      provider: "demo",
      providerRef: `demo_${randomUUID()}`,
      amountCents: invoice.totalCents,
      currency: invoice.currency,
      actorId: viewer.userId,
      summary: `${invoice.clientName} paid invoice ${invoice.number} (${formatMoney(invoice.totalCents, invoice.currency)}) ${methodText.demo}`,
    });
    return { ok: true, number: invoice.number };
  });
}

/**
 * Applies a completed Stripe Checkout session (from the verified webhook).
 * Safe to call more than once for the same session.
 */
export async function applyStripeCheckout(session: {
  id: string;
  paymentIntentId: string | null;
  amountTotal: number;
  currency: string;
  metadata: { invoiceId?: string; organizationId?: string; payerUserId?: string };
}) {
  const { invoiceId, organizationId, payerUserId } = session.metadata;
  if (!invoiceId || !organizationId || !isUuid(invoiceId) || !isUuid(organizationId)) {
    return { applied: false as const, reason: "missing metadata" };
  }
  return db.transaction(async (tx) => {
    const invoice = await lockInvoice(tx, organizationId, invoiceId);
    if (!invoice) return { applied: false as const, reason: "invoice not found" };
    const result = await recordInvoicePayment(tx, {
      organizationId,
      invoice,
      provider: "stripe",
      providerRef: session.paymentIntentId ?? session.id,
      amountCents: session.amountTotal,
      currency: session.currency.toUpperCase(),
      actorId: payerUserId && isUuid(payerUserId) ? payerUserId : null,
      summary: `${invoice.clientName} paid invoice ${invoice.number} (${formatMoney(session.amountTotal, session.currency.toUpperCase())}) ${methodText.stripe}`,
    });
    return result.recorded ? { applied: true as const } : { applied: false as const, reason: "already recorded" };
  });
}
