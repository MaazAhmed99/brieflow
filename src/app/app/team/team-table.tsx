"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export type TeamRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  startedOn: string | null;
};

const columns: ColumnDef<TeamRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <span>
        <span className="font-medium">{row.original.name}</span>
        <span className="block text-xs text-muted-foreground">{row.original.email}</span>
      </span>
    ),
    meta: { label: "Name" },
  },
  { accessorKey: "jobTitle", header: "Job title", meta: { label: "Job title", className: "hidden md:table-cell" } },
  {
    accessorKey: "department",
    header: ({ column }) => <SortableHeader column={column} title="Department" />,
    filterFn: "equalsString",
    meta: { label: "Department", className: "hidden lg:table-cell" },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>{row.original.roleLabel}</Badge>,
    filterFn: "equalsString",
    meta: { label: "Role", csv: (row) => row.roleLabel },
  },
  { accessorKey: "location", header: "Location", meta: { label: "Location", className: "hidden xl:table-cell" } },
  {
    accessorKey: "startedOn",
    header: ({ column }) => <SortableHeader column={column} title="Started" />,
    cell: ({ row }) => formatDate(row.original.startedOn),
    meta: { label: "Started", className: "hidden sm:table-cell" },
  },
];

export function TeamTable({ people, departments }: { people: TeamRow[]; departments: string[] }) {
  return (
    <DataTable
      columns={columns}
      data={people}
      searchPlaceholder="Search people…"
      filters={[
        { columnId: "department", label: "Departments", options: departments.map((d) => ({ label: d, value: d })) },
        {
          columnId: "role",
          label: "Roles",
          options: [
            { label: "Admin", value: "admin" },
            { label: "Manager", value: "manager" },
            { label: "Accountant", value: "accountant" },
            { label: "Staff", value: "staff" },
          ],
        },
      ]}
      initialSorting={[{ id: "name", desc: false }]}
      csvFileName="team"
    />
  );
}
