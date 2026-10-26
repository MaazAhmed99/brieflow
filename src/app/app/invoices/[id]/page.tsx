import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge } from "@/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { getInvoice } from "@/server/data/invoices";
import { MarkPaidButton } from "./mark-paid-button";

export const metadata: Metadata = { title: "Invoice" };

const providerLabel = { stripe: "Card (Stripe test mode)", demo: "Demo payment", manual: "Bank transfer (recorded manually)" };

export default async function InvoicePage({ params }: PageProps<"/app/invoices/[id]">) {
  const viewer = await requirePermission("invoice:read");
  const invoice = await getInvoice(viewer, (await params).id);
  if (!invoice) notFound();
  const money = (cents: number) => formatMoney(cents, invoice.currency);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={`Invoice ${invoice.number}`}
        description={`Issued ${formatDate(invoice.issueDate)} · Due ${formatDate(invoice.dueDate)}`}
        actions={
          <div className="flex items-center gap-3">
            <InvoiceStatusBadge invoice={invoice} />
            {invoice.status === "sent" && can(viewer, "invoice:write") && (
              <MarkPaidButton invoiceId={invoice.id} number={invoice.number} amount={money(invoice.totalCents)} />
            )}
          </div>
        }
      />
      <p className="-mt-4 text-sm text-muted-foreground">
        Billed to{" "}
        <Link href={`/app/clients/${invoice.clientId}`} className="font-medium text-foreground hover:text-primary">
          {invoice.clientName}
        </Link>
        {invoice.projectId && (
          <>
            {" "}for{" "}
            <Link href={`/app/projects/${invoice.projectId}`} className="font-medium text-foreground hover:text-primary">
              {invoice.projectName}
            </Link>
          </>
        )}
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceDocument {...invoice} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {invoice.payments.map((payment) => (
                    <li key={payment.id}>
                      <span className="font-medium tabular-nums">{formatMoney(payment.amountCents, payment.currency)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {providerLabel[payment.provider]} · {formatDate(payment.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <ol className="space-y-3 text-sm">
                  {invoice.history.map((entry) => (
                    <li key={entry.id}>
                      <p>{entry.summary}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
