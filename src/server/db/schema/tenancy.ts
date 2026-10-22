import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, id, organizationId } from "./columns";
import { clients } from "./crm";

export const memberRole = pgEnum("member_role", [
  "admin",
  "manager",
  "accountant",
  "staff",
  "client",
]);

export const departments = pgTable(
  "departments",
  {
    id: id(),
    organizationId: organizationId(),
    name: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.organizationId)],
);

// Links a user to an organization with a role. A client user also points at
// the client company they belong to; that is what limits them to their own data.
export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    organizationId: organizationId(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRole().notNull(),
    clientId: uuid().references(() => clients.id, { onDelete: "cascade" }),
    departmentId: uuid().references(() => departments.id, {
      onDelete: "set null",
    }),
    jobTitle: text(),
    startedOn: date(),
    location: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex().on(t.userId, t.organizationId),
    index().on(t.organizationId, t.role),
    // Client users must have a client; everyone else must not.
    check(
      "memberships_client_role_check",
      sql`(${t.role} = 'client') = (${t.clientId} is not null)`,
    ),
  ],
);
