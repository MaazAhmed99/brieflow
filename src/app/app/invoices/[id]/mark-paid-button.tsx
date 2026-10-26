"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { markInvoicePaidAction } from "@/server/actions/invoices";

export function MarkPaidButton({ invoiceId, number, amount }: { invoiceId: string; number: string; amount: string }) {
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await markInvoicePaidAction(invoiceId);
      if (result.ok) toast.success(`Invoice ${result.number} marked as paid.`);
      else toast.error(result.error);
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}
          Mark as paid
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark {number} as paid?</AlertDialogTitle>
          <AlertDialogDescription>
            Records a manual payment of {amount} (for example a bank transfer) and closes the invoice. The change
            is saved in the activity log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Mark as paid</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
