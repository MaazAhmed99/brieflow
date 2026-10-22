import {
  char,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, currency, id, organizationId } from "./columns";
import { clients } from "./crm";
import { projects } from "./delivery";

// "Overdue" is not stored: it is a sent invoice whose due date has passed,
// worked out in queries so it can never go stale.
export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "void",
]);

// "manual" is a bank transfer recorded by staff (used by the seed data).
export const paymentProvider = pgEnum("payment_provider", [
  "stripe",
  "demo",
  "manual",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
]);

export const expenseStatus = pgEnum("expense_status", [
  "submitted",
  "approved",
  "rejected",
  "reimbursed",
]);

export const purchaseOrderStatus = pgEnum("purchase_order_status", [
  "draft",
  "issued",
  "received",
  "closed",
]);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    organizationId: organizationId(),
    clientId: uuid()
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    projectId: uuid().references(() => projects.id, { onDelete: "set null" }),
    number: text().notNull(),
    status: invoiceStatus().notNull().default("draft"),
    currency: currency(),
    issueDate: date().notNull(),
    dueDate: date().notNull(),
    subtotalCents: integer().notNull(),
    taxCents: integer().notNull().default(0),
    totalCents: integer().notNull(),
    paidAt: timestamp({ withTimezone: true }),
    notes: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex().on(t.organizationId, t.number),
    index().on(t.organizationId, t.status, t.dueDate),
    index().on(t.clientId),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: id(),
    organizationId: organizationId(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text().notNull(),
    quantity: integer().notNull(),
    unitPriceCents: integer().notNull(),
    amountCents: integer().notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [index().on(t.invoiceId)],
);

// providerRef is unique so a repeated Stripe webhook can't record a payment twice.
export const payments = pgTable(
  "payments",
  {
    id: id(),
    organizationId: organizationId(),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    provider: paymentProvider().notNull(),
    providerRef: text().notNull().unique(),
    amountCents: integer().notNull(),
    currency: currency(),
    status: paymentStatus().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.invoiceId)],
);

// Daily rates used to convert totals to the organization's base currency.
// source is "frankfurter" for live rates or "static" for the seed's fixed demo rates.
export const exchangeRates = pgTable(
  "exchange_rates",
  {
    rateDate: date().notNull(),
    base: char({ length: 3 }).notNull(),
    quote: char({ length: 3 }).notNull(),
    rate: doublePrecision().notNull(),
    source: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.rateDate, t.base, t.quote] })],
);

// Preview module: expenses, vendors and purchase orders.

export const vendors = pgTable(
  "vendors",
  {
    id: id(),
    organizationId: organizationId(),
    name: text().notNull(),
    category: text().notNull(),
    country: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.organizationId)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    organizationId: organizationId(),
    projectId: uuid().references(() => projects.id, { onDelete: "set null" }),
    vendorId: uuid().references(() => vendors.id, { onDelete: "set null" }),
    category: text().notNull(),
    description: text().notNull(),
    amountCents: integer().notNull(),
    currency: currency(),
    spentOn: date().notNull(),
    status: expenseStatus().notNull().default("submitted"),
    submittedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.organizationId, t.spentOn)],
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: id(),
    organizationId: organizationId(),
    vendorId: uuid()
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    number: text().notNull(),
    status: purchaseOrderStatus().notNull().default("draft"),
    totalCents: integer().notNull(),
    currency: currency(),
    issuedOn: date().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.organizationId, t.number)],
);
