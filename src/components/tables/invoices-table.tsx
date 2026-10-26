"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { InvoiceStatusBadge } from "@/components/status-badges";
import { formatDate, formatMoney, isOverdue } from "@/lib/format";

export type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  paidAt: Date | string | null;
  clientId: string;
  clientName: string;
  projectName: string | null;
};

// "Overdue" isn't stored, so the filter works on a derived value.
const displayStatus = (row: InvoiceRow) => (isOverdue(row) ? "overdue" : row.status);

const columns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: "number",
    header: ({ column }) => <SortableHeader column={column} title="Invoice" />,
    cell: ({ row }) => (
      <Link href={`/app/invoices/${row.original.id}`} className="font-medium hover:text-primary">
        {row.original.number}
      </Link>
    ),
    meta: { label: "Invoice" },
  },
  {
    accessorKey: "clientName",
    header: ({ column }) => <SortableHeader column={column} title="Client" />,
    cell: ({ row }) => (
      <span>
        {row.original.clientName}
        {row.original.projectName && (
          <span className="block text-xs text-muted-foreground">{row.original.projectName}</span>
        )}
      </span>
    ),
    meta: { label: "Client" },
  },
  {
    id: "status",
    accessorFn: displayStatus,
    header: "Status",
    cell: ({ row }) => <InvoiceStatusBadge invoice={row.original} />,
    filterFn: "equalsString",
    meta: { label: "Status" },
  },
  {
    accessorKey: "issueDate",
    header: ({ column }) => <SortableHeader column={column} title="Issued" />,
    cell: ({ row }) => formatDate(row.original.issueDate),
    meta: { label: "Issued", className: "hidden md:table-cell" },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => <SortableHeader column={column} title="Due" />,
    cell: ({ row }) => formatDate(row.original.dueDate),
    meta: { label: "Due", className: "hidden sm:table-cell" },
  },
  {
    accessorKey: "totalCents",
    header: ({ column }) => <SortableHeader column={column} title="Total" className="ml-auto" />,
    cell: ({ row }) => formatMoney(row.original.totalCents, row.original.currency),
    meta: {
      label: "Total",
      className: "text-right tabular-nums",
      csv: (row) => `${(row.totalCents / 100).toFixed(2)} ${row.currency}`,
    },
  },
];

export const INVOICE_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Open", value: "sent" },
  { label: "Overdue", value: "overdue" },
  { label: "Paid", value: "paid" },
  { label: "Void", value: "void" },
];

export function InvoicesTable({
  invoices,
  compact = false,
}: {
  invoices: InvoiceRow[];
  compact?: boolean;
}) {
  return (
    <DataTable
      columns={compact ? columns.filter((c) => c.meta?.label !== "Client") : columns}
      data={invoices}
      searchPlaceholder="Search invoices or clients…"
      filters={[{ columnId: "status", label: "Statuses", options: INVOICE_STATUS_OPTIONS }]}
      initialSorting={[{ id: "issueDate", desc: true }]}
      pageSize={compact ? 5 : 20}
      rowHref={(row) => `/app/invoices/${row.id}`}
      csvFileName={compact ? undefined : "invoices"}
    />
  );
}
