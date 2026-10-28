import type Stripe from "stripe";
import { applyStripeCheckout } from "@/server/data/payments";
import { stripeClient } from "@/server/payments/stripe";

// Stripe calls this after a Checkout payment. The signature check proves the
// request came from Stripe; applyStripeCheckout is idempotent, so Stripe's
// retries never record a payment twice.

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !(process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")) {
    return Response.json({ error: "Stripe isn't configured." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    // The raw body, exactly as sent: the signature is computed over it.
    event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }
  // Test mode only, always.
  if (event.livemode) return Response.json({ error: "Live events are not accepted." }, { status: 400 });

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      const result = await applyStripeCheckout({
        id: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
        amountTotal: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        metadata: session.metadata ?? {},
      });
      return Response.json({ received: true, ...result });
    }
  }
  return Response.json({ received: true });
}
