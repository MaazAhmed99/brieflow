import type { Metadata } from "next";
import { RevenueExpensesChart } from "@/components/charts/revenue-expenses-chart";
import { TopClientsChart } from "@/components/charts/top-clients-chart";
import { PageHeader } from "@/components/page-header";
import { PreviewNotice } from "@/components/preview-notice";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { getRevenueByClient, getRevenueByMonth } from "@/server/data/dashboard";
import { listExpenses } from "@/server/data/preview";

export const metadata: Metadata = { title: "Reports" };

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

export default async function ReportsPage() {
  const viewer = await requirePermission("finance:read");
  const [revenue, byClient, expenses] = await Promise.all([
    getRevenueByMonth(viewer),
    getRevenueByClient(viewer),
    listExpenses(viewer),
  ]);

  // Approved and reimbursed expenses, bucketed into the same 12 months as revenue.
  const spentByMonth = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.status === "approved" || expense.status === "reimbursed") {
      const key = expense.spentOn.slice(0, 7);
      spentByMonth.set(key, (spentByMonth.get(key) ?? 0) + expense.amountCents);
    }
  }
  const points = revenue.months.map((m) => ({
    month: m.key,
    label: monthLabel.format(m.date),
    revenue: m.cents / 100,
    expenses: (spentByMonth.get(m.key) ?? 0) / 100,
  }));
  const totalRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
  const totalExpenses = points.reduce((sum, p) => sum + p.expenses, 0);
  const money = (amount: number) => formatMoney(Math.round(amount * 100), revenue.currency).replace(/\.\d\d$/, "");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Reports" description="Revenue, costs and your best clients over the last 12 months." preview />
      <PreviewNotice coming="profit by project, team utilization trends, custom date ranges and PDF exports" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue received" value={money(totalRevenue)} hint="Last 12 months" />
        <StatCard label="Tracked expenses" value={money(totalExpenses)} hint="Approved and reimbursed" />
        <StatCard
          label="Revenue minus expenses"
          value={money(totalRevenue - totalExpenses)}
          hint="Salaries aren't tracked in the demo, so this isn't profit"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Revenue and expenses</CardTitle>
          <CardDescription>
            Per month, in {revenue.currency}
            {revenue.ratesSource === "static" ? " (fixed demo exchange rates)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueExpensesChart data={points} currency={revenue.currency} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top clients by revenue</CardTitle>
          <CardDescription>Paid invoices, last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <TopClientsChart
            currency={byClient.currency}
            data={byClient.clients.map((c) => ({ clientName: c.clientName, value: c.cents / 100 }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
