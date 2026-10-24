import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { demoAccounts } from "@/config/demo";
import type { Viewer } from "@/server/auth/viewer";
import { can, PERMISSIONS, type Role } from "@/server/authz/permissions";
import { ForbiddenError } from "@/server/authz/scope";
import { PROMPT_INJECTION_COMMENT } from "@/server/db/seed/data";
import * as s from "@/server/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";
import { otherClientUser, otherOrganizationAdmin, viewerFor } from "./helpers/viewers";

// The data functions import the app's database client; point it at the test database.
const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", () => ({
  get db() {
    return state.db;
  },
}));

const { listProjects, getProject } = await import("@/server/data/projects");
const { listInvoices, getInvoice } = await import("@/server/data/invoices");
const { listClients } = await import("@/server/data/clients");

let db: TestDb;
let close: () => Promise<void>;
const viewers = {} as Record<Role, Viewer> & { otherClient: Viewer; otherOrgAdmin: Viewer };

beforeAll(async () => {
  const test = await createTestDb({ now: new Date("2026-10-24T12:00:00Z") });
  db = test.db;
  state.db = db;
  close = () => test.client.close();
  for (const account of demoAccounts) {
    viewers[account.role] = await viewerFor(db, account.email);
  }
  viewers.otherClient = await otherClientUser(db, viewers.client);
  viewers.otherOrgAdmin = await otherOrganizationAdmin(db);
});

afterAll(async () => {
  await close();
});

describe("permission table", () => {
  it("gives admins every permission", () => {
    for (const permission of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) {
      if (permission === "invoice:pay") continue; // only clients pay invoices
      expect(can({ role: "admin" }, permission), permission).toBe(true);
    }
  });

  it("keeps clients out of agency-only areas", () => {
    for (const permission of ["client:read", "finance:read", "team:read", "activity:read", "settings:manage"] as const) {
      expect(can({ role: "client" }, permission), permission).toBe(false);
    }
  });

  it("keeps finance away from staff and project editing away from accountants", () => {
    expect(can({ role: "staff" }, "invoice:read")).toBe(false);
    expect(can({ role: "staff" }, "finance:read")).toBe(false);
    expect(can({ role: "accountant" }, "project:write")).toBe(false);
    expect(can({ role: "accountant" }, "invoice:write")).toBe(true);
  });
});

describe("a client user", () => {
  it("only sees their own company's projects, without budgets", async () => {
    const projects = await listProjects(viewers.client);
    expect(projects.length).toBeGreaterThan(0);
    for (const project of projects) {
      expect(project.clientId).toBe(viewers.client.clientId);
      expect(project.budgetCents).toBeNull();
    }
  });

  it("can't open another client's project or invoice, even by id", async () => {
    const [theirProject] = await listProjects(viewers.otherClient);
    const [theirInvoice] = await listInvoices(viewers.otherClient);
    expect(theirProject).toBeDefined();
    expect(theirInvoice).toBeDefined();
    expect(await getProject(viewers.client, theirProject.id)).toBeNull();
    expect(await getInvoice(viewers.client, theirInvoice.id)).toBeNull();
  });

  it("only sees their own invoices, and never drafts", async () => {
    const invoices = await listInvoices(viewers.client);
    expect(invoices.length).toBeGreaterThan(0);
    for (const invoice of invoices) {
      expect(invoice.clientId).toBe(viewers.client.clientId);
      expect(invoice.status === "sent" || invoice.status === "paid").toBe(true);
    }
  });

  it("sees only client-visible comments on their project", async () => {
    const [atlas] = await listProjects(viewers.client, { search: "Atlas" });
    const project = await getProject(viewers.client, atlas.id);
    expect(project).not.toBeNull();
    expect(project!.comments.every((c) => c.visibility === "client")).toBe(true);
    expect(project!.comments.some((c) => c.body === PROMPT_INJECTION_COMMENT)).toBe(true);
  });

  it("can't list the agency's clients", async () => {
    await expect(listClients(viewers.client)).rejects.toThrow(ForbiddenError);
  });
});

describe("organization isolation", () => {
  it("never shows one agency's data to another", async () => {
    const [fernvaleProject] = await listProjects(viewers.otherOrgAdmin);
    const [fernvaleInvoice] = await listInvoices(viewers.otherOrgAdmin);
    expect(await getProject(viewers.admin, fernvaleProject.id)).toBeNull();
    expect(await getInvoice(viewers.admin, fernvaleInvoice.id)).toBeNull();

    const larkspurClients = await listClients(viewers.admin);
    expect(larkspurClients.some((c) => c.name === "Harbor & Finch")).toBe(true);
    const fernvaleClients = await listClients(viewers.otherOrgAdmin);
    expect(fernvaleClients.map((c) => c.id)).not.toContain(viewers.client.clientId);
  });

  it("lists every Larkspur project for an admin, and none from Fernvale", async () => {
    const all = await db
      .select({ id: s.projects.id })
      .from(s.projects)
      .where(eq(s.projects.organizationId, viewers.admin.organizationId));
    const visible = await listProjects(viewers.admin);
    expect(visible).toHaveLength(all.length);
  });
});

describe("role limits", () => {
  it("blocks staff from invoices", async () => {
    await expect(listInvoices(viewers.staff)).rejects.toThrow(ForbiddenError);
  });

  it("shows internal comments and budgets to the agency team", async () => {
    const [atlas] = await listProjects(viewers.manager, { search: "Atlas" });
    expect(atlas.budgetCents).toBeGreaterThan(0);
    const project = await getProject(viewers.manager, atlas.id);
    expect(project!.comments.length).toBeGreaterThanOrEqual(1);
  });
});
