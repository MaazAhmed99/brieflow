"use client";

import { UploadIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addCommentAction, type FormState, uploadFileAction } from "@/server/actions/project-updates";

/** Comment box under a project's comments. Staff can choose whether the client sees it. */
export function CommentForm({ projectId, canChooseVisibility }: { projectId: string; canChooseVisibility: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(addCommentAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="projectId" value={projectId} />
      <Label htmlFor="comment-body" className="sr-only">
        Add a comment
      </Label>
      <Textarea id="comment-body" name="body" placeholder="Add a comment…" required maxLength={2000} rows={3} />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canChooseVisibility ? (
          <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Checkbox name="visibleToClient" /> Visible to the client
          </Label>
        ) : (
          <span className="text-xs text-muted-foreground">Your agency team will see this.</span>
        )}
        <SubmitButton size="sm">Post comment</SubmitButton>
      </div>
    </form>
  );
}

/** File picker for a project. Disabled, with the reason, when uploads aren't configured. */
export function UploadForm({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(uploadFileAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("File uploaded.");
    }
  }, [state]);

  if (!enabled) {
    return <p className="text-xs text-muted-foreground">File uploads aren&apos;t configured on this deployment yet.</p>;
  }

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="projectId" value={projectId} />
      <Label htmlFor={`file-${projectId}`} className="sr-only">
        Choose a file
      </Label>
      <input
        id={`file-${projectId}`}
        name="file"
        type="file"
        required
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
      />
      <p className="text-xs text-muted-foreground">PDF, PNG, JPEG or WebP, up to 2 MB.</p>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton size="sm" variant="outline">
        <UploadIcon aria-hidden="true" /> Upload
      </SubmitButton>
    </form>
  );
}
