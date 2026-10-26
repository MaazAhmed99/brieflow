import "server-only";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { isoDaysFromToday } from "@/lib/format";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan, scopeFor } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import {
  clients,
  departments,
  expenses,
  leads,
  leaveRequests,
  memberships,
  projects,
  purchaseOrders,
  tickets,
  timeEntries,
  users,
  vendors,
} from "@/server/db/schema";

// Read-only queries behind the Preview modules (sales, time, expenses, HR,
// support). Same rules as everywhere else: a permission check first, and every
// query limited to the viewer's organization.

export async function listLeads(viewer: Viewer) {
  assertCan(viewer, "sales:read");
  return db
    .select({
      id: leads.id,
      company: leads.company,
      contactName: leads.contactName,
      source: leads.source,
      stage: leads.stage,
      valueCents: leads.valueCents,
      currency: leads.currency,
      expectedClose: leads.expectedClose,
      createdAt: leads.createdAt,
      ownerName: users.name,
    })
    .from(leads)
    .leftJoin(users, eq(users.id, leads.ownerId))
    .where(eq(leads.organizationId, viewer.organizationId))
    .orderBy(desc(leads.valueCents));
}

/** Time entries from the last `days` days. */
export async function listTimeEntries(viewer: Viewer, days = 28) {
  assertCan(viewer, "time:read");
  return db
    .select({
      id: timeEntries.id,
      workedOn: timeEntries.workedOn,
      minutes: timeEntries.minutes,
      billable: timeEntries.billable,
      note: timeEntries.note,
      personId: users.id,
      personName: users.name,
      projectId: projects.id,
      projectName: projects.name,
    })
    .from(timeEntries)
    .innerJoin(users, eq(users.id, timeEntries.userId))
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .where(
      and(eq(timeEntries.organizationId, viewer.organizationId), gte(timeEntries.workedOn, isoDaysFromToday(-days))),
    )
    .orderBy(desc(timeEntries.workedOn));
}

export async function listExpenses(viewer: Viewer) {
  assertCan(viewer, "finance:read");
  return db
    .select({
      id: expenses.id,
      spentOn: expenses.spentOn,
      category: expenses.category,
      description: expenses.description,
      amountCents: expenses.amountCents,
      currency: expenses.currency,
      status: expenses.status,
      vendorName: vendors.name,
      projectName: projects.name,
      submittedBy: users.name,
    })
    .from(expenses)
    .leftJoin(vendors, eq(vendors.id, expenses.vendorId))
    .leftJoin(projects, eq(projects.id, expenses.projectId))
    .leftJoin(users, eq(users.id, expenses.submittedBy))
    .where(eq(expenses.organizationId, viewer.organizationId))
    .orderBy(desc(expenses.spentOn));
}

export async function listPurchaseOrders(viewer: Viewer) {
  assertCan(viewer, "finance:read");
  return db
    .select({
      id: purchaseOrders.id,
      number: purchaseOrders.number,
      status: purchaseOrders.status,
      totalCents: purchaseOrders.totalCents,
      currency: purchaseOrders.currency,
      issuedOn: purchaseOrders.issuedOn,
      vendorName: vendors.name,
      vendorCategory: vendors.category,
    })
    .from(purchaseOrders)
    .innerJoin(vendors, eq(vendors.id, purchaseOrders.vendorId))
    .where(eq(purchaseOrders.organizationId, viewer.organizationId))
    .orderBy(desc(purchaseOrders.issuedOn));
}

export async function listEmployees(viewer: Viewer) {
  assertCan(viewer, "hr:read");
  return db
    .select({
      id: users.id,
      name: users.name,
      jobTitle: memberships.jobTitle,
      department: departments.name,
      location: memberships.location,
      startedOn: memberships.startedOn,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .leftJoin(departments, eq(departments.id, memberships.departmentId))
    .where(eq(memberships.organizationId, viewer.organizationId))
    .orderBy(asc(departments.name), asc(users.name))
    .then((rows) => rows.filter((row) => row.department !== null));
}

/** Leave that hasn't ended yet, soonest first. */
export async function listUpcomingLeave(viewer: Viewer) {
  assertCan(viewer, "hr:read");
  return db
    .select({
      id: leaveRequests.id,
      type: leaveRequests.type,
      status: leaveRequests.status,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      personName: users.name,
    })
    .from(leaveRequests)
    .innerJoin(users, eq(users.id, leaveRequests.userId))
    .where(
      and(eq(leaveRequests.organizationId, viewer.organizationId), gte(leaveRequests.endDate, isoDaysFromToday(0))),
    )
    .orderBy(asc(leaveRequests.startDate));
}

/** Support tickets; client users only get their own company's. */
export async function listTickets(viewer: Viewer) {
  assertCan(viewer, "support:read");
  return db
    .select({
      id: tickets.id,
      number: tickets.number,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      clientName: clients.name,
      assigneeName: users.name,
    })
    .from(tickets)
    .innerJoin(clients, eq(clients.id, tickets.clientId))
    .leftJoin(users, eq(users.id, tickets.assigneeId))
    .where(scopeFor(viewer, { organizationId: tickets.organizationId, clientId: tickets.clientId }))
    .orderBy(desc(tickets.createdAt));
}
