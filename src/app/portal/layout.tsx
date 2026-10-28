import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/app-shell/demo-banner";
import { UserMenu } from "@/components/app-shell/user-menu";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { Logo } from "@/components/brand/logo";
import { assistantConfigFor } from "@/server/ai/config";
import { requireViewer } from "@/server/auth/viewer";

// The client portal: one company's projects, files and invoices. Agency staff
// belong in /app instead.
export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const viewer = await requireViewer();
  if (viewer.role !== "client") redirect("/app");

  return (
    <AssistantProvider config={assistantConfigFor(viewer)}>
      <div className="flex min-h-svh flex-1 flex-col">
        <DemoBanner roleLabel={`Client (${viewer.clientName})`} />
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
            <Link href="/portal" className="flex items-center gap-3">
              <Logo />
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Client portal · {viewer.organizationName}
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <AssistantLauncher />
              <UserMenu user={{ name: viewer.name, email: viewer.email, roleLabel: `Client at ${viewer.clientName}` }} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      </div>
    </AssistantProvider>
  );
}
