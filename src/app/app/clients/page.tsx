import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requirePermission } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { listClients } from "@/server/data/clients";
import { ClientsTable } from "./clients-table";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const viewer = await requirePermission("client:read");
  const clients = await listClients(viewer);
  const active = clients.filter((c) => c.status === "active").length;
  const withWork = clients.filter((c) => c.activeProjects > 0).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Clients" description="Every client company, its contacts, projects and invoices." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Clients" value={clients.length} />
        <StatCard label="Active" value={active} />
        <StatCard label="With active projects" value={withWork} />
      </div>
      <ClientsTable clients={clients} showBalances={can(viewer, "invoice:read")} />
    </div>
  );
}
