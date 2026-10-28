import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { requireViewer } from "@/server/auth/viewer";
import { getInvoice } from "@/server/data/invoices";
import { RefreshWhilePending } from "./refresh-while-pending";

export const metadata: Metadata = { title: "Payment" };

// Where checkout returns the client. With Stripe the webhook can land a moment
// after the redirect, so while the invoice is still open the page re-checks.
export default async function PaymentReceivedPage({ params }: PageProps<"/portal/invoices/[id]/paid">) {
  const viewer = await requireViewer();
  const invoice = await getInvoice(viewer, (await params).id);
  if (!invoice) notFound();
  const paid = invoice.status === "paid";
  const payment = invoice.payments[0];

  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <CardHeader className="items-center gap-3 text-center">
          {paid ? (
            <CheckCircle2Icon className="size-12 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          ) : (
            <Loader2Icon className="size-12 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
          <CardTitle className="text-xl">{paid ? "Payment received. Thank you!" : "Confirming your payment…"}</CardTitle>
          <CardDescription>
            {paid
              ? `Invoice ${invoice.number} is paid.`
              : "This usually takes a few seconds. You can leave this page; the invoice updates on its own."}
          </CardDescription>
        </CardHeader>
        {paid && payment && (
          <CardContent>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium tabular-nums">{formatMoney(payment.amountCents, payment.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Date</dt>
                <dd>{formatDate(payment.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Method</dt>
                <dd>{payment.provider === "stripe" ? "Card (Stripe test mode)" : "Demo payment"}</dd>
              </div>
            </dl>
          </CardContent>
        )}
        <CardFooter className="justify-center">
          <Button asChild variant="outline">
            <Link href="/portal">Back to overview</Link>
          </Button>
        </CardFooter>
      </Card>
      {!paid && <RefreshWhilePending />}
    </div>
  );
}
