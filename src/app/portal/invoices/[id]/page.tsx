import { ArrowLeftIcon, CreditCardIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
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
        <CardContent>
          <InvoiceDocument {...invoice} />
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
