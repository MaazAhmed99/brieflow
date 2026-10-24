import { signOut } from "@/server/actions/auth";

// Shown on every signed-in page, so nobody mistakes the demo for a real workspace.
export function DemoBanner({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-muted/60 px-4 py-1.5 text-center text-xs text-muted-foreground">
      <span>
        Demo workspace with sample data, reset every night. You&apos;re signed in as{" "}
        <strong className="font-medium text-foreground">{roleLabel}</strong>.
      </span>
      <form action={signOut}>
        <button type="submit" className="font-medium text-primary underline-offset-4 hover:underline">
          Switch role
        </button>
      </form>
    </div>
  );
}
