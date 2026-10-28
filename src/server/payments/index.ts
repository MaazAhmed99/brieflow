import "server-only";
import { createDemoProvider } from "./demo";
import { createStripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

/** Stripe when a test-mode key is set (and PAYMENT_PROVIDER isn't "demo"), otherwise the demo checkout. */
export function getPaymentProvider(): PaymentProvider {
  const stripeReady = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
  return stripeReady && process.env.PAYMENT_PROVIDER !== "demo" ? createStripeProvider() : createDemoProvider();
}
