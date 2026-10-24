"use client";

import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useFormStatus } from "react-dom";
import { demoAccounts } from "@/config/demo";
import { signInAsDemo } from "@/server/actions/auth";

// One form per role, so each button knows which one is pending.
export function DemoSignIn() {
  return (
    <div className="grid gap-2">
      {demoAccounts.map((account) => (
        <form key={account.role} action={signInAsDemo}>
          <input type="hidden" name="role" value={account.role} />
          <DemoButton label={account.label} description={account.description} />
        </form>
      ))}
    </div>
  );
}

function DemoButton({ label, description }: { label: string; description: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
    >
      <span className="flex-1">
        <span className="block text-sm font-medium">Try as {label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      {pending ? (
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Signing in" />
      ) : (
        <ArrowRightIcon
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
