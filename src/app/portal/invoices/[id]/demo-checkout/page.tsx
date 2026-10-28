import { FlaskConicalIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { completeDemoPayment } from "@/server/actions/payments";
import { requireViewer } from "@/server/auth/viewer";
import { getInvoice } from "@/server/data/invoices";
import { getPaymentProvider } from "@/server/payments";

export const metadata: Metadata = { title: "Demo checkout" };

// Our own checkout for deployments without Stripe: clearly a demo, collects no
// card details, and records a "demo" payment.
export default async function DemoCheckoutPage({ params }: PageProps<"/portal/invoices/[id]/demo-checkout">) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (getPaymentProvider().id !== "demo") redirect(`/portal/invoices/${id}`);
  const invoice = await getInvoice(viewer, id);
  if (!invoice) notFound();
  if (invoice.status !== "sent") redirect(`/portal/invoices/${id}`);

  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <CardHeader className="gap-3">
          <Badge variant="outline" className="w-fit gap-1.5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <FlaskConicalIcon aria-hidden="true" /> Demo mode: no real payment
          </Badge>
          <CardTitle className="text-xl">Pay invoice {invoice.number}</CardTitle>
          <CardDescription>
            {invoice.clientName} · {invoice.projectName ?? "General"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-4xl font-semibold tabular-nums">{formatMoney(invoice.totalCents, invoice.currency)}</p>
          <p className="text-sm text-muted-foreground">
            This deployment runs without a payment processor. Completing the demo payment marks the invoice as paid
            in the demo data. No card details are collected and no money moves.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" asChild>
            <Link href={`/portal/invoices/${invoice.id}`}>Cancel</Link>
          </Button>
          <form action={completeDemoPayment}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <SubmitButton className="w-full">Complete demo payment</SubmitButton>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
