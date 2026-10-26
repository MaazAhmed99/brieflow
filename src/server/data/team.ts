import "server-only";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import { activityLog, departments, memberships, users } from "@/server/db/schema";

/** Everyone who works at the agency (client users are listed under their client). */
export async function listTeam(viewer: Viewer) {
  assertCan(viewer, "team:read");
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
      jobTitle: memberships.jobTitle,
      department: departments.name,
      location: memberships.location,
      startedOn: memberships.startedOn,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .leftJoin(departments, eq(departments.id, memberships.departmentId))
    .where(and(eq(memberships.organizationId, viewer.organizationId), ne(memberships.role, "client")))
    .orderBy(asc(users.name));
}

/** The audit log, newest first. */
export async function listActivity(viewer: Viewer, limit = 500) {
  assertCan(viewer, "activity:read");
  return db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      summary: activityLog.summary,
      createdAt: activityLog.createdAt,
      actorName: users.name,
    })
    .from(activityLog)
    .leftJoin(users, eq(users.id, activityLog.actorId))
    .where(eq(activityLog.organizationId, viewer.organizationId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
