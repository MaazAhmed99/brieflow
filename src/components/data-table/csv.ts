import type { Row } from "@tanstack/react-table";

// Exports the rows currently shown (after search and filters) as a CSV file.
// Each column can set meta.csv to control its exported value; otherwise the
// raw cell value is used. Columns with meta.csv === false are skipped.

function escape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv<TData>(fileName: string, rows: Row<TData>[]) {
  if (rows.length === 0) return;
  const columns = rows[0]
    .getAllCells()
    .map((cell) => cell.column)
    .filter((column) => column.columnDef.meta?.csv !== false);

  const header = columns.map((column) => escape(column.columnDef.meta?.label ?? column.id));
  const lines = rows.map((row) =>
    columns
      .map((column) => {
        const csv = column.columnDef.meta?.csv;
        return escape(typeof csv === "function" ? csv(row.original) : row.getValue(column.id));
      })
      .join(","),
  );

  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
