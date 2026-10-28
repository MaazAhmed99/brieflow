import { sql } from "drizzle-orm";
import type { SeedDb } from "@/server/db/seed/seed";
import { exchangeRates } from "@/server/db/schema";

// Daily exchange rates from Frankfurter (https://frankfurter.dev): a free API
// with no key that publishes the European Central Bank's reference rates.
// Stored per day; the UI labels which rates it used. Takes the database as a
// parameter so both the nightly reset and the seed script can call it.

const QUOTES = ["GBP", "EUR"];

export async function refreshExchangeRates(db: SeedDb, fetcher: typeof fetch = fetch) {
  const response = await fetcher(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${QUOTES.join(",")}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Frankfurter returned ${response.status}`);
  const data = (await response.json()) as { date: string; rates: Record<string, number> };

  const rows = QUOTES.filter((quote) => typeof data.rates[quote] === "number").map((quote) => ({
    rateDate: data.date,
    base: "USD",
    quote,
    rate: data.rates[quote],
    source: "frankfurter",
  }));
  if (rows.length === 0) throw new Error("Frankfurter returned no rates");

  await db
    .insert(exchangeRates)
    .values(rows)
    .onConflictDoUpdate({
      target: [exchangeRates.rateDate, exchangeRates.base, exchangeRates.quote],
      set: { rate: sql`excluded.rate`, source: sql`excluded.source` },
    });
  return { date: data.date, rates: Object.fromEntries(rows.map((r) => [r.quote, r.rate])) };
}
