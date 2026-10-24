"use server";

import { APIError } from "better-auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { demoAccounts } from "@/config/demo";
import { getAuth, isAuthConfigured } from "@/server/auth/auth";
import { homePathFor } from "@/server/auth/viewer";
import { db } from "@/server/db/client";
import { memberships } from "@/server/db/schema";
import { clientIp, rateLimit } from "@/server/rate-limit";

export type SignInState = { error?: string; email?: string };

const credentials = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
});

async function homePathForUser(userId: string) {
  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  return membership ? homePathFor(membership.role) : "/login";
}

export async function signInWithPassword(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const parsed = credentials.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password.", email };
  if (!isAuthConfigured()) return { error: "Sign-in isn't available on this deployment yet.", email };

  const limit = rateLimit(`sign-in:${await clientIp()}`, 10, 60_000);
  if (!limit.ok) {
    return { error: "Too many attempts. Wait a minute and try again.", email };
  }

  let userId: string;
  try {
    const result = await getAuth().api.signInEmail({ body: parsed.data, headers: await headers() });
    userId = result.user.id;
  } catch (error) {
    if (error instanceof APIError) return { error: "Email or password is incorrect.", email };
    throw error;
  }
  // redirect() works by throwing, so it stays outside the try block.
  redirect(await homePathForUser(userId));
}

/** One-click sign-in as a seeded demo user. Visitors never see the password. */
export async function signInAsDemo(formData: FormData) {
  const account = demoAccounts.find((a) => a.role === formData.get("role"));
  if (!account) return;

  const limit = rateLimit(`demo:${await clientIp()}`, 20, 60_000);
  if (!limit.ok) redirect("/login?error=rate-limited");

  const password = process.env.DEMO_USER_PASSWORD;
  if (!password || !isAuthConfigured()) redirect("/login?error=demo-unavailable");

  try {
    await getAuth().api.signInEmail({
      body: { email: account.email, password },
      headers: await headers(),
    });
  } catch (error) {
    // Usually means the database hasn't been seeded with the current password.
    if (error instanceof APIError) redirect("/login?error=demo-unavailable");
    throw error;
  }
  redirect(homePathFor(account.role));
}

export async function signOut() {
  if (isAuthConfigured()) await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}
