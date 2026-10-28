import "server-only";
import type { PaymentProvider } from "./types";

// The demo checkout: our own confirmation page, clearly labelled, that records
// a payment without collecting card details or moving money. Used whenever
// Stripe isn't configured (or PAYMENT_PROVIDER=demo).
export function createDemoProvider(): PaymentProvider {
  return {
    id: "demo",
    note: "Demo mode: no real payment. No card details are collected and no money moves.",
    async startCheckout(request) {
      return { url: `/portal/invoices/${request.invoiceId}/demo-checkout` };
    },
  };
}
