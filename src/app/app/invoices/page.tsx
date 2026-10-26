import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { InvoicesTable } from "@/components/tables/invoices-table";
import { formatMoney, isOverdue, todayIso } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { listInvoices } from "@/server/data/invoices";
import { getCurrencyConverter } from "@/server/data/rates";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const viewer = await requirePermission("invoice:read");
  const [invoices, fx] = await Promise.all([listInvoices(viewer), getCurrencyConverter(viewer)]);

  // Totals mix USD, GBP and EUR invoices, so convert each to the base currency first.
  const total = (rows: typeof invoices) =>
    formatMoney(rows.reduce((sum, i) => sum + fx.toBase(i.totalCents, i.currency), 0), fx.baseCurrency);
  const thisMonth = todayIso().slice(0, 7);
  const open = invoices.filter((i) => i.status === "sent");
  const overdue = invoices.filter(isOverdue);
  const paidThisMonth = invoices.filter((i) => i.paidAt && new Date(i.paidAt).toISOString().startsWith(thisMonth));
  const ratesNote =
    fx.source === "frankfurter"
      ? `In ${fx.baseCurrency} at ECB rates from ${fx.rateDate}`
      : `In ${fx.baseCurrency} at fixed demo exchange rates`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Invoices" description="Invoices, payments and what's overdue." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding" value={total(open)} hint={`${open.length} open · ${ratesNote}`} />
        <StatCard
          label="Overdue"
          value={total(overdue)}
          hint={`${overdue.length} invoices past due`}
          tone={overdue.length > 0 ? "warning" : undefined}
        />
        <StatCard label="Paid this month" value={total(paidThisMonth)} hint={`${paidThisMonth.length} invoices`} />
        <StatCard label="Drafts" value={invoices.filter((i) => i.status === "draft").length} hint="Not sent yet" />
      </div>
      <InvoicesTable invoices={invoices} />
    </div>
  );
}
