import { CheckCircle2Icon, CircleDashedIcon, CircleDotIcon, EyeIcon, LockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileList } from "@/components/file-list";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { HealthBadge, MilestoneStatusBadge, ProjectStatusBadge } from "@/components/status-badges";
import { InvoicesTable } from "@/components/tables/invoices-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatMoney } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { listInvoices } from "@/server/data/invoices";
import { getProject } from "@/server/data/projects";

export const metadata: Metadata = { title: "Project" };

const taskIcon = {
  todo: CircleDashedIcon,
  in_progress: CircleDotIcon,
  review: EyeIcon,
  done: CheckCircle2Icon,
} as const;

const taskLabel = { todo: "To do", in_progress: "In progress", review: "In review", done: "Done" } as const;

export default async function ProjectPage({ params }: PageProps<"/app/projects/[id]">) {
  const viewer = await requirePermission("project:read");
  const project = await getProject(viewer, (await params).id);
  if (!project) notFound();

  const invoices = can(viewer, "invoice:read") ? await listInvoices(viewer, { projectId: project.id }) : null;
  const money = (cents: number) => formatMoney(cents, project.currency);
  const invoiced = invoices?.filter((i) => i.status !== "void" && i.status !== "draft").reduce((sum, i) => sum + i.totalCents, 0) ?? 0;
  const doneTasks = project.tasks.filter((t) => t.status === "done").length;
  const progress = project.tasks.length ? Math.round((doneTasks / project.tasks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={project.name}
        description={project.code}
        actions={
          <div className="flex flex-wrap gap-2">
            <ProjectStatusBadge status={project.status} />
            {project.status === "active" && <HealthBadge health={project.health} />}
          </div>
        }
      />
      <p className="-mt-4 text-sm text-muted-foreground">
        <Link href={`/app/clients/${project.clientId}`} className="font-medium text-foreground hover:text-primary">
          {project.clientName}
        </Link>{" "}
        · {formatDate(project.startDate)} – {formatDate(project.dueDate)} · Managed by {project.managerName ?? "—"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Progress" value={`${progress}%`} hint={`${doneTasks} of ${project.tasks.length} tasks done`} />
        <StatCard label="Milestones done" value={`${project.milestones.filter((m) => m.status === "done").length} / ${project.milestones.length}`} />
        {project.budgetCents !== null && <StatCard label="Budget" value={money(project.budgetCents)} />}
        {invoices && (
          <StatCard
            label="Invoiced so far"
            value={money(invoiced)}
            hint={project.budgetCents ? `${Math.round((invoiced / project.budgetCents) * 100)}% of budget` : undefined}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Milestones and tasks</CardTitle>
              <CardDescription>
                <Progress value={progress} className="mt-2" aria-label={`${progress}% of tasks done`} />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {project.milestones.map((milestone) => {
                const milestoneTasks = project.tasks.filter((t) => t.milestoneId === milestone.id);
                return (
                  <section key={milestone.id} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{milestone.title}</h3>
                      <MilestoneStatusBadge status={milestone.status} />
                      <span className="text-xs text-muted-foreground">Due {formatDate(milestone.dueDate)}</span>
                    </div>
                    <ul className="divide-y rounded-lg border">
                      {milestoneTasks.map((task) => {
                        const Icon = taskIcon[task.status];
                        return (
                          <li key={task.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                            <Icon
                              className={`size-4 shrink-0 ${task.status === "done" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                              aria-label={taskLabel[task.status]}
                            />
                            <span className={`flex-1 ${task.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                              {task.title}
                            </span>
                            {(task.priority === "high" || task.priority === "urgent") && task.status !== "done" && (
                              <Badge variant="outline" className="capitalize">{task.priority}</Badge>
                            )}
                            <span className="hidden w-32 truncate text-right text-xs text-muted-foreground sm:block">
                              {task.assigneeName}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </CardContent>
          </Card>

          {invoices && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Invoices</h2>
              <InvoicesTable invoices={invoices} compact />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {project.team.map((member) => (
                  <li key={member.id}>
                    <span className="font-medium">{member.name}</span>
                    <span className="block text-xs text-muted-foreground">{member.jobTitle}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent>
              <FileList files={project.files} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
              <CardDescription>Comments marked internal are hidden from the client.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {project.comments.map((comment) => (
                  <li key={comment.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p>{comment.body}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {comment.visibility === "internal" && <LockIcon className="size-3" aria-label="Internal" />}
                      {comment.authorName ?? "Someone"} · {formatDate(comment.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
