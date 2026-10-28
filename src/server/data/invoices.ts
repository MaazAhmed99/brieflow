import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan, isUuid, scopeFor } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import {
  activityLog,
  clients,
  invoiceItems,
  invoices,
  invoiceStatus,
  payments,
  projects,
  users,
} from "@/server/db/schema";

type InvoiceStatus = (typeof invoiceStatus.enumValues)[number];

const invoiceScope = (viewer: Viewer) =>
  scopeFor(viewer, { organizationId: invoices.organizationId, clientId: invoices.clientId });

const invoiceColumns = {
  id: invoices.id,
  number: invoices.number,
  status: invoices.status,
  currency: invoices.currency,
  issueDate: invoices.issueDate,
  dueDate: invoices.dueDate,
  subtotalCents: invoices.subtotalCents,
  taxCents: invoices.taxCents,
  totalCents: invoices.totalCents,
  paidAt: invoices.paidAt,
  clientId: clients.id,
  clientName: clients.name,
  projectId: projects.id,
  projectName: projects.name,
};

export async function listInvoices(
  viewer: Viewer,
  filters: { status?: InvoiceStatus[]; clientId?: string; projectId?: string } = {},
) {
  assertCan(viewer, "invoice:read");
  return db
    .select(invoiceColumns)
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(
      and(
        invoiceScope(viewer),
        filters.clientId ? eq(invoices.clientId, filters.clientId) : undefined,
        filters.projectId ? eq(invoices.projectId, filters.projectId) : undefined,
        filters.status?.length ? inArray(invoices.status, filters.status) : undefined,
        // Clients never see drafts the agency hasn't sent yet.
        viewer.role === "client" ? inArray(invoices.status, ["sent", "paid"]) : undefined,
      ),
    )
    .orderBy(desc(invoices.issueDate));
}

/** One invoice with line items, payments and (for staff) its history, or null if not visible. */
export async function getInvoice(viewer: Viewer, invoiceId: string) {
  assertCan(viewer, "invoice:read");
  if (!isUuid(invoiceId)) return null;
  const [invoice] = await db
    .select({ ...invoiceColumns, notes: invoices.notes })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(
      and(
        eq(invoices.id, invoiceId),
        invoiceScope(viewer),
        viewer.role === "client" ? inArray(invoices.status, ["sent", "paid"]) : undefined,
      ),
    )
    .limit(1);
  if (!invoice) return null;

  const [items, invoicePayments, history] = await Promise.all([
    db
      .select({
        id: invoiceItems.id,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPriceCents: invoiceItems.unitPriceCents,
        amountCents: invoiceItems.amountCents,
      })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id))
      .orderBy(asc(invoiceItems.position)),
    db
      .select({
        id: payments.id,
        provider: payments.provider,
        amountCents: payments.amountCents,
        currency: payments.currency,
        status: payments.status,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(eq(payments.invoiceId, invoice.id))
      .orderBy(desc(payments.createdAt)),
    viewer.role === "client"
      ? Promise.resolve([])
      : db
          .select({
            id: activityLog.id,
            summary: activityLog.summary,
            createdAt: activityLog.createdAt,
            actorName: users.name,
          })
          .from(activityLog)
          .leftJoin(users, eq(users.id, activityLog.actorId))
          .where(and(eq(activityLog.entityType, "invoice"), eq(activityLog.entityId, invoice.id)))
          .orderBy(desc(activityLog.createdAt)),
  ]);

  return { ...invoice, items, payments: invoicePayments, history };
}

/** The id of the invoice with this number (e.g. "INV-1042"), if the viewer can see it. */
export async function findInvoiceIdByNumber(viewer: Viewer, number: string) {
  assertCan(viewer, "invoice:read");
  const [row] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.number, number.trim().toUpperCase()),
        invoiceScope(viewer),
        viewer.role === "client" ? inArray(invoices.status, ["sent", "paid"]) : undefined,
      ),
    )
    .limit(1);
  return row?.id ?? null;
}
