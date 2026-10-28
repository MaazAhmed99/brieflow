"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { markInvoicePaid, type PaymentResult } from "@/server/data/payments";

export async function markInvoicePaidAction(invoiceId: string): Promise<PaymentResult> {
  const viewer = await requireViewer();
  if (!can(viewer, "invoice:write")) return { ok: false, error: "You don't have permission to do that." };
  const parsed = z.uuid().safeParse(invoiceId);
  if (!parsed.success) return { ok: false, error: "Invoice not found." };

  const result = await markInvoicePaid(viewer, parsed.data);
  if (result.ok) {
    revalidatePath("/app/invoices", "layout");
    revalidatePath("/app");
  }
  return result;
}
