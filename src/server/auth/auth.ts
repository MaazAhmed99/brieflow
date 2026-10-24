import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { siteConfig } from "@/config/site";
import { db } from "@/server/db/client";
import { accounts, sessions, users, verifications } from "@/server/db/schema";

// Where the app is served from. Vercel sets VERCEL_URL for every deployment
// (including previews); BETTER_AUTH_URL pins the production address.
const vercelUrls = [
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_URL,
]
  .filter(Boolean)
  .map((host) => `https://${host}`);

const baseURL =
  process.env.BETTER_AUTH_URL ?? vercelUrls[0] ?? "http://localhost:3000";

export const auth = betterAuth({
  appName: siteConfig.name,
  baseURL,
  trustedOrigins: [baseURL, ...vercelUrls, "http://localhost:3000"],
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  advanced: {
    // Let Postgres generate UUIDs, matching the rest of the schema.
    database: { generateId: "uuid" },
  },
  emailAndPassword: {
    enabled: true,
    // No public sign-up: visitors use the demo accounts, and admins invite people.
    disableSignUp: true,
  },
  session: {
    // Keep the session in a signed cookie for 5 minutes to skip a database read per request.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
    },
  },
  telemetry: { enabled: false },
  // Lets Server Actions set the session cookie after signing in.
  plugins: [nextCookies()],
});
