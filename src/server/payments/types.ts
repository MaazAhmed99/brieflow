// How a client pays an invoice. Two adapters implement this: Stripe (test mode
// only) and a clearly labelled demo checkout for deployments without Stripe.

export type CheckoutRequest = {
  invoiceId: string;
  number: string;
  totalCents: number;
  currency: string;
  clientName: string;
  organizationId: string;
  payerUserId: string;
  /** Absolute URLs for the provider to send the payer back to. */
  successUrl: string;
  cancelUrl: string;
};

export interface PaymentProvider {
  id: "stripe" | "demo";
  /** Shown on the invoice page next to the Pay button. */
  note: string;
  startCheckout(request: CheckoutRequest): Promise<{ url: string }>;
}
