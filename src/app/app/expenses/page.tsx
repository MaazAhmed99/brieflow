import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ComingSoonButton, PreviewNotice } from "@/components/preview-notice";
import { StatCard } from "@/components/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, isoDaysFromToday } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { listExpenses, listPurchaseOrders } from "@/server/data/preview";
import { ExpensesTable, PurchaseOrdersTable } from "./expense-tables";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const viewer = await requirePermission("finance:read");
  const [expenses, orders] = await Promise.all([listExpenses(viewer), listPurchaseOrders(viewer)]);
  const since = isoDaysFromToday(-30);
  const last30 = expenses.filter((e) => e.spentOn >= since && e.status !== "rejected");
  const awaiting = expenses.filter((e) => e.status === "submitted");
  const sum = (rows: typeof expenses) => rows.reduce((total, e) => total + e.amountCents, 0);
  const categories = [...new Set(expenses.map((e) => e.category))].sort();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Expenses"
        description="Expenses, vendors and purchase orders."
        preview
        actions={
          <ComingSoonButton reason="Submitting expenses with receipts arrives after v1.">
            <PlusIcon aria-hidden="true" /> Add expense
          </ComingSoonButton>
        }
      />
      <PreviewNotice coming="submitting expenses with receipt photos, approvals, and re-billing project costs to clients" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Spent, last 30 days" value={formatMoney(sum(last30), viewer.baseCurrency)} hint={`${last30.length} expenses`} />
        <StatCard label="Awaiting approval" value={awaiting.length} hint={formatMoney(sum(awaiting), viewer.baseCurrency)} />
        <StatCard label="Open purchase orders" value={orders.filter((o) => o.status === "issued").length} />
      </div>
      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="orders">Purchase orders</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="mt-4">
          <ExpensesTable expenses={expenses} categories={categories} />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <PurchaseOrdersTable orders={orders} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
