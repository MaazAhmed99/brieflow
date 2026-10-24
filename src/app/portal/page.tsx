import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge, ProjectStatusBadge } from "@/components/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, isOverdue } from "@/lib/format";
import { requireViewer } from "@/server/auth/viewer";
import { listInvoices } from "@/server/data/invoices";
import { listProjects } from "@/server/data/projects";

export const metadata: Metadata = { title: "Client portal" };

export default async function PortalHomePage() {
  const viewer = await requireViewer();
  const [projects, invoices] = await Promise.all([listProjects(viewer), listInvoices(viewer)]);
  const unpaid = invoices.filter((invoice) => invoice.status === "sent");
  const paid = invoices.filter((invoice) => invoice.status === "paid").slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi ${viewer.name.split(" ")[0]}`}
        description={`Everything ${viewer.organizationName} is working on for ${viewer.clientName}.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Invoices to pay</CardTitle>
        </CardHeader>
        <CardContent>
          {unpaid.length === 0 ? (
            <p className="text-sm text-muted-foreground">You&apos;re all paid up. Thank you!</p>
          ) : (
            <ul className="divide-y">
              {unpaid.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/portal/invoices/${invoice.id}`}
                    className="flex items-center gap-3 py-3 hover:text-primary"
                  >
                    <span className="flex-1">
                      <span className="block font-medium">{invoice.number}</span>
                      <span className="block text-xs text-muted-foreground">
                        {isOverdue(invoice) ? "Was due" : "Due"} {formatDate(invoice.dueDate)}
                      </span>
                    </span>
                    <InvoiceStatusBadge invoice={invoice} />
                    <span className="w-28 text-right font-medium tabular-nums">
                      {formatMoney(invoice.totalCents, invoice.currency)}
                    </span>
                    <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your projects</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} href={`/portal/projects/${project.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader className="gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="leading-snug">{project.name}</CardTitle>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(project.startDate)} – {formatDate(project.dueDate)}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {paid.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Recently paid</h2>
          <ul className="divide-y rounded-xl border px-4">
            {paid.map((invoice) => (
              <li key={invoice.id}>
                <Link href={`/portal/invoices/${invoice.id}`} className="flex items-center gap-3 py-3 text-sm hover:text-primary">
                  <span className="flex-1 font-medium">{invoice.number}</span>
                  <span className="text-muted-foreground">Paid {formatDate(invoice.paidAt)}</span>
                  <span className="w-28 text-right tabular-nums">{formatMoney(invoice.totalCents, invoice.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
