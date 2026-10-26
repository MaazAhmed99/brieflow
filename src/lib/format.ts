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

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 hours ago", "yesterday", "2 weeks ago"; older than a month falls back to the date. */
export function formatRelative(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = (date.getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86_400],
    ["week", 604_800],
  ];
  if (Math.abs(seconds) < 60) return "just now";
  if (Math.abs(seconds) >= 2_592_000) return formatDate(date);
  const [unit, size] = [...steps].reverse().find(([, s]) => Math.abs(seconds) >= s)!;
  return relativeFormat.format(Math.round(seconds / size), unit);
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
