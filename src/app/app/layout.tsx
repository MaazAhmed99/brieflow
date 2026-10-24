import { redirect } from "next/navigation";
import { AppBreadcrumb } from "@/components/app-shell/app-breadcrumb";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { DemoBanner } from "@/components/app-shell/demo-banner";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireViewer } from "@/server/auth/viewer";
import { ROLE_LABELS } from "@/server/authz/permissions";

// The agency workspace. Client users belong in the portal instead.
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const viewer = await requireViewer();
  if (viewer.role === "client") redirect("/portal");
  const roleLabel = ROLE_LABELS[viewer.role];

  return (
    <SidebarProvider>
      <AppSidebar role={viewer.role} organizationName={viewer.organizationName} />
      <SidebarInset>
        <DemoBanner roleLabel={roleLabel} />
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <AppBreadcrumb />
          <div className="ml-auto">
            <UserMenu
              user={{ name: viewer.name, email: viewer.email, roleLabel, settingsHref: "/app/settings" }}
            />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
