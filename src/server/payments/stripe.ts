import "server-only";
import Stripe from "stripe";
import type { PaymentProvider } from "./types";

// Stripe Checkout in test mode: Stripe hosts the card form, then calls our
// webhook (/api/stripe/webhook), which marks the invoice paid. Live keys are
// refused on purpose: this is a demo and must never take real money.

let client: Stripe | undefined;

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key.startsWith("sk_test_")) throw new Error("Stripe is only allowed in test mode (sk_test_ keys).");
  client ??= new Stripe(key);
  return client;
}

export function createStripeProvider(): PaymentProvider {
  return {
    id: "stripe",
    note: "Stripe test mode: pay with the test card 4242 4242 4242 4242, any future date and any CVC. No real money moves.",
    async startCheckout(request) {
      const metadata = {
        invoiceId: request.invoiceId,
        organizationId: request.organizationId,
        payerUserId: request.payerUserId,
      };
      const session = await stripeClient().checkout.sessions.create({
        mode: "payment",
        client_reference_id: request.invoiceId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: request.currency.toLowerCase(),
              unit_amount: request.totalCents,
              product_data: { name: `Invoice ${request.number}`, description: `For ${request.clientName}` },
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return { url: session.url };
    },
  };
}
