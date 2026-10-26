import "server-only";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan, isUuid, scopeFor } from "@/server/authz/scope";
import { db } from "@/server/db/client";
import {
  clients,
  comments,
  files,
  memberships,
  milestones,
  projectMembers,
  projects,
  projectStatus,
  tasks,
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

  const [projectMilestones, projectComments, projectFiles, projectTasks, team] = await Promise.all([
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
    db
      .select({
        id: files.id,
        name: files.name,
        url: files.blobUrl,
        contentType: files.contentType,
        sizeBytes: files.sizeBytes,
        createdAt: files.createdAt,
        uploaderName: users.name,
      })
      .from(files)
      .leftJoin(users, eq(users.id, files.uploadedBy))
      .where(eq(files.projectId, project.id))
      .orderBy(desc(files.createdAt)),
    // Tasks and the team list are internal to the agency.
    isClient
      ? Promise.resolve([])
      : db
          .select({
            id: tasks.id,
            title: tasks.title,
            status: tasks.status,
            priority: tasks.priority,
            dueDate: tasks.dueDate,
            milestoneId: tasks.milestoneId,
            assigneeName: users.name,
          })
          .from(tasks)
          .leftJoin(users, eq(users.id, tasks.assigneeId))
          .where(eq(tasks.projectId, project.id))
          .orderBy(asc(tasks.position)),
    isClient
      ? Promise.resolve([])
      : db
          .select({ id: users.id, name: users.name, jobTitle: memberships.jobTitle })
          .from(projectMembers)
          .innerJoin(users, eq(users.id, projectMembers.userId))
          .leftJoin(
            memberships,
            and(eq(memberships.userId, users.id), eq(memberships.organizationId, viewer.organizationId)),
          )
          .where(eq(projectMembers.projectId, project.id))
          .orderBy(asc(users.name)),
  ]);

  return {
    ...project,
    budgetCents: isClient ? null : project.budgetCents,
    milestones: projectMilestones,
    comments: projectComments,
    files: projectFiles,
    tasks: projectTasks,
    team,
  };
}
