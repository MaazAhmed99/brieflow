import { apiError, apiRoute } from "@/server/api/handler";
import { apiInvoiceStatus, invoiceDetailResource, toIso } from "@/server/api/schemas";
import { getInvoice } from "@/server/data/invoices";

// GET /api/v1/invoices/<id>

const method = { stripe: "card", demo: "demo", manual: "bank_transfer" } as const;

export const GET = apiRoute<{ id: string }>(async ({ viewer, params }) => {
  const invoice = await getInvoice(viewer, params.id);
  if (!invoice) return apiError(404, "not_found", "No invoice with that id.");
  const money = (amountCents: number) => ({ amountCents, currency: invoice.currency });

  return Response.json({
    data: invoiceDetailResource.parse({
      ...invoice,
      status: apiInvoiceStatus(invoice),
      paidAt: toIso(invoice.paidAt),
      total: money(invoice.totalCents),
      subtotal: money(invoice.subtotalCents),
      tax: money(invoice.taxCents),
      client: { id: invoice.clientId, name: invoice.clientName },
      project: invoice.projectId ? { id: invoice.projectId, name: invoice.projectName } : null,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: money(item.unitPriceCents),
        amount: money(item.amountCents),
      })),
      payments: invoice.payments.map((payment) => ({
        amount: { amountCents: payment.amountCents, currency: payment.currency },
        method: method[payment.provider],
        paidAt: toIso(payment.createdAt),
      })),
    }),
  });
});
