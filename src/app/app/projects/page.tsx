import { KanbanSquareIcon, TableIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ProjectsTable } from "@/components/tables/projects-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isoDaysFromToday, todayIso } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { listProjects } from "@/server/data/projects";
import { ProjectsBoard } from "./projects-board";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const viewer = await requirePermission("project:read");
  const projects = await listProjects(viewer);
  const active = projects.filter((p) => p.status === "active");
  const atRisk = active.filter((p) => p.health !== "on_track").length;
  const [today, in30Days] = [todayIso(), isoDaysFromToday(30)];
  const dueSoon = active.filter((p) => p.dueDate && p.dueDate >= today && p.dueDate <= in30Days).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Projects" description="Projects, milestones, tasks, files and comments." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active projects" value={active.length} hint={`${projects.length} in total`} />
        <StatCard label="At risk or off track" value={atRisk} tone={atRisk > 0 ? "warning" : undefined} />
        <StatCard label="Due in the next 30 days" value={dueSoon} />
      </div>
      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">
            <TableIcon aria-hidden="true" /> Table
          </TabsTrigger>
          <TabsTrigger value="board">
            <KanbanSquareIcon aria-hidden="true" /> Board
          </TabsTrigger>
        </TabsList>
        <TabsContent value="table" className="mt-4">
          <ProjectsTable projects={projects} />
        </TabsContent>
        <TabsContent value="board" className="mt-4">
          <ProjectsBoard projects={projects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
