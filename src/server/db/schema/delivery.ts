import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, currency, id, organizationId } from "./columns";
import { clients } from "./crm";

export const projectStatus = pgEnum("project_status", [
  "planned",
  "active",
  "on_hold",
  "completed",
]);

export const projectHealth = pgEnum("project_health", [
  "on_track",
  "at_risk",
  "off_track",
]);

export const milestoneStatus = pgEnum("milestone_status", [
  "upcoming",
  "in_progress",
  "done",
]);

export const taskStatus = pgEnum("task_status", [
  "todo",
  "in_progress",
  "review",
  "done",
]);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const commentVisibility = pgEnum("comment_visibility", [
  "internal",
  "client",
]);

export const projects = pgTable(
  "projects",
  {
    id: id(),
    organizationId: organizationId(),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    status: projectStatus().notNull().default("planned"),
    health: projectHealth().notNull().default("on_track"),
    budgetCents: integer().notNull().default(0),
    currency: currency(),
    startDate: date(),
    dueDate: date(),
    managerId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex().on(t.organizationId, t.code),
    index().on(t.organizationId, t.status),
    index().on(t.clientId),
  ],
);

export const projectMembers = pgTable(
  "project_members",
  {
    organizationId: organizationId(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] }), index().on(t.userId)],
);

export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    organizationId: organizationId(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text().notNull(),
    dueDate: date(),
    status: milestoneStatus().notNull().default("upcoming"),
    position: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.projectId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    organizationId: organizationId(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    milestoneId: uuid().references(() => milestones.id, {
      onDelete: "set null",
    }),
    title: text().notNull(),
    status: taskStatus().notNull().default("todo"),
    priority: taskPriority().notNull().default("medium"),
    assigneeId: uuid().references(() => users.id, { onDelete: "set null" }),
    dueDate: date(),
    estimateHours: integer(),
    position: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.projectId, t.status), index().on(t.assigneeId)],
);

// "internal" comments are hidden from client users.
export const comments = pgTable(
  "comments",
  {
    id: id(),
    organizationId: organizationId(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    body: text().notNull(),
    visibility: commentVisibility().notNull().default("internal"),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.projectId)],
);

export const files = pgTable(
  "files",
  {
    id: id(),
    organizationId: organizationId(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    uploadedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    name: text().notNull(),
    blobPathname: text().notNull(),
    blobUrl: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    // Seed files are static sample files; the nightly reset keeps them and
    // deletes everything uploaded since.
    isSeed: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.projectId)],
);
