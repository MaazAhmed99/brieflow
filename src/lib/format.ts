// Display formatting shared by every page. Dates are stored as ISO strings
// (YYYY-MM-DD) or timestamps and shown like "24 Oct 2026".

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return dateFormat.format(typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value);
}

export function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** Today as YYYY-MM-DD in UTC, to compare with date columns. */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** The date `days` from today as YYYY-MM-DD (negative for the past). */
export function isoDaysFromToday(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function isOverdue(invoice: { status: string; dueDate: string }) {
  return invoice.status === "sent" && invoice.dueDate < todayIso();
}
