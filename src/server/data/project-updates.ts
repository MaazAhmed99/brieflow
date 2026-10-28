import "server-only";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { assertCan, isUuid, scopeFor } from "@/server/authz/scope";
import { recordActivity } from "@/server/audit";
import { db } from "@/server/db/client";
import { comments, files, projects } from "@/server/db/schema";

// Comments and file uploads on a project. Both check that the viewer can see
// the project (client users: only their own company's), write an audit-log
// entry, and never trust what the browser says about visibility or file type.

const projectScope = (viewer: Viewer) =>
  scopeFor(viewer, { organizationId: projects.organizationId, clientId: projects.clientId });

async function visibleProject(viewer: Viewer, projectId: string) {
  if (!isUuid(projectId)) return null;
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), projectScope(viewer)))
    .limit(1);
  return project ?? null;
}

export type UpdateResult = { ok: true } | { ok: false; error: string };

export async function addComment(
  viewer: Viewer,
  input: { projectId: string; body: string; visibleToClient: boolean },
): Promise<UpdateResult> {
  assertCan(viewer, "comment:write");
  const body = input.body.trim();
  if (body.length < 1 || body.length > 2000) return { ok: false, error: "Comments must be 1 to 2,000 characters." };
  const project = await visibleProject(viewer, input.projectId);
  if (!project) return { ok: false, error: "Project not found." };

  // Client comments are always visible to the client; staff choose.
  const visibility = viewer.role === "client" || input.visibleToClient ? "client" : "internal";
  await db.transaction(async (tx) => {
    const [comment] = await tx
      .insert(comments)
      .values({ organizationId: viewer.organizationId, projectId: project.id, authorId: viewer.userId, body, visibility })
      .returning({ id: comments.id });
    await recordActivity(tx, viewer, {
      action: "comment.created",
      entityType: "comment",
      entityId: comment.id,
      summary: `${viewer.name} commented on ${project.name}`,
      metadata: { projectId: project.id, visibility },
    });
  });
  return { ok: true };
}

// ─── Uploads ────────────────────────────────────────────────────────────────

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Files are stored privately in Vercel Blob; uploads are off until it's connected. */
export function isUploadConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Works out the real file type from its first bytes (the browser's claimed
 * type and the file name are not trusted). Only PDFs and common images pass.
 */
export function detectFileType(bytes: Uint8Array): string | null {
  const starts = (...values: number[]) => values.every((value, i) => bytes[i] === value);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf"; // %PDF-
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  const riff = starts(0x52, 0x49, 0x46, 0x46);
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (riff && webp) return "image/webp";
  return null;
}

/** Keeps file names readable but safe to use in a storage path. */
export function safeFileName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, " ").trim();
  return (cleaned || "file").slice(0, 100);
}

export async function addProjectFile(viewer: Viewer, input: { projectId: string; file: File }): Promise<UpdateResult> {
  assertCan(viewer, "file:upload");
  if (!isUploadConfigured()) return { ok: false, error: "File uploads aren't configured on this deployment yet." };
  if (input.file.size === 0) return { ok: false, error: "That file is empty." };
  if (input.file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Files can be up to 2 MB." };
  const project = await visibleProject(viewer, input.projectId);
  if (!project) return { ok: false, error: "Project not found." };

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const contentType = detectFileType(bytes);
  if (!contentType) return { ok: false, error: "Only PDF, PNG, JPEG and WebP files can be uploaded." };

  const name = safeFileName(input.file.name);
  const fileId = randomUUID();
  const blob = await put(`projects/${project.id}/${fileId}-${name}`, Buffer.from(bytes), {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });

  try {
    await db.transaction(async (tx) => {
      await tx.insert(files).values({
        id: fileId,
        organizationId: viewer.organizationId,
        projectId: project.id,
        uploadedBy: viewer.userId,
        name,
        blobPathname: blob.pathname,
        // Downloads go through our own route, which checks access first.
        blobUrl: `/api/files/${fileId}`,
        contentType,
        sizeBytes: bytes.byteLength,
        isSeed: false,
      });
      await recordActivity(tx, viewer, {
        action: "file.uploaded",
        entityType: "file",
        entityId: fileId,
        summary: `${viewer.name} uploaded ${name} to ${project.name}`,
        metadata: { projectId: project.id },
      });
    });
  } catch (error) {
    await del(blob.url).catch(() => {}); // don't leave an orphaned file behind
    throw error;
  }
  return { ok: true };
}

/** A file the viewer may download, or null. */
export async function getFileForDownload(viewer: Viewer, fileId: string) {
  assertCan(viewer, "project:read");
  if (!isUuid(fileId)) return null;
  const [file] = await db
    .select({
      name: files.name,
      blobPathname: files.blobPathname,
      blobUrl: files.blobUrl,
      contentType: files.contentType,
      isSeed: files.isSeed,
    })
    .from(files)
    .innerJoin(projects, eq(projects.id, files.projectId))
    .where(and(eq(files.id, fileId), projectScope(viewer)))
    .limit(1);
  return file ?? null;
}
