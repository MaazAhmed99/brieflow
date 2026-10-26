"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { formatDate } from "@/lib/format";

export type TimeRow = {
  id: string;
  workedOn: string;
  minutes: number;
  billable: boolean;
  note: string | null;
  personName: string;
  projectName: string;
};

const hours = (minutes: number) => (minutes / 60).toFixed(1);

const columns: ColumnDef<TimeRow>[] = [
  {
    accessorKey: "workedOn",
    header: ({ column }) => <SortableHeader column={column} title="Date" />,
    cell: ({ row }) => formatDate(row.original.workedOn),
    meta: { label: "Date" },
  },
  { accessorKey: "personName", header: "Person", meta: { label: "Person" } },
  {
    accessorKey: "projectName",
    header: "Project",
    meta: { label: "Project", className: "hidden md:table-cell" },
  },
  {
    accessorKey: "note",
    header: "Note",
    cell: ({ row }) => row.original.note ?? <span className="text-muted-foreground">—</span>,
    meta: { label: "Note", className: "hidden lg:table-cell" },
  },
  {
    id: "billable",
    accessorFn: (row) => (row.billable ? "billable" : "non-billable"),
    header: "Type",
    cell: ({ row }) => (row.original.billable ? "Billable" : "Non-billable"),
    filterFn: "equalsString",
    meta: { label: "Type", className: "hidden sm:table-cell" },
  },
  {
    accessorKey: "minutes",
    header: ({ column }) => <SortableHeader column={column} title="Hours" className="ml-auto" />,
    cell: ({ row }) => hours(row.original.minutes),
    meta: { label: "Hours", className: "text-right tabular-nums", csv: (row) => hours(row.minutes) },
  },
];

export function TimeTable({ entries }: { entries: TimeRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={entries}
      searchPlaceholder="Search people, projects or notes…"
      filters={[
        {
          columnId: "billable",
          label: "Types",
          options: [
            { label: "Billable", value: "billable" },
            { label: "Non-billable", value: "non-billable" },
          ],
        },
      ]}
      initialSorting={[{ id: "workedOn", desc: true }]}
      csvFileName="timesheets"
    />
  );
}
