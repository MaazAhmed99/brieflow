import { and, desc, eq, ne } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "@/server/auth/viewer";
import * as s from "@/server/db/schema";
import { createTestDb, type TestDb } from "./helpers/test-db";
import { viewerFor } from "./helpers/viewers";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", () => ({
  get db() {
    return state.db;
  },
}));

const { addComment, detectFileType, getFileForDownload, safeFileName, addProjectFile } = await import(
  "@/server/data/project-updates"
);

let db: TestDb;
let close: () => Promise<void>;
let client: Viewer;
let manager: Viewer;

beforeAll(async () => {
  const test = await createTestDb({ now: new Date("2026-10-29T12:00:00Z") });
  db = test.db;
  state.db = db;
  close = () => test.client.close();
  client = await viewerFor(db, "client@harborandfinch.example.com");
  manager = await viewerFor(db, "manager@larkspur.example.com");
});

afterAll(async () => {
  await close();
});

async function project(owner: "own" | "other") {
  const [row] = await db
    .select({ id: s.projects.id })
    .from(s.projects)
    .where(
      and(
        eq(s.projects.organizationId, client.organizationId),
        owner === "own" ? eq(s.projects.clientId, client.clientId!) : ne(s.projects.clientId, client.clientId!),
      ),
    )
    .limit(1);
  return row.id;
}

const latestComment = async (projectId: string) =>
  (await db.select().from(s.comments).where(eq(s.comments.projectId, projectId)).orderBy(desc(s.comments.createdAt)).limit(1))[0];

describe("comments", () => {
  it("are always client-visible when a client writes them", async () => {
    const projectId = await project("own");
    expect(await addComment(client, { projectId, body: "Looks great!", visibleToClient: false })).toEqual({ ok: true });
    expect(await latestComment(projectId)).toMatchObject({ body: "Looks great!", visibility: "client", authorId: client.userId });
  });

  it("are internal for staff unless they choose otherwise", async () => {
    const projectId = await project("own");
    await addComment(manager, { projectId, body: "Internal note", visibleToClient: false });
    expect((await latestComment(projectId)).visibility).toBe("internal");
    await addComment(manager, { projectId, body: "Update for you", visibleToClient: true });
    expect((await latestComment(projectId)).visibility).toBe("client");
  });

  it("can't be posted on another client's project", async () => {
    const projectId = await project("other");
    expect(await addComment(client, { projectId, body: "Hello", visibleToClient: true })).toEqual({
      ok: false,
      error: "Project not found.",
    });
  });

  it("are written to the audit log", async () => {
    const projectId = await project("own");
    await addComment(client, { projectId, body: "Logged?", visibleToClient: true });
    const [comment] = await db.select().from(s.comments).where(eq(s.comments.body, "Logged?"));
    const [entry] = await db.select().from(s.activityLog).where(eq(s.activityLog.entityId, comment.id));
    expect(entry).toMatchObject({ action: "comment.created", actorId: client.userId });
  });

  it("reject empty or very long text", async () => {
    const projectId = await project("own");
    expect((await addComment(client, { projectId, body: "   ", visibleToClient: true })).ok).toBe(false);
    expect((await addComment(client, { projectId, body: "x".repeat(2001), visibleToClient: true })).ok).toBe(false);
  });
});

describe("uploads", () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

  it("detects the real type from the file's first bytes", () => {
    expect(detectFileType(new TextEncoder().encode("%PDF-1.4 ..."))).toBe("application/pdf");
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectFileType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    // An HTML or script file renamed to .png is still refused.
    expect(detectFileType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });

  it("cleans up file names", () => {
    expect(safeFileName("../../etc/passwd")).toBe("....etcpasswd");
    expect(safeFileName("Brief (final) v2.pdf")).toBe("Brief final v2.pdf");
    expect(safeFileName("<>")).toBe("file");
  });

  it("are refused when storage isn't configured", async () => {
    const projectId = await project("own");
    const file = new File([new TextEncoder().encode("%PDF-1.4")], "brief.pdf", { type: "application/pdf" });
    expect(await addProjectFile(client, { projectId, file })).toEqual({
      ok: false,
      error: "File uploads aren't configured on this deployment yet.",
    });
  });

  it("downloads only files from projects the viewer can see", async () => {
    const [theirFile] = await db
      .select({ id: s.files.id })
      .from(s.files)
      .innerJoin(s.projects, eq(s.projects.id, s.files.projectId))
      .where(and(eq(s.projects.organizationId, client.organizationId), ne(s.projects.clientId, client.clientId!)))
      .limit(1);
    expect(await getFileForDownload(client, theirFile.id)).toBeNull();
    expect(await getFileForDownload(manager, theirFile.id)).not.toBeNull();
  });
});
