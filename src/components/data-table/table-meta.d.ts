import "@tanstack/react-table";

// Extra per-column settings our DataTable understands.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Classes for both the header and body cells (alignment, width, hiding on mobile). */
    className?: string;
    /** Column title used in CSV exports. */
    label?: string;
    /** Value written to CSV exports, or false to leave the column out. */
    csv?: false | ((row: TData) => string | number | null);
  }
}
