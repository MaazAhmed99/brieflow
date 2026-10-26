import "server-only";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan, isUuid, scopeFor } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import {
  clients,
  comments,
  milestones,
  projects,
  projectStatus,
  users,
} from "@/server/db/schema";

type ProjectStatus = (typeof projectStatus.enumValues)[number];

const projectScope = (viewer: Viewer) =>
  scopeFor(viewer, { organizationId: projects.organizationId, clientId: projects.clientId });

export async function listProjects(
  viewer: Viewer,
  filters: { status?: ProjectStatus[]; search?: string; clientId?: string } = {},
) {
  assertCan(viewer, "project:read");
  const isClient = viewer.role === "client";
  const rows = await db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      status: projects.status,
      health: projects.health,
      budgetCents: projects.budgetCents,
      currency: projects.currency,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(
      and(
        projectScope(viewer),
        filters.clientId ? eq(projects.clientId, filters.clientId) : undefined,
        filters.status?.length ? inArray(projects.status, filters.status) : undefined,
        filters.search
          ? or(
              ilike(projects.name, `%${filters.search}%`),
              ilike(projects.code, `%${filters.search}%`),
              ilike(clients.name, `%${filters.search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(projects.startDate));

  // Budgets are internal: client users never receive them.
  return isClient ? rows.map((row) => ({ ...row, budgetCents: null })) : rows;
}

/** One project with its milestones and comments, or null if the viewer can't see it. */
export async function getProject(viewer: Viewer, projectId: string) {
  assertCan(viewer, "project:read");
  if (!isUuid(projectId)) return null;
  const isClient = viewer.role === "client";

  const [project] = await db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      health: projects.health,
      budgetCents: projects.budgetCents,
      currency: projects.currency,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: clients.id,
      clientName: clients.name,
      managerName: users.name,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(users, eq(users.id, projects.managerId))
    .where(and(eq(projects.id, projectId), projectScope(viewer)))
    .limit(1);
  if (!project) return null;

  const [projectMilestones, projectComments] = await Promise.all([
    db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, project.id))
      .orderBy(asc(milestones.position)),
    db
      .select({
        id: comments.id,
        body: comments.body,
        visibility: comments.visibility,
        createdAt: comments.createdAt,
        authorName: users.name,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorId))
      .where(
        and(
          eq(comments.projectId, project.id),
          // Internal comments are for the agency team only.
          isClient ? eq(comments.visibility, "client") : undefined,
        ),
      )
      .orderBy(asc(comments.createdAt)),
  ]);

  return {
    ...project,
    budgetCents: isClient ? null : project.budgetCents,
    milestones: projectMilestones,
    comments: projectComments,
  };
}
