"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { ClientStatusBadge } from "@/components/status-badges";
import { formatMoney } from "@/lib/format";

export type ClientRow = {
  id: string;
  name: string;
  industry: string | null;
  country: string;
  city: string | null;
  currency: string;
  status: string;
  ownerName: string | null;
  activeProjects: number;
  outstandingCents: number | null;
};

const columns: ColumnDef<ClientRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Client" />,
    cell: ({ row }) => (
      <Link href={`/app/clients/${row.original.id}`} className="font-medium hover:text-primary">
        {row.original.name}
        <span className="block text-xs font-normal text-muted-foreground">{row.original.industry}</span>
      </Link>
    ),
    meta: { label: "Client" },
  },
  {
    id: "location",
    accessorFn: (row) => [row.city, row.country].filter(Boolean).join(", "),
    header: "Location",
    meta: { label: "Location", className: "hidden md:table-cell" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ClientStatusBadge status={row.original.status} />,
    filterFn: "equalsString",
    meta: { label: "Status" },
  },
  {
    accessorKey: "ownerName",
    header: "Account owner",
    meta: { label: "Account owner", className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "activeProjects",
    header: ({ column }) => <SortableHeader column={column} title="Active projects" className="ml-auto" />,
    meta: { label: "Active projects", className: "hidden text-right tabular-nums sm:table-cell" },
  },
  {
    accessorKey: "outstandingCents",
    header: ({ column }) => <SortableHeader column={column} title="Outstanding" className="ml-auto" />,
    cell: ({ row }) =>
      row.original.outstandingCents === null
        ? "—"
        : formatMoney(row.original.outstandingCents, row.original.currency),
    meta: {
      label: "Outstanding",
      className: "text-right tabular-nums",
      csv: (row) => (row.outstandingCents === null ? null : `${(row.outstandingCents / 100).toFixed(2)} ${row.currency}`),
    },
  },
];

export function ClientsTable({ clients, showBalances }: { clients: ClientRow[]; showBalances: boolean }) {
  return (
    <DataTable
      columns={showBalances ? columns : columns.filter((c) => c.meta?.label !== "Outstanding")}
      data={clients}
      searchPlaceholder="Search clients…"
      filters={[
        {
          columnId: "status",
          label: "Statuses",
          options: [
            { label: "Active", value: "active" },
            { label: "Paused", value: "paused" },
            { label: "Archived", value: "archived" },
          ],
        },
      ]}
      initialSorting={[{ id: "name", desc: false }]}
      rowHref={(row) => `/app/clients/${row.id}`}
      csvFileName="clients"
    />
  );
}
