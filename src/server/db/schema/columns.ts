import { char, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// Shared column builders. Column names are camelCase here and become
// snake_case in Postgres through Drizzle's `casing: "snake_case"` option.

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// Every business row belongs to one organization (tenant). Deleting an
// organization deletes all of its data.
export const organizationId = () =>
  uuid()
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" });

// ISO 4217 code such as "USD". Amounts are stored as integer cents next to it.
export const currency = () => char({ length: 3 }).notNull();
