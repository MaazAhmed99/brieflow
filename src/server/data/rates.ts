import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import { db } from "@/server/db/client";
import { exchangeRates } from "@/server/db/schema";

// Converts invoice totals into the organization's base currency using the
// latest stored rates (USD-based). Rates come from Frankfurter once the daily
// refresh runs; until then they are the seed's fixed demo rates, and `source`
// says which, so the UI can label them honestly.

export async function getCurrencyConverter(viewer: Pick<Viewer, "baseCurrency">) {
  const rows = await db
    .select()
    .from(exchangeRates)
    .where(eq(exchangeRates.base, "USD"))
    .orderBy(desc(exchangeRates.rateDate));

  // Units of each currency per 1 USD, keeping only the newest rate per currency.
  const perUsd = new Map<string, number>([["USD", 1]]);
  for (const row of rows) if (!perUsd.has(row.quote)) perUsd.set(row.quote, row.rate);

  const toBase = (cents: number, currency: string) => {
    const from = perUsd.get(currency);
    const to = perUsd.get(viewer.baseCurrency);
    if (!from || !to) return cents; // unknown currency: leave as is
    return Math.round((cents / from) * to);
  };

  return {
    toBase,
    baseCurrency: viewer.baseCurrency,
    source: rows[0]?.source ?? "static",
    rateDate: rows[0]?.rateDate ?? null,
  };
}
