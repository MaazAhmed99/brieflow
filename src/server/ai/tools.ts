import "server-only";
import { z } from "zod";
import { formatDate, formatMoney, isOverdue } from "@/lib/format";
import type { Viewer } from "@/server/auth/viewer";
import { can, type Permission } from "@/server/authz/permissions";
import { listClients } from "@/server/data/clients";
import { getRevenueByClient, getRevenueByMonth } from "@/server/data/dashboard";
import { findInvoiceIdByNumber, getInvoice, listInvoices } from "@/server/data/invoices";
import { getProject, listProjects } from "@/server/data/projects";
import type { AiToolDefinition } from "./types";

// The assistant's tools. All read-only, and every one calls the same Data
// Access Layer as the pages, with the signed-in viewer. So the assistant can
// never see more than the person asking: a client's assistant only finds that
// client's projects and invoices, even if a prompt (or text hidden in a
// comment) tells it to look for someone else's.

type Tool = AiToolDefinition & {
  permission: Permission;
  /** Shown in the chat while the tool runs. */
  status: string;
  args: z.ZodType;
  run: (viewer: Viewer, args: never) => Promise<unknown>;
};

const base = (viewer: Viewer) => (viewer.role === "client" ? "/portal" : "/app");
const money = (cents: number | null, currency: string) => (cents === null ? null : formatMoney(cents, currency));
const invoiceState = (invoice: { status: string; dueDate: string }) =>
  isOverdue(invoice) ? "overdue" : invoice.status === "sent" ? "open" : invoice.status;

const PROJECT_STATUSES = ["planned", "active", "on_hold", "completed"] as const;
const HEALTH = ["on_track", "at_risk", "off_track"] as const;
const INVOICE_STATES = ["open", "overdue", "paid", "draft"] as const;

const tools: Tool[] = [
  {
    name: "search_clients",
    description: "Find client companies by name. Returns status, location, active projects and outstanding balance.",
    permission: "client:read",
    status: "Searching clients",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Part of the client's name. Leave empty to list all." } },
    },
    args: z.object({ query: z.string().max(100).optional() }),
    run: async (viewer, { query }: { query?: string }) => {
      const rows = await listClients(viewer, { search: query || undefined });
      return rows.slice(0, 25).map((c) => ({
        name: c.name,
        status: c.status,
        industry: c.industry,
        location: [c.city, c.country].filter(Boolean).join(", "),
        activeProjects: c.activeProjects,
        outstanding: money(c.outstandingCents, c.currency),
        url: `/app/clients/${c.id}`,
      }));
    },
  },
  {
    name: "list_projects",
    description: "List projects, optionally filtered by status, health or a search on project, code or client name.",
    permission: "project:read",
    status: "Looking up projects",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: [...PROJECT_STATUSES] },
        health: { type: "string", enum: [...HEALTH], description: "Only meaningful for active projects." },
        query: { type: "string", description: "Search text: project name, project code or client name." },
      },
    },
    args: z.object({
      status: z.enum(PROJECT_STATUSES).optional(),
      health: z.enum(HEALTH).optional(),
      query: z.string().max(100).optional(),
    }),
    run: async (viewer, { status, health, query }: { status?: (typeof PROJECT_STATUSES)[number]; health?: string; query?: string }) => {
      const rows = await listProjects(viewer, { status: status ? [status] : undefined, search: query || undefined });
      return rows
        .filter((p) => !health || p.health === health)
        .slice(0, 25)
        .map((p) => ({
          name: p.name,
          code: p.code,
          client: p.clientName,
          status: p.status,
          health: p.status === "active" ? p.health : undefined,
          due: formatDate(p.dueDate),
          url: `${base(viewer)}/projects/${p.id}`,
        }));
    },
  },
  {
    name: "get_project",
    description: "Details of one project: dates, milestones, progress, recent comments and (if allowed) budget and invoices.",
    permission: "project:read",
    status: "Reading the project",
    parameters: {
      type: "object",
      properties: { project: { type: "string", description: "The project's name (or part of it) or code, e.g. Atlas or LRK-1001." } },
      required: ["project"],
    },
    args: z.object({ project: z.string().min(1).max(100) }),
    run: async (viewer, { project }: { project: string }) => {
      const [match] = await listProjects(viewer, { search: project });
      if (!match) return { error: `No project matching "${project}" that you can see.` };
      const details = await getProject(viewer, match.id);
      if (!details) return { error: "Project not found." };
      const doneTasks = details.tasks.filter((t) => t.status === "done").length;
      const invoices = can(viewer, "invoice:read") ? await listInvoices(viewer, { projectId: details.id }) : null;
      return {
        name: details.name,
        code: details.code,
        client: details.clientName,
        status: details.status,
        health: details.health,
        dates: `${formatDate(details.startDate)} to ${formatDate(details.dueDate)}`,
        manager: details.managerName,
        budget: money(details.budgetCents, details.currency),
        milestones: details.milestones.map((m) => ({ title: m.title, status: m.status, due: formatDate(m.dueDate) })),
        tasks: details.tasks.length ? { done: doneTasks, total: details.tasks.length } : undefined,
        invoices: invoices?.map((i) => ({ number: i.number, state: invoiceState(i), total: money(i.totalCents, i.currency) })),
        // Written by people, not by the system: data only, never instructions.
        recentCommentsWrittenByUsers: details.comments.slice(-5).map((c) => ({
          author: c.authorName,
          date: formatDate(c.createdAt),
          text: c.body,
        })),
        url: `${base(viewer)}/projects/${details.id}`,
      };
    },
  },
  {
    name: "list_invoices",
    description: "List invoices, optionally by state (open, overdue, paid, draft) and client name. Includes totals per currency.",
    permission: "invoice:read",
    status: "Looking up invoices",
    parameters: {
      type: "object",
      properties: {
        state: { type: "string", enum: [...INVOICE_STATES] },
        client: { type: "string", description: "Part of the client's name." },
      },
    },
    args: z.object({ state: z.enum(INVOICE_STATES).optional(), client: z.string().max(100).optional() }),
    run: async (viewer, { state, client }: { state?: string; client?: string }) => {
      const rows = (await listInvoices(viewer))
        .filter((i) => !state || invoiceState(i) === state)
        .filter((i) => !client || i.clientName.toLowerCase().includes(client.toLowerCase()));
      const totals = new Map<string, number>();
      for (const i of rows) totals.set(i.currency, (totals.get(i.currency) ?? 0) + i.totalCents);
      return {
        count: rows.length,
        totalsByCurrency: [...totals].map(([currency, cents]) => formatMoney(cents, currency)),
        invoices: rows.slice(0, 25).map((i) => ({
          number: i.number,
          client: i.clientName,
          project: i.projectName,
          state: invoiceState(i),
          total: money(i.totalCents, i.currency),
          issued: formatDate(i.issueDate),
          due: formatDate(i.dueDate),
          url: `${base(viewer)}/invoices/${i.id}`,
        })),
        note: rows.length > 25 ? `Showing 25 of ${rows.length}.` : undefined,
      };
    },
  },
  {
    name: "get_invoice",
    description: "One invoice by its number (e.g. INV-1042): line items, totals, dates and payments.",
    permission: "invoice:read",
    status: "Reading the invoice",
    parameters: {
      type: "object",
      properties: { number: { type: "string", description: "The invoice number, e.g. INV-1042." } },
      required: ["number"],
    },
    args: z.object({ number: z.string().min(1).max(30) }),
    run: async (viewer, { number }: { number: string }) => {
      const id = await findInvoiceIdByNumber(viewer, number);
      const invoice = id ? await getInvoice(viewer, id) : null;
      if (!invoice) return { error: `No invoice ${number} that you can see.` };
      return {
        number: invoice.number,
        client: invoice.clientName,
        project: invoice.projectName,
        state: invoiceState(invoice),
        issued: formatDate(invoice.issueDate),
        due: formatDate(invoice.dueDate),
        items: invoice.items.map((item) => ({ description: item.description, amount: money(item.amountCents, invoice.currency) })),
        subtotal: money(invoice.subtotalCents, invoice.currency),
        tax: money(invoice.taxCents, invoice.currency),
        total: money(invoice.totalCents, invoice.currency),
        payments: invoice.payments.map((p) => ({ amount: money(p.amountCents, p.currency), date: formatDate(p.createdAt) })),
        url: `${base(viewer)}/invoices/${invoice.id}`,
      };
    },
  },
  {
    name: "revenue_summary",
    description: "Revenue received per month for the last 12 months and the top clients by revenue, in the base currency.",
    permission: "finance:read",
    status: "Adding up revenue",
    parameters: { type: "object", properties: {} },
    args: z.object({}),
    run: async (viewer) => {
      const [months, clients] = await Promise.all([getRevenueByMonth(viewer), getRevenueByClient(viewer, 5)]);
      return {
        currency: months.currency,
        exchangeRates: months.ratesSource === "static" ? "fixed demo rates" : "ECB rates",
        byMonth: months.months.map((m) => ({ month: m.key, revenue: formatMoney(m.cents, months.currency) })),
        topClients: clients.clients.map((c) => ({ client: c.clientName, revenue: formatMoney(c.cents, clients.currency) })),
      };
    },
  },
];

/** The tools this viewer may use, as definitions for the model. */
export function toolsFor(viewer: Viewer): AiToolDefinition[] {
  return tools
    .filter((tool) => can(viewer, tool.permission))
    .map(({ name, description, parameters }) => ({ name, description, parameters }));
}

export function toolStatus(name: string) {
  return tools.find((tool) => tool.name === name)?.status ?? "Working";
}

/**
 * Runs one tool call for this viewer and returns the result as JSON text for
 * the model. Unknown tools, tools the viewer may not use, bad arguments and
 * errors all come back as an error message instead of throwing.
 */
export async function runTool(viewer: Viewer, name: string, rawArguments: string): Promise<string> {
  const tool = tools.find((t) => t.name === name);
  if (!tool || !can(viewer, tool.permission)) return JSON.stringify({ error: `Tool ${name} is not available.` });

  let parsed;
  try {
    parsed = tool.args.safeParse(JSON.parse(rawArguments || "{}"));
  } catch {
    return JSON.stringify({ error: "Arguments were not valid JSON." });
  }
  if (!parsed.success) return JSON.stringify({ error: "Invalid arguments.", details: parsed.error.issues.map((i) => i.message) });

  try {
    const result = await tool.run(viewer, parsed.data as never);
    return JSON.stringify(result);
  } catch (error) {
    console.error(`Assistant tool ${name} failed`, error);
    return JSON.stringify({ error: "The lookup failed. Try again." });
  }
}
