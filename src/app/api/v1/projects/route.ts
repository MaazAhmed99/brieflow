import { z } from "zod";
import { apiRoute, pageQuery, paginate, parseQuery } from "@/server/api/handler";
import { projectResource } from "@/server/api/schemas";
import { listProjects } from "@/server/data/projects";

// GET /api/v1/projects?status=active&clientId=<uuid>&search=atlas&page=1&pageSize=25

const query = pageQuery.extend({
  status: z.enum(["planned", "active", "on_hold", "completed"]).optional(),
  clientId: z.uuid().optional(),
  search: z.string().max(100).optional(),
});

export const GET = apiRoute(async ({ viewer, request }) => {
  const params = parseQuery(request, query);
  if (params instanceof Response) return params;

  const rows = await listProjects(viewer, {
    status: params.status ? [params.status] : undefined,
    clientId: params.clientId,
    search: params.search,
  });
  const data = rows.map((project) =>
    projectResource.parse({
      ...project,
      health: project.status === "active" ? project.health : null,
      budget: { amountCents: project.budgetCents ?? 0, currency: project.currency },
      client: { id: project.clientId, name: project.clientName },
    }),
  );
  return Response.json(paginate(data, params.page, params.pageSize));
});
