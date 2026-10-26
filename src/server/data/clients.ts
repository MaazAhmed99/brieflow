import "server-only";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { assertCan, isUuid, scopeFor } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import { clientNotes, clients, contacts, invoices, projects, users } from "@/server/db/schema";

const clientScope = (viewer: Viewer) =>
  scopeFor(viewer, { organizationId: clients.organizationId, clientId: clients.id });

// Per-client totals, worked out in the same query.
const activeProjects = sql<number>`(
  select count(*) from ${projects}
  where ${projects.clientId} = ${clients.id} and ${projects.status} = 'active'
)`.mapWith(Number);

const outstandingCents = sql<number>`(
  select coalesce(sum(${invoices.totalCents}), 0) from ${invoices}
  where ${invoices.clientId} = ${clients.id} and ${invoices.status} = 'sent'
)`.mapWith(Number);

export async function listClients(viewer: Viewer, filters: { search?: string } = {}) {
  assertCan(viewer, "client:read");
  const seesFinance = can(viewer, "invoice:read");
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      country: clients.country,
      city: clients.city,
      currency: clients.currency,
      status: clients.status,
      ownerName: users.name,
      activeProjects,
      outstandingCents,
    })
    .from(clients)
    .leftJoin(users, eq(users.id, clients.ownerId))
    .where(
      and(
        clientScope(viewer),
        filters.search ? ilike(clients.name, `%${filters.search}%`) : undefined,
      ),
    )
    .orderBy(asc(clients.name));

  // Staff without finance access don't receive balances.
  return rows.map((row) => ({ ...row, outstandingCents: seesFinance ? row.outstandingCents : null }));
}

/** One client with contacts and internal notes, or null if the viewer can't see it. */
export async function getClient(viewer: Viewer, clientId: string) {
  assertCan(viewer, "client:read");
  if (!isUuid(clientId)) return null;

  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      website: clients.website,
      country: clients.country,
      city: clients.city,
      currency: clients.currency,
      status: clients.status,
      createdAt: clients.createdAt,
      ownerName: users.name,
    })
    .from(clients)
    .leftJoin(users, eq(users.id, clients.ownerId))
    .where(and(eq(clients.id, clientId), clientScope(viewer)))
    .limit(1);
  if (!client) return null;

  const [clientContacts, notes] = await Promise.all([
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        jobTitle: contacts.jobTitle,
        isPrimary: contacts.isPrimary,
        hasPortalAccess: sql<boolean>`${contacts.userId} is not null`,
      })
      .from(contacts)
      .where(eq(contacts.clientId, client.id))
      .orderBy(desc(contacts.isPrimary), asc(contacts.name)),
    db
      .select({
        id: clientNotes.id,
        body: clientNotes.body,
        createdAt: clientNotes.createdAt,
        authorName: users.name,
      })
      .from(clientNotes)
      .leftJoin(users, eq(users.id, clientNotes.authorId))
      .where(eq(clientNotes.clientId, client.id))
      .orderBy(desc(clientNotes.createdAt)),
  ]);

  return { ...client, contacts: clientContacts, notes };
}
