import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, id, organizationId } from "./columns";

// Audit log: every change writes one row (who did what to which record, and when).
export const activityLog = pgTable(
  "activity_log",
  {
    id: id(),
    organizationId: organizationId(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    action: text().notNull(), // for example "invoice.paid"
    entityType: text().notNull(),
    entityId: uuid().notNull(),
    summary: text().notNull(),
    metadata: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index().on(t.organizationId, t.createdAt),
    index().on(t.entityType, t.entityId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    organizationId: organizationId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().notNull(),
    title: text().notNull(),
    link: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.userId, t.readAt)],
);

// One row per user per day: counts AI assistant requests and tokens. Shown in
// settings, and used as the quota counter if Upstash is unavailable.
export const aiUsage = pgTable(
  "ai_usage",
  {
    organizationId: organizationId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    usageDate: date().notNull(),
    requests: integer().notNull().default(0),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.usageDate] })],
);
