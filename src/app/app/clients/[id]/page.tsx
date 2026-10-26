import { GlobeIcon, MailIcon, MapPinIcon, UserIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ClientStatusBadge } from "@/components/status-badges";
import { InvoicesTable } from "@/components/tables/invoices-table";
import { ProjectsTable } from "@/components/tables/projects-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, isOverdue } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { getClient } from "@/server/data/clients";
import { listInvoices } from "@/server/data/invoices";
import { listProjects } from "@/server/data/projects";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: PageProps<"/app/clients/[id]">) {
  const viewer = await requirePermission("client:read");
  const client = await getClient(viewer, (await params).id);
  if (!client) notFound();

  const seesFinance = can(viewer, "invoice:read");
  const [projects, invoices] = await Promise.all([
    listProjects(viewer, { clientId: client.id }),
    seesFinance ? listInvoices(viewer, { clientId: client.id }) : Promise.resolve(null),
  ]);
  const money = (cents: number) => formatMoney(cents, client.currency);
  const sum = (rows: { totalCents: number }[]) => rows.reduce((total, row) => total + row.totalCents, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={client.name}
        description={[client.industry, `Client since ${formatDate(client.createdAt)}`].filter(Boolean).join(" · ")}
        actions={<ClientStatusBadge status={client.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active projects" value={projects.filter((p) => p.status === "active").length} hint={`${projects.length} in total`} />
        {invoices && (
          <>
            <StatCard label="Paid to date" value={money(sum(invoices.filter((i) => i.status === "paid")))} />
            <StatCard label="Outstanding" value={money(sum(invoices.filter((i) => i.status === "sent")))} />
            <StatCard
              label="Overdue"
              value={money(sum(invoices.filter(isOverdue)))}
              tone={invoices.some(isOverdue) ? "warning" : undefined}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Projects</h2>
            <ProjectsTable projects={projects} compact />
          </section>
          {invoices && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Invoices</h2>
              <InvoicesTable invoices={invoices} compact />
            </section>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <MapPinIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                {[client.city, client.country].filter(Boolean).join(", ")}
              </p>
              {client.website && (
                <p className="flex items-center gap-2">
                  <GlobeIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {client.website.replace("https://", "")}
                </p>
              )}
              <p className="flex items-center gap-2">
                <UserIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                Account owner: {client.ownerName ?? "Unassigned"}
              </p>
              <p className="text-muted-foreground">Billing currency: {client.currency}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {client.contacts.map((contact) => (
                  <li key={contact.id} className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {contact.isPrimary && <Badge variant="secondary">Primary</Badge>}
                      {contact.hasPortalAccess && <Badge variant="outline">Portal access</Badge>}
                    </div>
                    <p className="text-muted-foreground">{contact.jobTitle}</p>
                    <p className="flex items-center gap-1.5 break-all text-muted-foreground">
                      <MailIcon className="size-3.5" aria-hidden="true" />
                      {contact.email}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
            </CardHeader>
            <CardContent>
              {client.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {client.notes.map((note) => (
                    <li key={note.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p>{note.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {note.authorName ?? "Someone"} · {formatDate(note.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
