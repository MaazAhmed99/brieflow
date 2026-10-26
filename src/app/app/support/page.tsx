import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ComingSoonButton, PreviewNotice } from "@/components/preview-notice";
import { StatCard } from "@/components/stat-card";
import { requirePermission } from "@/server/auth/viewer";
import { listTickets } from "@/server/data/preview";
import { TicketsTable } from "./tickets-table";

export const metadata: Metadata = { title: "Tickets" };

export default async function SupportPage() {
  const viewer = await requirePermission("support:read");
  const tickets = await listTickets(viewer);
  const open = tickets.filter((t) => t.status === "open" || t.status === "pending");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Tickets"
        description="Client support requests."
        preview
        actions={
          <ComingSoonButton reason="Creating and replying to tickets arrives after v1.">
            <PlusIcon aria-hidden="true" /> New ticket
          </ComingSoonButton>
        }
      />
      <PreviewNotice coming="replying to tickets, assigning them, and clients opening tickets from the portal" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open or pending" value={open.length} />
        <StatCard
          label="Urgent or high"
          value={open.filter((t) => t.priority === "urgent" || t.priority === "high").length}
          hint="Among open tickets"
        />
        <StatCard label="All tickets" value={tickets.length} hint="Last 6 months" />
      </div>
      <TicketsTable tickets={tickets} showClient />
    </div>
  );
}
