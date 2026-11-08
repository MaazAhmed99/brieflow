import { z } from "zod";
import { apiRoute, pageQuery, paginate, parseQuery } from "@/server/api/handler";
import { apiInvoiceStatus, invoiceResource, toIso } from "@/server/api/schemas";
import { listInvoices } from "@/server/data/invoices";

// GET /api/v1/invoices?status=overdue&clientId=<uuid>&page=1&pageSize=25

const query = pageQuery.extend({
  status: z.enum(["draft", "open", "overdue", "paid", "void"]).optional(),
  clientId: z.uuid().optional(),
});

export const GET = apiRoute(async ({ viewer, request }) => {
  const params = parseQuery(request, query);
  if (params instanceof Response) return params;

  const rows = (await listInvoices(viewer, { clientId: params.clientId }))
    .map((invoice) =>
      invoiceResource.parse({
        ...invoice,
        status: apiInvoiceStatus(invoice),
        paidAt: toIso(invoice.paidAt),
        total: { amountCents: invoice.totalCents, currency: invoice.currency },
        client: { id: invoice.clientId, name: invoice.clientName },
        project: invoice.projectId ? { id: invoice.projectId, name: invoice.projectName } : null,
      }),
    )
    .filter((invoice) => !params.status || invoice.status === params.status);
  return Response.json(paginate(rows, params.page, params.pageSize));
});
