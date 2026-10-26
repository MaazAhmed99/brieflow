"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { StatusPill } from "@/components/status-badges";
import { formatRelative } from "@/lib/format";

export type TicketRow = {
  id: string;
  number: number;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  clientName: string;
  assigneeName: string | null;
};

const statusColor = { open: "blue", pending: "amber", resolved: "green", closed: "gray" } as const;
const priorityColor = { low: "gray", normal: "gray", high: "amber", urgent: "red" } as const;
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function TicketsTable({ tickets, showClient }: { tickets: TicketRow[]; showClient: boolean }) {
  const columns: ColumnDef<TicketRow>[] = [
    {
      accessorKey: "number",
      header: ({ column }) => <SortableHeader column={column} title="#" />,
      cell: ({ row }) => <span className="text-muted-foreground tabular-nums">#{row.original.number}</span>,
      meta: { label: "Ticket" },
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <span>
          <span className="font-medium">{row.original.subject}</span>
          {showClient && <span className="block text-xs text-muted-foreground">{row.original.clientName}</span>}
        </span>
      ),
      meta: { label: "Subject" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusPill color={statusColor[row.original.status as keyof typeof statusColor] ?? "gray"}>
          {label(row.original.status)}
        </StatusPill>
      ),
      filterFn: "equalsString",
      meta: { label: "Status" },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <StatusPill color={priorityColor[row.original.priority as keyof typeof priorityColor] ?? "gray"}>
          {label(row.original.priority)}
        </StatusPill>
      ),
      filterFn: "equalsString",
      meta: { label: "Priority", className: "hidden sm:table-cell" },
    },
    {
      accessorKey: "assigneeName",
      header: "Assignee",
      meta: { label: "Assignee", className: "hidden lg:table-cell" },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableHeader column={column} title="Updated" />,
      // "3 hours ago" can tick over between server and browser render.
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground" suppressHydrationWarning>
          {formatRelative(row.original.updatedAt)}
        </span>
      ),
      sortingFn: "datetime",
      meta: { label: "Updated", className: "hidden md:table-cell", csv: (row) => row.updatedAt.toISOString() },
    },
  ];

  return (
    <DataTable
      columns={showClient ? columns : columns.filter((c) => c.meta?.label !== "Assignee")}
      data={tickets}
      searchPlaceholder="Search tickets…"
      filters={[
        {
          columnId: "status",
          label: "Statuses",
          options: ["open", "pending", "resolved", "closed"].map((value) => ({ value, label: label(value) })),
        },
        {
          columnId: "priority",
          label: "Priorities",
          options: ["low", "normal", "high", "urgent"].map((value) => ({ value, label: label(value) })),
        },
      ]}
      initialSorting={[{ id: "updatedAt", desc: true }]}
      csvFileName={showClient ? "tickets" : undefined}
    />
  );
}
