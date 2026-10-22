import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, currency, id, organizationId } from "./columns";

export const clientStatus = pgEnum("client_status", [
  "active",
  "paused",
  "archived",
]);

export const clients = pgTable(
  "clients",
  {
    id: id(),
    organizationId: organizationId(),
    name: text().notNull(),
    industry: text(),
    website: text(),
    country: text().notNull(),
    city: text(),
    currency: currency(),
    status: clientStatus().notNull().default("active"),
    ownerId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.organizationId, t.status)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: id(),
    organizationId: organizationId(),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text().notNull(),
    email: text().notNull(),
    jobTitle: text(),
    isPrimary: boolean().notNull().default(false),
    // Set when this contact can sign in to the client portal.
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.clientId)],
);

export const clientNotes = pgTable(
  "client_notes",
  {
    id: id(),
    organizationId: organizationId(),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.clientId)],
);
