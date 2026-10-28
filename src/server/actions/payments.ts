"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireViewer } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { getInvoice } from "@/server/data/invoices";
import { payInvoiceWithDemo } from "@/server/data/payments";
import { getPaymentProvider } from "@/server/payments";

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

/** The client's Pay button: sends them to Stripe Checkout or the demo checkout. */
export async function startInvoicePayment(formData: FormData) {
  const viewer = await requireViewer();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const invoicePage = `/portal/invoices/${invoiceId}`;
  if (!can(viewer, "invoice:pay")) redirect("/portal");

  // getInvoice applies the client scope, so nobody can start paying someone else's invoice.
  const invoice = await getInvoice(viewer, invoiceId);
  if (!invoice || invoice.status !== "sent") redirect(invoicePage);

  const origin = await siteOrigin();
  let url: string;
  try {
    ({ url } = await getPaymentProvider().startCheckout({
      invoiceId: invoice.id,
      number: invoice.number,
      totalCents: invoice.totalCents,
      currency: invoice.currency,
      clientName: invoice.clientName,
      organizationId: viewer.organizationId,
      payerUserId: viewer.userId,
      successUrl: `${origin}${invoicePage}/paid`,
      cancelUrl: `${origin}${invoicePage}`,
    }));
  } catch (error) {
    console.error("Starting checkout failed", error);
    redirect(`${invoicePage}?payment=unavailable`);
  }
  redirect(url);
}

/** "Complete demo payment" on the demo checkout page. */
export async function completeDemoPayment(formData: FormData) {
  const viewer = await requireViewer();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const invoicePage = `/portal/invoices/${invoiceId}`;
  // The demo checkout only exists when Stripe isn't in use.
  if (getPaymentProvider().id !== "demo") redirect(invoicePage);

  const result = await payInvoiceWithDemo(viewer, invoiceId);
  revalidatePath("/portal", "layout");
  revalidatePath("/app", "layout");
  redirect(result.ok ? `${invoicePage}/paid` : `${invoicePage}?payment=failed`);
}
