import { ArrowLeftIcon, CreditCardIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge } from "@/components/status-badges";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { startInvoicePayment } from "@/server/actions/payments";
import { requireViewer } from "@/server/auth/viewer";
import { getInvoice } from "@/server/data/invoices";
import { getPaymentProvider } from "@/server/payments";

export const metadata: Metadata = { title: "Invoice" };

const paymentMessages: Record<string, string> = {
  unavailable: "Online payment isn't available right now. Please try again in a few minutes.",
  failed: "The payment didn't go through. Nothing was charged.",
};

export default async function PortalInvoicePage({ params, searchParams }: PageProps<"/portal/invoices/[id]">) {
  const viewer = await requireViewer();
  const invoice = await getInvoice(viewer, (await params).id);
  if (!invoice) notFound();
  const { payment } = await searchParams;
  const message = typeof payment === "string" ? paymentMessages[payment] : undefined;
  const provider = getPaymentProvider();
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

      {message && (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceDocument {...invoice} />
        </CardContent>
        {invoice.status === "sent" && (
          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <p className="text-xs text-muted-foreground sm:mr-auto sm:max-w-md">{provider.note}</p>
            <form action={startInvoicePayment}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <SubmitButton className="w-full sm:w-auto">
                <CreditCardIcon aria-hidden="true" />
                {provider.id === "demo" ? `Pay ${money(invoice.totalCents)} (demo)` : `Pay ${money(invoice.totalCents)} by card`}
              </SubmitButton>
            </form>
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
