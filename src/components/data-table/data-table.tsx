"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCsv } from "./csv";

// One table for every list in the app: search, dropdown filters, sortable
// columns, pagination and CSV export. Data arrives already access-checked from
// the server (a few hundred rows at most), so filtering happens in the browser.

export type DataTableFilter = {
  columnId: string;
  label: string;
  options: { label: string; value: string }[];
};

type DataTableProps<TData> = {
  // `any` here is TanStack's own recommendation for mixed column value types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  data: TData[];
  searchPlaceholder?: string;
  filters?: DataTableFilter[];
  initialSorting?: SortingState;
  pageSize?: number;
  emptyMessage?: string;
  /** Makes whole rows clickable (the first cell should also hold a real link). */
  rowHref?: (row: TData) => string;
  csvFileName?: string;
  toolbar?: React.ReactNode;
};

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Search…",
  filters = [],
  initialSorting = [],
  pageSize = 20,
  emptyMessage = "Nothing matches your filters.",
  rowHref,
  csvFileName,
  toolbar,
}: DataTableProps<TData>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // TanStack Table returns functions React can't memoize; the React Compiler
  // lint rule knows this and skips the component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative sm:w-64">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={globalFilter}
            onChange={(event) => {
              setGlobalFilter(event.target.value);
              table.setPageIndex(0);
            }}
            placeholder={searchPlaceholder}
            aria-label="Search"
            className="pl-8"
          />
        </div>
        {filters.map((filter) => {
          const column = table.getColumn(filter.columnId);
          const value = (column?.getFilterValue() as string | undefined) ?? "all";
          return (
            <Select
              key={filter.columnId}
              value={value}
              onValueChange={(next) => {
                column?.setFilterValue(next === "all" ? undefined : next);
                table.setPageIndex(0);
              }}
            >
              <SelectTrigger className="sm:w-44" aria-label={`Filter by ${filter.label.toLowerCase()}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })}
        <div className="flex gap-2 sm:ml-auto">
          {toolbar}
          {csvFileName && (
            <Button
              variant="outline"
              onClick={() => downloadCsv(csvFileName, table.getFilteredRowModel().rows)}
            >
              <DownloadIcon aria-hidden="true" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.className}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={rowHref ? "cursor-pointer" : undefined}
                  onClick={(event) => {
                    // Let real links and buttons inside the row do their own thing.
                    if (!rowHref || (event.target as HTMLElement).closest("a,button")) return;
                    router.push(rowHref(row.original));
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {filteredCount} {filteredCount === 1 ? "result" : "results"}
          {filteredCount !== data.length && ` of ${data.length}`}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <span>
              Page {pageIndex + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
