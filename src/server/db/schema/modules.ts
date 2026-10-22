import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, currency, id, organizationId, updatedAt } from "./columns";
import { clients } from "./crm";
import { projects, tasks } from "./delivery";

// Tables behind the Preview modules: sales pipeline, time tracking, HR leave
// and support tickets. Read-only in the UI for v1.

export const leadStage = pgEnum("lead_stage", [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);

export const leaveType = pgEnum("leave_type", [
  "annual",
  "sick",
  "unpaid",
  "parental",
]);

export const leaveStatus = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected",
]);

export const ticketStatus = pgEnum("ticket_status", [
  "open",
  "pending",
  "resolved",
  "closed",
]);

export const ticketPriority = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const leads = pgTable(
  "leads",
  {
    id: id(),
    organizationId: organizationId(),
    company: text().notNull(),
    contactName: text().notNull(),
    source: text().notNull(),
    stage: leadStage().notNull().default("new"),
    valueCents: integer().notNull(),
    currency: currency(),
    ownerId: uuid().references(() => users.id, { onDelete: "set null" }),
    expectedClose: date(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.organizationId, t.stage)],
);

export const timeEntries = pgTable(
  "time_entries",
  {
    id: id(),
    organizationId: organizationId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    taskId: uuid().references(() => tasks.id, { onDelete: "set null" }),
    workedOn: date().notNull(),
    minutes: integer().notNull(),
    billable: boolean().notNull().default(true),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.organizationId, t.workedOn),
    index().on(t.userId, t.workedOn),
    index().on(t.projectId),
  ],
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: id(),
    organizationId: organizationId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: leaveType().notNull(),
    startDate: date().notNull(),
    endDate: date().notNull(),
    status: leaveStatus().notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.organizationId, t.startDate)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: id(),
    organizationId: organizationId(),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    number: integer().notNull(),
    subject: text().notNull(),
    body: text().notNull(),
    status: ticketStatus().notNull().default("open"),
    priority: ticketPriority().notNull().default("normal"),
    assigneeId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.organizationId, t.status), index().on(t.clientId)],
);
