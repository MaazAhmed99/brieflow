"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { StatusPill } from "@/components/status-badges";
import { formatDate, formatMoney } from "@/lib/format";

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export type ExpenseRow = {
  id: string;
  spentOn: string;
  category: string;
  description: string;
  amountCents: number;
  currency: string;
  status: string;
  vendorName: string | null;
  projectName: string | null;
  submittedBy: string | null;
};

const expenseStatusColor = { submitted: "blue", approved: "green", rejected: "red", reimbursed: "gray" } as const;

const expenseColumns: ColumnDef<ExpenseRow>[] = [
  {
    accessorKey: "spentOn",
    header: ({ column }) => <SortableHeader column={column} title="Date" />,
    cell: ({ row }) => formatDate(row.original.spentOn),
    meta: { label: "Date" },
  },
  {
    accessorKey: "description",
    header: "Expense",
    cell: ({ row }) => (
      <span>
        <span className="font-medium">{row.original.description}</span>
        <span className="block text-xs text-muted-foreground">{row.original.vendorName}</span>
      </span>
    ),
    meta: { label: "Expense" },
  },
  {
    accessorKey: "category",
    header: "Category",
    filterFn: "equalsString",
    meta: { label: "Category", className: "hidden md:table-cell" },
  },
  {
    accessorKey: "projectName",
    header: "Project",
    cell: ({ row }) => row.original.projectName ?? <span className="text-muted-foreground">Overhead</span>,
    meta: { label: "Project", className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusPill color={expenseStatusColor[row.original.status as keyof typeof expenseStatusColor] ?? "gray"}>
        {label(row.original.status)}
      </StatusPill>
    ),
    filterFn: "equalsString",
    meta: { label: "Status", className: "hidden sm:table-cell" },
  },
  {
    accessorKey: "amountCents",
    header: ({ column }) => <SortableHeader column={column} title="Amount" className="ml-auto" />,
    cell: ({ row }) => formatMoney(row.original.amountCents, row.original.currency),
    meta: { label: "Amount", className: "text-right tabular-nums", csv: (row) => (row.amountCents / 100).toFixed(2) },
  },
];

export function ExpensesTable({ expenses, categories }: { expenses: ExpenseRow[]; categories: string[] }) {
  return (
    <DataTable
      columns={expenseColumns}
      data={expenses}
      searchPlaceholder="Search expenses or vendors…"
      filters={[
        { columnId: "category", label: "Categories", options: categories.map((c) => ({ label: c, value: c })) },
        {
          columnId: "status",
          label: "Statuses",
          options: ["submitted", "approved", "rejected", "reimbursed"].map((value) => ({ value, label: label(value) })),
        },
      ]}
      initialSorting={[{ id: "spentOn", desc: true }]}
      csvFileName="expenses"
    />
  );
}

export type PurchaseOrderRow = {
  id: string;
  number: string;
  status: string;
  totalCents: number;
  currency: string;
  issuedOn: string;
  vendorName: string;
  vendorCategory: string;
};

const poStatusColor = { draft: "gray", issued: "blue", received: "green", closed: "gray" } as const;

const poColumns: ColumnDef<PurchaseOrderRow>[] = [
  { accessorKey: "number", header: ({ column }) => <SortableHeader column={column} title="PO" />, meta: { label: "PO" } },
  {
    accessorKey: "vendorName",
    header: "Vendor",
    cell: ({ row }) => (
      <span>
        <span className="font-medium">{row.original.vendorName}</span>
        <span className="block text-xs text-muted-foreground">{row.original.vendorCategory}</span>
      </span>
    ),
    meta: { label: "Vendor" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusPill color={poStatusColor[row.original.status as keyof typeof poStatusColor] ?? "gray"}>
        {label(row.original.status)}
      </StatusPill>
    ),
    filterFn: "equalsString",
    meta: { label: "Status" },
  },
  {
    accessorKey: "issuedOn",
    header: ({ column }) => <SortableHeader column={column} title="Issued" />,
    cell: ({ row }) => formatDate(row.original.issuedOn),
    meta: { label: "Issued", className: "hidden sm:table-cell" },
  },
  {
    accessorKey: "totalCents",
    header: ({ column }) => <SortableHeader column={column} title="Total" className="ml-auto" />,
    cell: ({ row }) => formatMoney(row.original.totalCents, row.original.currency),
    meta: { label: "Total", className: "text-right tabular-nums", csv: (row) => (row.totalCents / 100).toFixed(2) },
  },
];

export function PurchaseOrdersTable({ orders }: { orders: PurchaseOrderRow[] }) {
  return (
    <DataTable
      columns={poColumns}
      data={orders}
      searchPlaceholder="Search purchase orders or vendors…"
      filters={[
        {
          columnId: "status",
          label: "Statuses",
          options: ["draft", "issued", "received", "closed"].map((value) => ({ value, label: label(value) })),
        },
      ]}
      initialSorting={[{ id: "issuedOn", desc: true }]}
      csvFileName="purchase-orders"
    />
  );
}
