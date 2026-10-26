import "server-only";
import { and, asc, desc, eq, gte, ne } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan, scopeFor } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import { activityLog, clients, invoices, projects, tasks, users } from "@/server/db/schema";
import { getCurrencyConverter } from "./rates";

/** Paid revenue per month for the last 12 months, in the organization's base currency. */
export async function getRevenueByMonth(viewer: Viewer) {
  assertCan(viewer, "finance:read");
  const now = new Date();
  const firstMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

  const [paid, fx] = await Promise.all([
    db
      .select({ totalCents: invoices.totalCents, currency: invoices.currency, paidAt: invoices.paidAt })
      .from(invoices)
      .where(
        and(
          scopeFor(viewer, { organizationId: invoices.organizationId, clientId: invoices.clientId }),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, firstMonth),
        ),
      ),
    getCurrencyConverter(viewer),
  ]);

  // One bucket per month, including months with no revenue.
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1));
    return { key: date.toISOString().slice(0, 7), date, cents: 0 };
  });
  for (const invoice of paid) {
    const month = months.find((m) => m.key === invoice.paidAt!.toISOString().slice(0, 7));
    if (month) month.cents += fx.toBase(invoice.totalCents, invoice.currency);
  }
  return { months, currency: fx.baseCurrency, ratesSource: fx.source };
}

/** Paid revenue per client over the last 12 months, in the base currency, largest first. */
export async function getRevenueByClient(viewer: Viewer, limit = 8) {
  assertCan(viewer, "finance:read");
  const since = new Date(Date.now() - 365 * 86_400_000);
  const [paid, fx] = await Promise.all([
    db
      .select({
        totalCents: invoices.totalCents,
        currency: invoices.currency,
        clientId: clients.id,
        clientName: clients.name,
      })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(
        and(
          scopeFor(viewer, { organizationId: invoices.organizationId, clientId: invoices.clientId }),
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, since),
        ),
      ),
    getCurrencyConverter(viewer),
  ]);

  const totals = new Map<string, { clientId: string; clientName: string; cents: number }>();
  for (const invoice of paid) {
    const entry = totals.get(invoice.clientId) ?? { clientId: invoice.clientId, clientName: invoice.clientName, cents: 0 };
    entry.cents += fx.toBase(invoice.totalCents, invoice.currency);
    totals.set(invoice.clientId, entry);
  }
  return {
    clients: [...totals.values()].sort((a, b) => b.cents - a.cents).slice(0, limit),
    currency: fx.baseCurrency,
  };
}

/** The viewer's own open tasks, soonest due first. */
export async function getMyOpenTasks(viewer: Viewer, limit = 8) {
  assertCan(viewer, "project:read");
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(
      and(
        eq(tasks.organizationId, viewer.organizationId),
        eq(tasks.assigneeId, viewer.userId),
        ne(tasks.status, "done"),
        eq(projects.status, "active"),
      ),
    )
    .orderBy(asc(tasks.dueDate))
    .limit(limit);
}

/** The latest audit-log entries for the organization. */
export async function getRecentActivity(viewer: Viewer, limit = 8) {
  assertCan(viewer, "activity:read");
  return db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      summary: activityLog.summary,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      createdAt: activityLog.createdAt,
      actorName: users.name,
    })
    .from(activityLog)
    .leftJoin(users, eq(users.id, activityLog.actorId))
    .where(eq(activityLog.organizationId, viewer.organizationId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
