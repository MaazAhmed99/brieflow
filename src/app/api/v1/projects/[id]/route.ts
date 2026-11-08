import { apiError, apiRoute } from "@/server/api/handler";
import { projectDetailResource } from "@/server/api/schemas";
import { getProject } from "@/server/data/projects";

// GET /api/v1/projects/<id>

export const GET = apiRoute<{ id: string }>(async ({ viewer, params }) => {
  const project = await getProject(viewer, params.id);
  if (!project) return apiError(404, "not_found", "No project with that id.");

  return Response.json({
    data: projectDetailResource.parse({
      ...project,
      health: project.status === "active" ? project.health : null,
      budget: { amountCents: project.budgetCents ?? 0, currency: project.currency },
      client: { id: project.clientId, name: project.clientName },
      manager: project.managerName,
      milestones: project.milestones.map((m) => ({ title: m.title, status: m.status, dueDate: m.dueDate })),
      tasks: { total: project.tasks.length, done: project.tasks.filter((t) => t.status === "done").length },
    }),
  });
});
