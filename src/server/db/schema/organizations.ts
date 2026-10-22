import { char, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The tenant table. It lives in its own file and doesn't use the shared column
// helpers, because those helpers reference it (this avoids a circular import).
export const organizations = pgTable("organizations", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  baseCurrency: char({ length: 3 }).notNull().default("USD"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
