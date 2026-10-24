import { and, eq, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Viewer } from "@/server/auth/viewer";
import { can, type Permission } from "./permissions";

// Row-level access, in one place. Every query in the Data Access Layer adds
// scopeFor(viewer, table) to its WHERE clause:
//   - everyone only sees rows from their own organization
//   - client users only see rows that belong to their own client company

type ScopeViewer = Pick<Viewer, "organizationId" | "role" | "clientId">;

type ScopedTable = {
  organizationId: AnyPgColumn;
  // The column holding the client id. For the clients table itself, pass clients.id.
  clientId?: AnyPgColumn;
};

export function scopeFor(viewer: ScopeViewer, table: ScopedTable): SQL {
  const sameOrganization = eq(table.organizationId, viewer.organizationId);
  if (viewer.role !== "client") return sameOrganization;
  // A client user can never see rows that aren't tied to a client.
  if (!table.clientId || !viewer.clientId) return sql`false`;
  return and(sameOrganization, eq(table.clientId, viewer.clientId))!;
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

/** Throws unless the viewer has the permission. Data functions call this first. */
export function assertCan(viewer: Pick<Viewer, "role">, permission: Permission) {
  if (!can(viewer, permission)) throw new ForbiddenError(permission);
}
