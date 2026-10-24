import { ArrowLeftIcon, CreditCardIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { requireViewer } from "@/server/auth/viewer";
import { getInvoice } from "@/server/data/invoices";

export const metadata: Metadata = { title: "Invoice" };

export default async function PortalInvoicePage({ params }: PageProps<"/portal/invoices/[id]">) {
  const viewer = await requireViewer();
  const invoice = await getInvoice(viewer, (await params).id);
  if (!invoice) notFound();
  const money = (cents: number) => formatMoney(cents, invoice.currency);

  return (
    <div className="space-y-6">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden="true" /> Back to overview
      </Link>
      <PageHeader
        title={`Invoice ${invoice.number}`}
        description={`${invoice.projectName ?? "General"} · Issued ${formatDate(invoice.issueDate)} · Due ${formatDate(invoice.dueDate)}`}
        actions={<InvoiceStatusBadge invoice={invoice} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Rate</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{item.description}</td>
                  <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{money(item.unitPriceCents)}</td>
                  <td className="py-2 text-right tabular-nums">{money(item.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{money(invoice.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums">{money(invoice.taxCents)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(invoice.totalCents)}</dd>
            </div>
          </dl>
        </CardContent>
        {invoice.status === "sent" && (
          <CardFooter className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
            <p className="text-xs text-muted-foreground sm:mr-auto">
              Online card payment (Stripe test mode) arrives with the next update.
            </p>
            <Button disabled>
              <CreditCardIcon aria-hidden="true" /> Pay {money(invoice.totalCents)}
            </Button>
          </CardFooter>
        )}
        {invoice.status === "paid" && (
          <CardFooter>
            <p className="text-sm text-muted-foreground">Paid on {formatDate(invoice.paidAt)}. Thank you!</p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
