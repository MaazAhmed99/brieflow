import { relations } from "drizzle-orm";
import { users } from "./auth";
import { clientNotes, clients, contacts } from "./crm";
import {
  comments,
  files,
  milestones,
  projectMembers,
  projects,
  tasks,
} from "./delivery";
import { invoiceItems, invoices, payments } from "./finance";
import { organizations } from "./organizations";
import { departments, memberships } from "./tenancy";

// Relations power Drizzle's `db.query.*` API (for example loading an invoice
// with its items). They don't change the database itself.

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  departments: many(departments),
  clients: many(clients),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  client: one(clients, {
    fields: [memberships.clientId],
    references: [clients.id],
  }),
  department: one(departments, {
    fields: [memberships.departmentId],
    references: [departments.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  memberships: many(memberships),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  owner: one(users, { fields: [clients.ownerId], references: [users.id] }),
  contacts: many(contacts),
  notes: many(clientNotes),
  projects: many(projects),
  invoices: many(invoices),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, { fields: [contacts.clientId], references: [clients.id] }),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  client: one(clients, {
    fields: [clientNotes.clientId],
    references: [clients.id],
  }),
  author: one(users, { fields: [clientNotes.authorId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  manager: one(users, { fields: [projects.managerId], references: [users.id] }),
  members: many(projectMembers),
  milestones: many(milestones),
  tasks: many(tasks),
  comments: many(comments),
  files: many(files),
  invoices: many(invoices),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  project: one(projects, {
    fields: [comments.projectId],
    references: [projects.id],
  }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  project: one(projects, { fields: [files.projectId], references: [projects.id] }),
  uploader: one(users, { fields: [files.uploadedBy], references: [users.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));
