import "server-only";

// Public holidays from Nager.Date (https://date.nager.at): a free API with no
// key. Responses are cached for a day by Next.js, so the page makes at most one
// request per country per year per day.

export type PublicHoliday = { date: string; localName: string; name: string };

type NagerHoliday = PublicHoliday & { global: boolean; counties: string[] | null };

/**
 * Holidays for a country, or for one region of it: pass `region` (an ISO
 * 3166-2 code such as "GB-ENG") to drop holidays that only apply elsewhere.
 */
export async function getPublicHolidays(
  countryCode: string,
  year: number,
  region?: string,
): Promise<PublicHoliday[] | null> {
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const holidays = (await response.json()) as NagerHoliday[];
    return holidays
      .filter((h) => !region || h.global || h.counties?.includes(region))
      .map(({ date, localName, name }) => ({ date, localName, name }));
  } catch {
    // Offline or the API is down: the page says so instead of failing.
    return null;
  }
}
