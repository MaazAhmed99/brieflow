"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { HealthBadge, ProjectStatusBadge } from "@/components/status-badges";
import { formatDate, formatMoney } from "@/lib/format";

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  health: string;
  budgetCents: number | null;
  currency: string;
  startDate: string | null;
  dueDate: string | null;
  clientId: string;
  clientName: string;
};

const columns: ColumnDef<ProjectRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Project" />,
    cell: ({ row }) => (
      <Link href={`/app/projects/${row.original.id}`} className="font-medium hover:text-primary">
        {row.original.name}
        <span className="block text-xs font-normal text-muted-foreground">{row.original.code}</span>
      </Link>
    ),
    meta: { label: "Project" },
  },
  {
    accessorKey: "clientName",
    header: ({ column }) => <SortableHeader column={column} title="Client" />,
    meta: { label: "Client", className: "hidden md:table-cell" },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <ProjectStatusBadge status={row.original.status} />,
    filterFn: "equalsString",
    meta: { label: "Status" },
  },
  {
    accessorKey: "health",
    header: "Health",
    cell: ({ row }) =>
      row.original.status === "active" ? <HealthBadge health={row.original.health} /> : <span className="text-muted-foreground">—</span>,
    filterFn: "equalsString",
    meta: { label: "Health", className: "hidden sm:table-cell" },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => <SortableHeader column={column} title="Due" />,
    cell: ({ row }) => formatDate(row.original.dueDate),
    meta: { label: "Due", className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "budgetCents",
    header: ({ column }) => <SortableHeader column={column} title="Budget" className="ml-auto" />,
    cell: ({ row }) =>
      row.original.budgetCents === null ? "—" : formatMoney(row.original.budgetCents, row.original.currency),
    meta: {
      label: "Budget",
      className: "hidden text-right tabular-nums lg:table-cell",
      csv: (row) => (row.budgetCents === null ? null : row.budgetCents / 100),
    },
  },
];

export const PROJECT_STATUS_OPTIONS = [
  { label: "Planned", value: "planned" },
  { label: "Active", value: "active" },
  { label: "On hold", value: "on_hold" },
  { label: "Completed", value: "completed" },
];

export function ProjectsTable({
  projects,
  compact = false,
}: {
  projects: ProjectRow[];
  compact?: boolean;
}) {
  return (
    <DataTable
      columns={compact ? columns.filter((c) => c.meta?.label !== "Client") : columns}
      data={projects}
      searchPlaceholder="Search projects or clients…"
      filters={[
        { columnId: "status", label: "Statuses", options: PROJECT_STATUS_OPTIONS },
        ...(compact
          ? []
          : [
              {
                columnId: "health",
                label: "Health",
                options: [
                  { label: "On track", value: "on_track" },
                  { label: "At risk", value: "at_risk" },
                  { label: "Off track", value: "off_track" },
                ],
              },
            ]),
      ]}
      initialSorting={[{ id: "dueDate", desc: false }]}
      pageSize={compact ? 5 : 20}
      rowHref={(row) => `/app/projects/${row.id}`}
      csvFileName={compact ? undefined : "projects"}
    />
  );
}
