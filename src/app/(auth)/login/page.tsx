import { CheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { siteConfig } from "@/config/site";
import { isAuthConfigured } from "@/server/auth/auth";
import { getViewer, homePathFor } from "@/server/auth/viewer";
import { DemoSignIn } from "./demo-sign-in";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const errorMessages: Record<string, string> = {
  "demo-unavailable": "The demo accounts aren't available right now. Please try again in a few minutes.",
  "rate-limited": "Too many sign-ins from your network. Wait a minute and try again.",
};

const highlights = [
  "Clients, projects and tasks in one place",
  "Invoices with online card payments (test mode)",
  "A client portal where each client sees only their own work",
  "An AI assistant that answers questions about your data",
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const viewer = await getViewer();
  if (viewer) redirect(homePathFor(viewer.role));

  const { error } = await searchParams;
  const errorMessage = typeof error === "string" ? errorMessages[error] : undefined;

  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Logo inverted className="text-lg" />
        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-semibold tracking-tight">Run your agency from one place.</h2>
          <ul className="space-y-3 text-primary-foreground/85">
            {highlights.map((item) => (
              <li key={item} className="flex gap-3">
                <CheckIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-foreground/70">
          A portfolio demo with invented sample data. Built by {siteConfig.author}.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <Logo className="mb-6 lg:hidden" />
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Pick a role to explore the demo workspace. No sign-up needed.
            </p>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <TriangleAlertIcon aria-hidden="true" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {isAuthConfigured() ? (
            <>
              <DemoSignIn />

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or sign in with email
                <span className="h-px flex-1 bg-border" />
              </div>

              <LoginForm />
            </>
          ) : (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                The live demo is being set up on this deployment. Please check back soon.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Demo workspace with sample data. Changes are reset every night.
          </p>
        </div>
      </section>
    </main>
  );
}
