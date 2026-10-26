import Link from "next/link";
import { HealthBadge } from "@/components/status-badges";
import type { ProjectRow } from "@/components/tables/projects-table";
import { formatDate } from "@/lib/format";

const columns = [
  { status: "planned", title: "Planned" },
  { status: "active", title: "Active" },
  { status: "on_hold", title: "On hold" },
  { status: "completed", title: "Completed" },
];

// Kanban view of the same projects, one column per status.
export function ProjectsBoard({ projects }: { projects: ProjectRow[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((column) => {
        const items = projects.filter((project) => project.status === column.status);
        return (
          <section key={column.status} className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 p-3" aria-label={column.title}>
            <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-medium">
              {column.title}
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                {items.length}
              </span>
            </h2>
            <ul className="space-y-2">
              {items.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/app/projects/${project.id}`}
                    className="block space-y-2 rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors hover:border-primary/50"
                  >
                    <span className="block font-medium leading-snug">{project.name}</span>
                    <span className="block text-xs text-muted-foreground">{project.clientName}</span>
                    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      Due {formatDate(project.dueDate)}
                      {project.status === "active" && <HealthBadge health={project.health} />}
                    </span>
                  </Link>
                </li>
              ))}
              {items.length === 0 && <li className="px-1 text-xs text-muted-foreground">No projects</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
