import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import type {
  PgDatabase,
  PgInsertValue,
  PgQueryResultHKT,
  PgTable,
} from "drizzle-orm/pg-core";
import { demoAccounts } from "@/config/demo";
import * as s from "../schema";
import {
  AGENCY_UPDATES,
  CLIENT_COMMENTS,
  CLIENT_NOTES,
  CODENAMES,
  CONTACT_TITLES,
  COUNTRIES,
  type Country,
  FERNVALE_STAFF,
  HOURLY_RATE_CENTS,
  INDUSTRIES,
  INTERNAL_COMMENTS,
  INVOICE_LINE_KINDS,
  LARKSPUR_STAFF,
  LEAD_SOURCES,
  PHASES,
  PROJECT_TYPES,
  PROMPT_INJECTION_COMMENT,
  type Role,
  SEED_FILES,
  STAFF_LOCATIONS,
  type StaffPlanEntry,
  TASKS_BY_PHASE,
  TICKET_SUBJECTS,
  TIME_NOTES,
  VENDOR_CATEGORIES,
} from "./data";

// Builds the demo data: one full agency (Larkspur Digital) and a small second
// agency (Fernvale Labs) used to prove tenant isolation. A fixed faker seed
// makes every run produce the same names and amounts; dates are relative to
// the day the seed runs, so "overdue" and "this month" always make sense.

export type SeedDb = PgDatabase<PgQueryResultHKT, typeof s>;

type Insert<T extends PgTable> = T["$inferInsert"];
type ProjectStatus = (typeof s.projectStatus.enumValues)[number];
type InvoiceRow = Insert<typeof s.invoices> & { id: string };

const DAY = 86_400_000;

// ─── Small helpers ───────────────────────────────────────────────────────────

const uuid = () => faker.string.uuid();
const int = (min: number, max: number) => faker.number.int({ min, max });
const pick = <T>(items: readonly T[]) => faker.helpers.arrayElement(items);
const pickSome = <T>(items: readonly T[], min: number, max: number) =>
  faker.helpers.arrayElements(items, {
    min: Math.min(min, items.length),
    max: Math.min(max, items.length),
  });
const chance = (probability: number) => faker.datatype.boolean({ probability });
const weighted = <T>(options: readonly (readonly [T, number])[]) =>
  faker.helpers.weightedArrayElement(
    options.map(([value, weight]) => ({ value, weight })),
  );

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const between = (from: Date, to: Date) =>
  from.getTime() >= to.getTime() ? from : faker.date.between({ from, to });
const minDate = (a: Date, b: Date) => (a.getTime() < b.getTime() ? a : b);

const domainOf = (company: string) =>
  company.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "").slice(0, 24);

const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

// ─── Row store ───────────────────────────────────────────────────────────────

function emptyRows() {
  return {
    organizations: [] as Insert<typeof s.organizations>[],
    users: [] as Insert<typeof s.users>[],
    accounts: [] as Insert<typeof s.accounts>[],
    departments: [] as Insert<typeof s.departments>[],
    clients: [] as Insert<typeof s.clients>[],
    memberships: [] as Insert<typeof s.memberships>[],
    contacts: [] as Insert<typeof s.contacts>[],
    clientNotes: [] as Insert<typeof s.clientNotes>[],
    projects: [] as Insert<typeof s.projects>[],
    projectMembers: [] as Insert<typeof s.projectMembers>[],
    milestones: [] as Insert<typeof s.milestones>[],
    tasks: [] as Insert<typeof s.tasks>[],
    comments: [] as Insert<typeof s.comments>[],
    files: [] as Insert<typeof s.files>[],
    invoices: [] as InvoiceRow[],
    invoiceItems: [] as Insert<typeof s.invoiceItems>[],
    payments: [] as Insert<typeof s.payments>[],
    exchangeRates: [] as Insert<typeof s.exchangeRates>[],
    vendors: [] as Insert<typeof s.vendors>[],
    expenses: [] as Insert<typeof s.expenses>[],
    purchaseOrders: [] as Insert<typeof s.purchaseOrders>[],
    leads: [] as Insert<typeof s.leads>[],
    timeEntries: [] as Insert<typeof s.timeEntries>[],
    leaveRequests: [] as Insert<typeof s.leaveRequests>[],
    tickets: [] as Insert<typeof s.tickets>[],
    activityLog: [] as Insert<typeof s.activityLog>[],
    notifications: [] as Insert<typeof s.notifications>[],
  };
}

type Rows = ReturnType<typeof emptyRows>;

// Parents before children, so foreign keys are satisfied.
const INSERT_ORDER: [keyof Rows, PgTable][] = [
  ["organizations", s.organizations],
  ["users", s.users],
  ["accounts", s.accounts],
  ["departments", s.departments],
  ["clients", s.clients],
  ["memberships", s.memberships],
  ["contacts", s.contacts],
  ["clientNotes", s.clientNotes],
  ["projects", s.projects],
  ["projectMembers", s.projectMembers],
  ["milestones", s.milestones],
  ["tasks", s.tasks],
  ["comments", s.comments],
  ["files", s.files],
  ["invoices", s.invoices],
  ["invoiceItems", s.invoiceItems],
  ["payments", s.payments],
  ["exchangeRates", s.exchangeRates],
  ["vendors", s.vendors],
  ["expenses", s.expenses],
  ["purchaseOrders", s.purchaseOrders],
  ["leads", s.leads],
  ["timeEntries", s.timeEntries],
  ["leaveRequests", s.leaveRequests],
  ["tickets", s.tickets],
  ["activityLog", s.activityLog],
  ["notifications", s.notifications],
];

type Ctx = {
  rows: Rows;
  today: Date;
  now: Date;
  passwordHash: string;
  usedEmails: Set<string>;
};

type Person = { id: string; name: string; role: Role; jobTitle: string };

type ClientInfo = {
  id: string;
  name: string;
  domain: string;
  country: Country;
  status: "active" | "paused" | "archived";
  portalUserId?: string;
};

type ProjectInfo = {
  id: string;
  name: string;
  client: ClientInfo;
  status: ProjectStatus;
  start: Date;
  due: Date;
  budgetCents: number;
  managerId: string;
  memberIds: string[];
  taskIds: string[];
};

type AgencyConfig = {
  name: string;
  slug: string;
  baseCurrency: string;
  emailDomain: string;
  projectCodePrefix: string;
  invoiceNumberStart: number;
  staff: StaffPlanEntry[];
  clientCount: number;
  projectsPerClient: [number, number];
  portalClientCount: number;
  featuredClient?: {
    name: string;
    industry: string;
    countryName: Country["name"];
    city: string;
    portalEmail: string;
    projectName: string;
  };
  onlyActiveProjects?: boolean;
};

type Agency = {
  id: string;
  staff: Person[];
  managers: Person[];
  clients: ClientInfo[];
  projects: ProjectInfo[];
};

// ─── People ──────────────────────────────────────────────────────────────────

function uniqueEmail(ctx: Ctx, first: string, last: string, domain: string) {
  const local = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  let email = `${local}@${domain}`;
  for (let n = 2; ctx.usedEmails.has(email); n++) email = `${local}${n}@${domain}`;
  ctx.usedEmails.add(email);
  return email;
}

function addUser(ctx: Ctx, name: string, email: string, createdAt: Date) {
  const id = uuid();
  ctx.usedEmails.add(email);
  ctx.rows.users.push({ id, name, email, emailVerified: true, createdAt, updatedAt: createdAt });
  // Better Auth stores email/password logins as a "credential" account.
  ctx.rows.accounts.push({
    id: uuid(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: ctx.passwordHash,
    createdAt,
    updatedAt: createdAt,
  });
  return id;
}

// ─── One agency: staff, clients, projects, work and invoices ─────────────────

function buildAgency(ctx: Ctx, config: AgencyConfig): Agency {
  const { rows, today, now } = ctx;
  const organizationId = uuid();
  rows.organizations.push({
    id: organizationId,
    name: config.name,
    slug: config.slug,
    baseCurrency: config.baseCurrency,
    createdAt: addDays(today, -6 * 365),
  });

  // Departments and staff
  const departmentIds = new Map<string, string>();
  for (const department of new Set(config.staff.map((entry) => entry.department))) {
    const id = uuid();
    departmentIds.set(department, id);
    rows.departments.push({ id, organizationId, name: department });
  }

  const staff: Person[] = [];
  for (const entry of config.staff) {
    for (let i = 0; i < entry.count; i++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const name = `${first} ${last}`;
      const email =
        i === 0 && entry.demoEmail
          ? entry.demoEmail
          : uniqueEmail(ctx, first, last, config.emailDomain);
      const startedOn = between(addDays(today, -6 * 365), addDays(today, -60));
      const userId = addUser(ctx, name, email, startedOn);
      rows.memberships.push({
        organizationId,
        userId,
        role: entry.role,
        departmentId: departmentIds.get(entry.department),
        jobTitle: entry.jobTitle,
        startedOn: isoDate(startedOn),
        location: pick(STAFF_LOCATIONS),
        createdAt: startedOn,
      });
      staff.push({ id: userId, name, role: entry.role, jobTitle: entry.jobTitle });
    }
  }
  const managers = staff.filter((p) => p.role === "manager");
  const doers = staff.filter((p) => p.role === "staff");
  const financePeople = staff.filter((p) => p.role === "accountant");

  // Clients, contacts, portal users and notes
  // About 7% archived and 10% paused; the first (featured) client stays active.
  const statuses: ClientInfo["status"][] = Array(config.clientCount).fill("active");
  const tail = faker.helpers.shuffle(Array.from({ length: config.clientCount - 1 }, (_, i) => i + 1));
  tail.slice(0, Math.round(config.clientCount * 0.07)).forEach((i) => (statuses[i] = "archived"));
  tail
    .slice(Math.round(config.clientCount * 0.07), Math.round(config.clientCount * 0.17))
    .forEach((i) => (statuses[i] = "paused"));

  const clients: ClientInfo[] = [];
  let portalClientsLeft = config.portalClientCount;
  for (let i = 0; i < config.clientCount; i++) {
    const featured = i === 0 ? config.featuredClient : undefined;
    const country = featured
      ? COUNTRIES.find((c) => c.name === featured.countryName)!
      : weighted(COUNTRIES.map((c) => [c, c.weight] as [Country, number]));
    const name = featured?.name ?? faker.company.name();
    const client: ClientInfo = {
      id: uuid(),
      name,
      domain: `${domainOf(name)}.example.com`,
      country,
      status: statuses[i],
    };
    const createdAt = between(addDays(today, -540), addDays(today, -120));
    rows.clients.push({
      id: client.id,
      organizationId,
      name,
      industry: featured?.industry ?? pick(INDUSTRIES),
      website: `https://${client.domain}`,
      country: country.name,
      city: featured?.city ?? pick(country.cities),
      currency: country.currency,
      status: client.status,
      ownerId: pick(managers).id,
      createdAt,
    });

    const contactCount = int(2, 4);
    for (let c = 0; c < contactCount; c++) {
      const first = faker.person.firstName();
      const last = faker.person.lastName();
      const isPrimary = c === 0;
      const wantsPortal =
        isPrimary && (featured !== undefined || (client.status === "active" && portalClientsLeft > 0));
      const email =
        wantsPortal && featured ? featured.portalEmail : uniqueEmail(ctx, first, last, client.domain);
      let userId: string | undefined;
      if (wantsPortal) {
        if (!featured) portalClientsLeft--;
        userId = addUser(ctx, `${first} ${last}`, email, createdAt);
        rows.memberships.push({
          organizationId,
          userId,
          role: "client",
          clientId: client.id,
          jobTitle: pick(CONTACT_TITLES),
          createdAt,
        });
        client.portalUserId = userId;
      }
      rows.contacts.push({
        organizationId,
        clientId: client.id,
        name: `${first} ${last}`,
        email,
        jobTitle: pick(CONTACT_TITLES),
        isPrimary,
        userId,
        createdAt,
      });
    }

    for (let n = int(1, 3); n > 0; n--) {
      rows.clientNotes.push({
        organizationId,
        clientId: client.id,
        authorId: pick(managers).id,
        body: pick(CLIENT_NOTES),
        createdAt: between(createdAt, now),
      });
    }
    clients.push(client);
  }

  // Projects
  const projects: ProjectInfo[] = [];
  const codenames = faker.helpers.shuffle([...CODENAMES]);
  let projectNumber = 0;
  for (const client of clients) {
    const count =
      client.status === "active"
        ? int(config.projectsPerClient[0], config.projectsPerClient[1])
        : int(1, 2);
    for (let j = 0; j < count; j++) {
      const featured = config.featuredClient && client === clients[0] && j === 0;
      const status: ProjectStatus = featured || config.onlyActiveProjects
        ? "active"
        : client.status === "archived"
          ? "completed"
          : client.status === "paused"
            ? pick(["on_hold", "completed"] as const)
            : weighted<ProjectStatus>([
                ["completed", 30],
                ["active", 50],
                ["planned", 10],
                ["on_hold", 10],
              ]);

      let start: Date;
      let due: Date;
      if (status === "completed") {
        start = addDays(today, -int(150, 360));
        due = minDate(addDays(start, int(45, 150)), addDays(today, -7));
      } else if (status === "active") {
        start = addDays(today, -int(30, 150));
        due = addDays(today, int(14, 120));
      } else if (status === "planned") {
        start = addDays(today, int(7, 45));
        due = addDays(start, int(60, 150));
      } else {
        start = addDays(today, -int(60, 200));
        due = addDays(today, int(-10, 60));
      }

      const type = pick(PROJECT_TYPES);
      const name = featured
        ? config.featuredClient!.projectName
        : status === "active" && codenames.length > 0
          ? `${codenames.pop()}: ${type}`
          : type;
      const managerId = pick(managers).id;
      const memberIds = [
        managerId,
        ...pickSome(doers, 3, 6).map((p) => p.id),
      ];
      const project: ProjectInfo = {
        id: uuid(),
        name,
        client,
        status,
        start,
        due,
        budgetCents: int(16, 300) * 500_00,
        managerId,
        memberIds,
        taskIds: [],
      };
      projectNumber++;
      rows.projects.push({
        id: project.id,
        organizationId,
        clientId: client.id,
        code: `${config.projectCodePrefix}-${1000 + projectNumber}`,
        name,
        description: `${type} for ${client.name}.`,
        status,
        health:
          status === "active"
            ? weighted([
                ["on_track", 65],
                ["at_risk", 25],
                ["off_track", 10],
              ] as const)
            : status === "on_hold"
              ? "at_risk"
              : "on_track",
        budgetCents: project.budgetCents,
        currency: client.country.currency,
        startDate: isoDate(start),
        dueDate: isoDate(due),
        managerId,
        createdAt: minDate(addDays(start, -int(5, 20)), now),
      });
      for (const userId of memberIds) {
        rows.projectMembers.push({ organizationId, projectId: project.id, userId });
      }
      projects.push(project);

      addProjectWork(ctx, organizationId, project, featured === true);
    }
  }

  addInvoices(ctx, organizationId, config, clients, projects);
  addAgencyActivity(ctx, organizationId, projects, financePeople, managers);

  return { id: organizationId, staff, managers, clients, projects };
}

// Milestones, tasks, comments and files for one project.
function addProjectWork(ctx: Ctx, organizationId: string, project: ProjectInfo, featured: boolean) {
  const { rows, today, now } = ctx;
  const phaseCount = int(3, 5);
  const phases =
    phaseCount === 5
      ? [...PHASES]
      : phaseCount === 4
        ? PHASES.filter((p) => p !== "Handover")
        : PHASES.filter((p) => p === "Discovery" || p === "Build" || p === "QA & launch");
  const span = project.due.getTime() - project.start.getTime();

  let currentFound = false;
  phases.forEach((phase, index) => {
    const milestoneDue = new Date(project.start.getTime() + (span * (index + 1)) / phases.length);
    let status: "upcoming" | "in_progress" | "done";
    if (project.status === "planned") status = "upcoming";
    else if (project.status === "completed") status = "done";
    else if (milestoneDue < today) status = "done";
    else if (!currentFound && project.status === "active") {
      status = "in_progress";
      currentFound = true;
    } else status = "upcoming";

    const milestoneId = uuid();
    rows.milestones.push({
      id: milestoneId,
      organizationId,
      projectId: project.id,
      title: phase,
      dueDate: isoDate(milestoneDue),
      status,
      position: index,
    });

    pickSome(TASKS_BY_PHASE[phase], 2, 4).forEach((title, position) => {
      const taskId = uuid();
      project.taskIds.push(taskId);
      rows.tasks.push({
        id: taskId,
        organizationId,
        projectId: project.id,
        milestoneId,
        title,
        status:
          status === "done"
            ? "done"
            : status === "in_progress"
              ? weighted([
                  ["done", 35],
                  ["review", 20],
                  ["in_progress", 25],
                  ["todo", 20],
                ] as const)
              : "todo",
        priority: weighted([
          ["low", 20],
          ["medium", 50],
          ["high", 22],
          ["urgent", 8],
        ] as const),
        assigneeId: pick(project.memberIds),
        dueDate: isoDate(addDays(milestoneDue, -int(0, 6))),
        estimateHours: int(1, 12) * 2,
        position,
      });
    });
  });

  if (project.status === "planned") return;

  const workEnd = minDate(project.due, now);
  for (let n = int(2, 6); n > 0; n--) {
    const visibility = chance(0.4) ? "client" : "internal";
    const byClient = visibility === "client" && project.client.portalUserId && chance(0.5);
    rows.comments.push({
      id: uuid(),
      organizationId,
      projectId: project.id,
      authorId: byClient ? project.client.portalUserId : pick(project.memberIds),
      body: pick(
        byClient ? CLIENT_COMMENTS : visibility === "client" ? AGENCY_UPDATES : INTERNAL_COMMENTS,
      ),
      visibility,
      createdAt: between(project.start, workEnd),
    });
  }
  if (featured && project.client.portalUserId) {
    rows.comments.push({
      id: uuid(),
      organizationId,
      projectId: project.id,
      authorId: project.client.portalUserId,
      body: PROMPT_INJECTION_COMMENT,
      visibility: "client",
      createdAt: addDays(now, -2),
    });
  }

  for (const file of pickSome(SEED_FILES, 1, 3)) {
    rows.files.push({
      id: uuid(),
      organizationId,
      projectId: project.id,
      uploadedBy: pick([project.managerId, project.client.portalUserId ?? project.managerId]),
      name: file.name,
      blobPathname: file.path,
      blobUrl: file.path,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
      isSeed: true,
      createdAt: between(project.start, workEnd),
    });
  }
}

// A 30% deposit when a project starts, then roughly monthly invoices for work done.
function addInvoices(
  ctx: Ctx,
  organizationId: string,
  config: AgencyConfig,
  clients: ClientInfo[],
  projects: ProjectInfo[],
) {
  const { rows, today, now } = ctx;
  const agencyInvoices: InvoiceRow[] = [];
  const itemsByInvoice = new Map<string, Insert<typeof s.invoiceItems>[]>();

  const addInvoice = (
    project: ProjectInfo,
    issue: Date,
    lines: { description: string; quantity: number; unitPriceCents: number }[],
  ) => {
    const terms = pick([14, 30]);
    const due = addDays(issue, terms);
    const subtotalCents = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
    const taxCents = Math.round((subtotalCents * project.client.country.taxRate) / 100);

    let status: "draft" | "sent" | "paid" | "void";
    let paidAt: Date | null = null;
    if (issue > addDays(today, -3) && chance(0.4)) status = "draft";
    else if (due >= today) status = "sent";
    // Recently due invoices are often still open; old ones almost always got paid.
    else if (chance(due < addDays(today, -60) ? 0.99 : 0.85)) {
      status = "paid";
      paidAt = minDate(addDays(issue, int(2, terms + 12)), addDays(now, -0.05));
    } else status = "sent";
    if (status !== "draft" && chance(0.02)) {
      status = "void";
      paidAt = null;
    }

    const id = uuid();
    agencyInvoices.push({
      id,
      organizationId,
      clientId: project.client.id,
      projectId: project.id,
      number: "", // assigned below, in date order
      status,
      currency: project.client.country.currency,
      issueDate: isoDate(issue),
      dueDate: isoDate(due),
      subtotalCents,
      taxCents,
      totalCents: subtotalCents + taxCents,
      paidAt,
      createdAt: issue,
    });
    itemsByInvoice.set(
      id,
      lines.map((line, position) => ({
        organizationId,
        invoiceId: id,
        description: line.description,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        amountCents: line.quantity * line.unitPriceCents,
        position,
      })),
    );
  };

  for (const project of projects) {
    if (project.status === "planned") continue;
    const budget = project.budgetCents;
    const [rateMin, rateMax] = HOURLY_RATE_CENTS[project.client.country.currency];
    const rate = Math.round(int(rateMin, rateMax) / 500) * 500;

    addInvoice(project, project.start, [
      {
        description: `Project deposit (30%): ${project.name}`,
        quantity: 1,
        unitPriceCents: Math.round((budget * 0.3) / 10_000) * 10_000,
      },
    ]);

    const billUntil = minDate(project.due, today);
    for (let issue = addDays(project.start, 30); issue <= billUntil; issue = addDays(issue, 30)) {
      if (!chance(0.9)) continue;
      addInvoice(
        project,
        issue,
        pickSome(INVOICE_LINE_KINDS, 1, 3).map((kind) => {
          const hours = int(4, 30) * 2;
          return { description: `${kind}: ${hours} h`, quantity: hours, unitPriceCents: rate };
        }),
      );
    }
  }

  // The demo client should always have one overdue and one open invoice to pay.
  if (config.featuredClient) {
    const featuredClientId = clients[0].id;
    const featuredProject = projects.find((p) => p.client.id === featuredClientId);
    const hasOpen = agencyInvoices.some(
      (inv) => inv.clientId === featuredClientId && inv.dueDate >= isoDate(today),
    );
    if (featuredProject && !hasOpen) {
      addInvoice(featuredProject, addDays(today, -5), [
        { description: "Development: 24 h", quantity: 24, unitPriceCents: 14_000 },
      ]);
      const added = agencyInvoices[agencyInvoices.length - 1];
      added.status = "sent";
      added.paidAt = null;
    }
    const theirs = agencyInvoices
      .filter((inv) => inv.clientId === featuredClientId && inv.status !== "void")
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    const overdue = theirs.find((inv) => inv.dueDate < isoDate(today));
    if (overdue) {
      overdue.status = "sent";
      overdue.paidAt = null;
    }
    const open = theirs.find((inv) => inv.dueDate >= isoDate(today));
    if (open) open.status = "sent";
  }

  agencyInvoices.sort((a, b) => a.issueDate.localeCompare(b.issueDate));
  agencyInvoices.forEach((invoice, index) => {
    invoice.number = `INV-${config.invoiceNumberStart + index}`;
    rows.invoices.push(invoice);
    rows.invoiceItems.push(...itemsByInvoice.get(invoice.id)!);
    if (invoice.status === "paid" && invoice.paidAt) {
      rows.payments.push({
        organizationId,
        invoiceId: invoice.id,
        provider: "manual",
        providerRef: `seed_${invoice.id}`,
        amountCents: invoice.totalCents,
        currency: invoice.currency,
        status: "succeeded",
        createdAt: invoice.paidAt,
      });
    }
  });
}

// The audit log, rebuilt from the generated records so it tells a consistent story.
function addAgencyActivity(
  ctx: Ctx,
  organizationId: string,
  projects: ProjectInfo[],
  financePeople: Person[],
  managers: Person[],
) {
  const { rows, now } = ctx;
  const entries: Insert<typeof s.activityLog>[] = [];
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const clientName = new Map(rows.clients.map((c) => [c.id, c.name]));
  const userName = new Map(rows.users.map((u) => [u.id, u.name]));
  const invoicers = financePeople.length > 0 ? financePeople : managers;

  for (const project of rows.projects.filter((p) => p.organizationId === organizationId)) {
    entries.push({
      organizationId,
      actorId: project.managerId,
      action: "project.created",
      entityType: "project",
      entityId: project.id!,
      summary: `Created project ${project.name} for ${clientName.get(project.clientId)}`,
      createdAt: project.createdAt as Date,
    });
  }

  for (const invoice of rows.invoices.filter((i) => i.organizationId === organizationId)) {
    if (invoice.status === "draft") continue;
    const amount = formatMoney(invoice.totalCents, invoice.currency);
    entries.push({
      organizationId,
      actorId: pick(invoicers).id,
      action: "invoice.sent",
      entityType: "invoice",
      entityId: invoice.id,
      summary: `Sent invoice ${invoice.number} to ${clientName.get(invoice.clientId)} (${amount})`,
      createdAt: new Date(`${invoice.issueDate}T09:30:00Z`),
    });
    if (invoice.paidAt) {
      entries.push({
        organizationId,
        actorId: pick(invoicers).id,
        action: "invoice.paid",
        entityType: "invoice",
        entityId: invoice.id,
        summary: `${clientName.get(invoice.clientId)} paid invoice ${invoice.number} (${amount})`,
        createdAt: invoice.paidAt as Date,
      });
    }
  }

  for (const task of rows.tasks.filter((t) => t.organizationId === organizationId)) {
    if (task.status !== "done" || !chance(0.25) || !task.dueDate) continue;
    entries.push({
      organizationId,
      actorId: task.assigneeId,
      action: "task.completed",
      entityType: "task",
      entityId: task.id!,
      summary: `Completed "${task.title}" on ${projectById.get(task.projectId)?.name}`,
      createdAt: new Date(`${task.dueDate}T15:00:00Z`),
    });
  }

  for (const comment of rows.comments.filter((c) => c.organizationId === organizationId)) {
    entries.push({
      organizationId,
      actorId: comment.authorId,
      action: "comment.created",
      entityType: "comment",
      entityId: comment.id!,
      summary: `${userName.get(comment.authorId ?? "") ?? "Someone"} commented on ${projectById.get(comment.projectId)?.name}`,
      metadata: { projectId: comment.projectId, visibility: comment.visibility },
      createdAt: comment.createdAt as Date,
    });
  }

  for (const file of rows.files.filter((f) => f.organizationId === organizationId)) {
    entries.push({
      organizationId,
      actorId: file.uploadedBy,
      action: "file.uploaded",
      entityType: "file",
      entityId: file.id!,
      summary: `Uploaded ${file.name} to ${projectById.get(file.projectId)?.name}`,
      metadata: { projectId: file.projectId },
      createdAt: file.createdAt as Date,
    });
  }

  rows.activityLog.push(
    ...entries.filter((e) => (e.createdAt as Date).getTime() <= now.getTime()),
  );
}

// ─── Larkspur-only data: Preview modules and notifications ───────────────────

function addPreviewModules(ctx: Ctx, agency: Agency) {
  const { rows, today, now } = ctx;
  const organizationId = agency.id;
  const doers = agency.staff.filter((p) => p.role === "staff");
  const everyone = agency.staff;

  // Vendors, expenses and purchase orders
  const vendors = Array.from({ length: 20 }, (_, i) => {
    const kind = VENDOR_CATEGORIES[i % VENDOR_CATEGORIES.length];
    const vendor = {
      id: uuid(),
      organizationId,
      name: faker.company.name(),
      category: kind.category,
      country: pick(COUNTRIES).name,
    };
    rows.vendors.push(vendor);
    return { ...vendor, kind };
  });

  const billableProjects = agency.projects.filter((p) => p.status !== "planned");
  for (let i = 0; i < 300; i++) {
    const vendor = pick(vendors);
    const spentOn = between(addDays(today, -365), today);
    const old = spentOn < addDays(today, -45);
    rows.expenses.push({
      organizationId,
      projectId: chance(0.5) ? pick(billableProjects).id : null,
      vendorId: vendor.id,
      category: vendor.category,
      description: pick(vendor.kind.descriptions),
      amountCents: int(vendor.kind.amount[0], vendor.kind.amount[1]),
      currency: "USD",
      spentOn: isoDate(spentOn),
      status: old
        ? weighted([
            ["reimbursed", 60],
            ["approved", 35],
            ["rejected", 5],
          ] as const)
        : weighted([
            ["submitted", 60],
            ["approved", 35],
            ["rejected", 5],
          ] as const),
      submittedBy: pick(everyone).id,
      createdAt: spentOn,
    });
  }

  const poDates = Array.from({ length: 40 }, () => between(addDays(today, -365), today)).sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  poDates.forEach((issuedOn, index) => {
    const ageDays = (today.getTime() - issuedOn.getTime()) / DAY;
    rows.purchaseOrders.push({
      organizationId,
      vendorId: pick(vendors).id,
      number: `PO-${2001 + index}`,
      status:
        ageDays > 60
          ? pick(["closed", "closed", "received"] as const)
          : ageDays > 14
            ? pick(["received", "issued"] as const)
            : pick(["draft", "issued"] as const),
      totalCents: int(40, 1600) * 500,
      currency: "USD",
      issuedOn: isoDate(issuedOn),
      createdAt: issuedOn,
    });
  });

  // Sales pipeline
  for (let i = 0; i < 120; i++) {
    const createdAt = between(addDays(today, -270), now);
    const stage = weighted([
      ["new", 20],
      ["qualified", 20],
      ["proposal", 15],
      ["negotiation", 10],
      ["won", 20],
      ["lost", 15],
    ] as const);
    const closed = stage === "won" || stage === "lost";
    rows.leads.push({
      organizationId,
      company: faker.company.name(),
      contactName: faker.person.fullName(),
      source: pick(LEAD_SOURCES),
      stage,
      valueCents: int(10, 240) * 500_00,
      currency: weighted(COUNTRIES.map((c) => [c, c.weight] as [Country, number])).currency,
      ownerId: pick(agency.managers).id,
      expectedClose: isoDate(
        closed ? minDate(addDays(createdAt, int(14, 60)), today) : addDays(today, int(7, 90)),
      ),
      createdAt,
    });
  }

  // Time tracking: the last 8 weeks on active projects
  for (const project of agency.projects.filter((p) => p.status === "active")) {
    for (const userId of project.memberIds) {
      for (let back = 56; back >= 0; back--) {
        const day = addDays(today, -back);
        const weekday = day.getUTCDay();
        if (weekday === 0 || weekday === 6 || day < project.start || !chance(0.37)) continue;
        rows.timeEntries.push({
          organizationId,
          userId,
          projectId: project.id,
          taskId: pick(project.taskIds),
          workedOn: isoDate(day),
          minutes: int(2, 12) * 30,
          billable: chance(0.85),
          note: pick(TIME_NOTES),
          createdAt: addDays(day, 0.75),
        });
      }
    }
  }

  // Leave requests
  for (let i = 0; i < 60; i++) {
    const type = weighted([
      ["annual", 60],
      ["sick", 25],
      ["unpaid", 5],
      ["parental", 10],
    ] as const);
    const length = { annual: int(1, 10), sick: int(1, 3), unpaid: int(1, 5), parental: int(20, 40) }[type];
    const start = addDays(today, int(-120, 60));
    rows.leaveRequests.push({
      organizationId,
      userId: pick(everyone).id,
      type,
      startDate: isoDate(start),
      endDate: isoDate(addDays(start, length - 1)),
      status:
        start < today
          ? weighted([
              ["approved", 90],
              ["rejected", 10],
            ] as const)
          : weighted([
              ["pending", 50],
              ["approved", 45],
              ["rejected", 5],
            ] as const),
      createdAt: minDate(addDays(start, -int(3, 30)), now),
    });
  }

  // Support tickets from active clients
  const activeClients = agency.clients.filter((c) => c.status === "active");
  const ticketDates = Array.from({ length: 90 }, () => between(addDays(today, -180), now)).sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  ticketDates.forEach((createdAt, index) => {
    const client = pick(activeClients);
    const subject = pick(TICKET_SUBJECTS);
    const ageDays = (now.getTime() - createdAt.getTime()) / DAY;
    rows.tickets.push({
      organizationId,
      clientId: client.id,
      number: index + 1,
      subject,
      body: `Hi team, ${subject.charAt(0).toLowerCase()}${subject.slice(1)}. Could you take a look when you have a moment? Thanks.`,
      status:
        ageDays > 30
          ? pick(["closed", "resolved"] as const)
          : ageDays > 7
            ? pick(["resolved", "pending", "open"] as const)
            : pick(["open", "pending"] as const),
      priority: weighted([
        ["low", 25],
        ["normal", 50],
        ["high", 20],
        ["urgent", 5],
      ] as const),
      assigneeId: pick(doers).id,
      createdBy: client.portalUserId ?? null,
      createdAt,
      updatedAt: minDate(addDays(createdAt, int(1, 72) / 24), now),
    });
  });
}

function addNotifications(ctx: Ctx, agency: Agency) {
  const { rows, now } = ctx;
  const emailToId = new Map(rows.users.map((u) => [u.email, u.id!]));
  const recipients = demoAccounts
    .filter((a) => a.role === "admin" || a.role === "manager")
    .map((a) => emailToId.get(a.email))
    .filter((id): id is string => id !== undefined);
  const since = addDays(now, -14);

  const recent = rows.activityLog.filter(
    (e) =>
      e.organizationId === agency.id &&
      (e.createdAt as Date) >= since &&
      (e.action === "invoice.paid" || e.action === "comment.created"),
  );
  for (const userId of recipients) {
    for (const entry of recent) {
      const createdAt = entry.createdAt as Date;
      const link =
        entry.entityType === "invoice"
          ? `/app/invoices/${entry.entityId}`
          : `/app/projects/${(entry.metadata as { projectId: string }).projectId}`;
      rows.notifications.push({
        organizationId: agency.id,
        userId,
        type: entry.action,
        title: entry.summary,
        link,
        readAt: createdAt > addDays(now, -3) ? null : addDays(createdAt, 0.1),
        createdAt,
      });
    }
  }
}

// ─── Entry points ────────────────────────────────────────────────────────────

/** Deletes all demo data. Every app table hangs off organizations or users. */
export async function resetDatabase(db: SeedDb) {
  await db.execute(
    sql`truncate table organizations, users, verifications, exchange_rates cascade`,
  );
}

/** Generates and inserts the demo data. Returns the number of rows per table. */
export async function seedDatabase(
  db: SeedDb,
  options: { passwordHash: string; now?: Date },
) {
  faker.seed(2026);
  const now = options.now ?? new Date();
  const ctx: Ctx = {
    rows: emptyRows(),
    today: startOfUtcDay(now),
    now,
    passwordHash: options.passwordHash,
    usedEmails: new Set(demoAccounts.map((a) => a.email)),
  };

  const clientDemo = demoAccounts.find((a) => a.role === "client")!;
  const larkspur = buildAgency(ctx, {
    name: "Larkspur Digital",
    slug: "larkspur",
    baseCurrency: "USD",
    emailDomain: "larkspur.example.com",
    projectCodePrefix: "LRK",
    invoiceNumberStart: 1001,
    staff: LARKSPUR_STAFF,
    clientCount: 30,
    projectsPerClient: [2, 3],
    portalClientCount: 5,
    featuredClient: {
      name: "Harbor & Finch",
      industry: "Retail & e-commerce",
      countryName: "United States",
      city: "Portland",
      portalEmail: clientDemo.email,
      projectName: "Atlas: Customer portal",
    },
  });
  addPreviewModules(ctx, larkspur);
  addNotifications(ctx, larkspur);

  buildAgency(ctx, {
    name: "Fernvale Labs",
    slug: "fernvale",
    baseCurrency: "GBP",
    emailDomain: "fernvale.example.com",
    projectCodePrefix: "FRN",
    invoiceNumberStart: 101,
    staff: FERNVALE_STAFF,
    clientCount: 2,
    projectsPerClient: [1, 1],
    portalClientCount: 2,
    onlyActiveProjects: true,
  });

  // Fixed demo rates until the daily Frankfurter refresh replaces them.
  const rateDate = isoDate(ctx.today);
  ctx.rows.exchangeRates.push(
    { rateDate, base: "USD", quote: "GBP", rate: 0.79, source: "static" },
    { rateDate, base: "USD", quote: "EUR", rate: 0.92, source: "static" },
  );

  for (const [key, table] of INSERT_ORDER) {
    const tableRows = ctx.rows[key] as unknown as PgInsertValue<PgTable>[];
    for (let i = 0; i < tableRows.length; i += 500) {
      await db.insert(table).values(tableRows.slice(i, i + 500));
    }
  }

  return Object.fromEntries(
    INSERT_ORDER.map(([key]) => [key, ctx.rows[key].length]),
  ) as Record<keyof Rows, number>;
}
