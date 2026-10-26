import "server-only";
import { desc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { exchangeRates } from "@/server/db/schema";

// The real state of every third-party service, worked out from env vars (and
// for exchange rates, from the database). The Integrations page shows exactly
// this, so nothing ever looks connected when it isn't.

export type IntegrationState = "connected" | "test-mode" | "free-tier" | "demo" | "local" | "not-configured";

export type Integration = {
  name: string;
  purpose: string;
  state: IntegrationState;
  detail?: string;
  phase: "v1" | "v1.1";
};

const has = (...keys: string[]) => keys.every((key) => Boolean(process.env[key]));

export async function getIntegrationStatus(): Promise<Integration[]> {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const [latestRate] = await db.select().from(exchangeRates).orderBy(desc(exchangeRates.rateDate)).limit(1);

  return [
    {
      name: "PostgreSQL",
      purpose: "Database",
      phase: "v1",
      state: databaseUrl.includes("neon.tech") ? "free-tier" : databaseUrl ? "local" : "not-configured",
      detail: databaseUrl.includes("neon.tech") ? "Neon" : databaseUrl ? "Local PGlite database" : undefined,
    },
    {
      name: "Better Auth",
      purpose: "Sign-in and sessions",
      phase: "v1",
      state: has("BETTER_AUTH_SECRET") ? "connected" : "not-configured",
    },
    {
      name: "Stripe",
      purpose: "Invoice payments",
      phase: "v1",
      state:
        process.env.PAYMENT_PROVIDER === "demo"
          ? "demo"
          : stripeKey.startsWith("sk_test_")
            ? "test-mode"
            : "not-configured",
      detail: process.env.PAYMENT_PROVIDER === "demo" ? "Demo payments: no real money moves" : undefined,
    },
    { name: "Groq", purpose: "AI assistant", phase: "v1", state: has("GROQ_API_KEY") ? "free-tier" : "not-configured" },
    { name: "Google Gemini", purpose: "AI assistant fallback", phase: "v1", state: has("GEMINI_API_KEY") ? "free-tier" : "not-configured" },
    {
      name: "Upstash Redis",
      purpose: "Rate limits and AI quotas",
      phase: "v1",
      state: has("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN") ? "free-tier" : "not-configured",
    },
    { name: "Vercel Blob", purpose: "File uploads", phase: "v1", state: has("BLOB_READ_WRITE_TOKEN") ? "free-tier" : "not-configured" },
    {
      name: "Frankfurter",
      purpose: "Exchange rates (ECB)",
      phase: "v1",
      state: latestRate?.source === "frankfurter" ? "free-tier" : "not-configured",
      detail: latestRate?.source === "frankfurter" ? `Rates from ${latestRate.rateDate}` : "Using fixed demo rates until the first sync",
    },
    { name: "Nager.Date", purpose: "Public holidays (HR)", phase: "v1", state: "free-tier", detail: "No key needed" },
    { name: "Resend", purpose: "Invoice emails", phase: "v1.1", state: has("RESEND_API_KEY") ? "free-tier" : "not-configured" },
    {
      name: "Pusher",
      purpose: "Real-time notifications",
      phase: "v1.1",
      state: has("PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET") ? "free-tier" : "not-configured",
    },
    { name: "Slack", purpose: "Payment alerts", phase: "v1.1", state: has("SLACK_WEBHOOK_URL") ? "connected" : "not-configured" },
    { name: "Sentry", purpose: "Error monitoring", phase: "v1.1", state: has("SENTRY_DSN") ? "free-tier" : "not-configured" },
    { name: "PostHog", purpose: "Product analytics", phase: "v1.1", state: has("NEXT_PUBLIC_POSTHOG_KEY") ? "free-tier" : "not-configured" },
  ];
}
