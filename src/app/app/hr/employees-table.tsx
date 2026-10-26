"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@/components/data-table/column-header";
import { DataTable } from "@/components/data-table/data-table";
import { formatDate } from "@/lib/format";

export type EmployeeRow = {
  id: string;
  name: string;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  startedOn: string | null;
};

const columns: ColumnDef<EmployeeRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <span>
        <span className="font-medium">{row.original.name}</span>
        <span className="block text-xs text-muted-foreground">{row.original.jobTitle}</span>
      </span>
    ),
    meta: { label: "Name" },
  },
  {
    accessorKey: "department",
    header: "Department",
    filterFn: "equalsString",
    meta: { label: "Department", className: "hidden sm:table-cell" },
  },
  { accessorKey: "location", header: "Location", meta: { label: "Location", className: "hidden md:table-cell" } },
  {
    accessorKey: "startedOn",
    header: ({ column }) => <SortableHeader column={column} title="Started" />,
    cell: ({ row }) => formatDate(row.original.startedOn),
    meta: { label: "Started" },
  },
];

export function EmployeesTable({ employees, departments }: { employees: EmployeeRow[]; departments: string[] }) {
  return (
    <DataTable
      columns={columns}
      data={employees}
      searchPlaceholder="Search the directory…"
      filters={[{ columnId: "department", label: "Departments", options: departments.map((d) => ({ label: d, value: d })) }]}
      initialSorting={[{ id: "name", desc: false }]}
      pageSize={15}
      csvFileName="employees"
    />
  );
}
