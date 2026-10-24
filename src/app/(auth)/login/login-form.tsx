"use client";

import { Loader2Icon } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPassword, type SignInState } from "@/server/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signInWithPassword,
    {},
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          aria-invalid={state.error ? true : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "sign-in-error" : undefined}
        />
      </div>
      {state.error && (
        <p id="sign-in-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        Sign in
      </Button>
    </form>
  );
}
