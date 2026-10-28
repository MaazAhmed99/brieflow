"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { addComment, addProjectFile } from "@/server/data/project-updates";

export type FormState = { ok?: boolean; error?: string };

function refresh(projectId: string) {
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath(`/portal/projects/${projectId}`);
}

export async function addCommentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  if (!can(viewer, "comment:write")) return { error: "You can't comment on projects." };
  const projectId = String(formData.get("projectId") ?? "");
  const result = await addComment(viewer, {
    projectId,
    body: String(formData.get("body") ?? ""),
    visibleToClient: formData.get("visibleToClient") === "on",
  });
  if (!result.ok) return { error: result.error };
  refresh(projectId);
  return { ok: true };
}

export async function uploadFileAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  if (!can(viewer, "file:upload")) return { error: "You can't upload files." };
  const projectId = String(formData.get("projectId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to upload." };
  try {
    const result = await addProjectFile(viewer, { projectId, file });
    if (!result.ok) return { error: result.error };
  } catch (error) {
    console.error("Upload failed", error);
    return { error: "The upload failed. Please try again." };
  }
  refresh(projectId);
  return { ok: true };
}
