"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export type ActivityRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: Date;
  actorName: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  "project.created": "Project created",
  "invoice.sent": "Invoice sent",
  "invoice.paid": "Invoice paid",
  "task.completed": "Task completed",
  "comment.created": "Comment",
  "file.uploaded": "File uploaded",
};

const linkFor = (row: ActivityRow) =>
  row.entityType === "invoice"
    ? `/app/invoices/${row.entityId}`
    : row.entityType === "project"
      ? `/app/projects/${row.entityId}`
      : null;

const columns: ColumnDef<ActivityRow>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeader column={column} title="When" />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDate(row.original.createdAt)}{" "}
        {row.original.createdAt.toISOString().slice(11, 16)}
      </span>
    ),
    sortingFn: "datetime",
    meta: { label: "When", csv: (row) => row.createdAt.toISOString() },
  },
  {
    accessorKey: "action",
    header: "Event",
    cell: ({ row }) => <Badge variant="secondary">{ACTION_LABELS[row.original.action] ?? row.original.action}</Badge>,
    filterFn: "equalsString",
    meta: { label: "Event", className: "hidden sm:table-cell" },
  },
  {
    accessorKey: "summary",
    header: "What happened",
    cell: ({ row }) => {
      const href = linkFor(row.original);
      return href ? (
        <Link href={href} className="hover:text-primary">
          {row.original.summary}
        </Link>
      ) : (
        row.original.summary
      );
    },
    meta: { label: "What happened" },
  },
  {
    accessorKey: "actorName",
    header: "Who",
    cell: ({ row }) => row.original.actorName ?? "System",
    meta: { label: "Who", className: "hidden md:table-cell" },
  },
];

export function ActivityTable({ entries }: { entries: ActivityRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={entries}
      searchPlaceholder="Search the activity log…"
      filters={[
        {
          columnId: "action",
          label: "Events",
          options: Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
        },
      ]}
      initialSorting={[{ id: "createdAt", desc: true }]}
      pageSize={25}
      csvFileName="activity-log"
    />
  );
}
