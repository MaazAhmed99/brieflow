import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { MilestoneStatusBadge, ProjectStatusBadge } from "@/components/status-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { requireViewer } from "@/server/auth/viewer";
import { getProject } from "@/server/data/projects";

export const metadata: Metadata = { title: "Project" };

export default async function PortalProjectPage({ params }: PageProps<"/portal/projects/[id]">) {
  const viewer = await requireViewer();
  const project = await getProject(viewer, (await params).id);
  // Another client's project looks exactly like one that doesn't exist.
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> Back to overview
      </Link>
      <PageHeader
        title={project.name}
        description={`${formatDate(project.startDate)} – ${formatDate(project.dueDate)} · Managed by ${project.managerName ?? "the agency"}`}
        actions={<ProjectStatusBadge status={project.status} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-6 border-l pl-6">
            {project.milestones.map((milestone) => (
              <li key={milestone.id} className="relative">
                <span
                  className={`absolute top-1.5 -left-[1.95rem] size-3 rounded-full border-2 border-background ${
                    milestone.status === "done"
                      ? "bg-emerald-500"
                      : milestone.status === "in_progress"
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                  }`}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{milestone.title}</span>
                  <MilestoneStatusBadge status={milestone.status} />
                </div>
                <p className="text-sm text-muted-foreground">Due {formatDate(milestone.dueDate)}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <CardDescription>Posting comments and sharing files arrives with the next update.</CardDescription>
        </CardHeader>
        <CardContent>
          {project.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          ) : (
            <ul className="space-y-4">
              {project.comments.map((comment) => (
                <li key={comment.id} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm">{comment.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {comment.authorName ?? "Someone"} · {formatDate(comment.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
