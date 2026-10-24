import "server-only";
import { and, asc, eq, ilike } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan, scopeFor } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import { clients, users } from "@/server/db/schema";

const clientScope = (viewer: Viewer) =>
  scopeFor(viewer, { organizationId: clients.organizationId, clientId: clients.id });

export async function listClients(viewer: Viewer, filters: { search?: string } = {}) {
  assertCan(viewer, "client:read");
  return db
    .select({
      id: clients.id,
      name: clients.name,
      industry: clients.industry,
      country: clients.country,
      city: clients.city,
      currency: clients.currency,
      status: clients.status,
      ownerName: users.name,
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
}
