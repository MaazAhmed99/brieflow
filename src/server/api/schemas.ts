import { z } from "zod";
import { isOverdue } from "@/lib/format";

// The public shape of each API resource. Every response goes through these
// schemas, so the API only ever returns the documented fields (zod drops
// anything else), however the internal queries change.

const money = z.object({ amountCents: z.number().int(), currency: z.string().length(3) });

export const clientResource = z.object({
  id: z.uuid(),
  name: z.string(),
  industry: z.string().nullable(),
  country: z.string(),
  city: z.string().nullable(),
  status: z.enum(["active", "paused", "archived"]),
  activeProjects: z.number().int(),
  outstanding: money,
});

export const projectResource = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: z.enum(["planned", "active", "on_hold", "completed"]),
  health: z.enum(["on_track", "at_risk", "off_track"]).nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  budget: money,
  client: z.object({ id: z.uuid(), name: z.string() }),
});

export const projectDetailResource = projectResource.extend({
  description: z.string().nullable(),
  manager: z.string().nullable(),
  milestones: z.array(
    z.object({ title: z.string(), status: z.enum(["upcoming", "in_progress", "done"]), dueDate: z.string().nullable() }),
  ),
  tasks: z.object({ total: z.number().int(), done: z.number().int() }),
});

export const invoiceResource = z.object({
  id: z.uuid(),
  number: z.string(),
  status: z.enum(["draft", "open", "overdue", "paid", "void"]),
  issueDate: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  total: money,
  client: z.object({ id: z.uuid(), name: z.string() }),
  project: z.object({ id: z.uuid(), name: z.string() }).nullable(),
});

export const invoiceDetailResource = invoiceResource.extend({
  subtotal: money,
  tax: money,
  items: z.array(z.object({ description: z.string(), quantity: z.number().int(), unitPrice: money, amount: money })),
  payments: z.array(z.object({ amount: money, method: z.enum(["card", "demo", "bank_transfer"]), paidAt: z.string() })),
});

/** "sent" is stored; the API reports "open" or "overdue" instead. */
export function apiInvoiceStatus(invoice: { status: string; dueDate: string }) {
  if (isOverdue(invoice)) return "overdue" as const;
  return invoice.status === "sent" ? ("open" as const) : (invoice.status as "draft" | "paid" | "void");
}

export const toIso = (value: Date | string | null) => (value === null ? null : new Date(value).toISOString());
