import { z } from "zod";
import { apiRoute, pageQuery, paginate, parseQuery } from "@/server/api/handler";
import { clientResource } from "@/server/api/schemas";
import { listClients } from "@/server/data/clients";

// GET /api/v1/clients?status=active&search=harbor&page=1&pageSize=25

const query = pageQuery.extend({
  status: z.enum(["active", "paused", "archived"]).optional(),
  search: z.string().max(100).optional(),
});

export const GET = apiRoute(async ({ viewer, request }) => {
  const params = parseQuery(request, query);
  if (params instanceof Response) return params;

  const rows = (await listClients(viewer, { search: params.search }))
    .filter((client) => !params.status || client.status === params.status)
    .map((client) =>
      clientResource.parse({
        ...client,
        outstanding: { amountCents: client.outstandingCents ?? 0, currency: client.currency },
      }),
    );
  return Response.json(paginate(rows, params.page, params.pageSize));
});
