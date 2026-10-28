import "server-only";
import { del, list } from "@vercel/blob";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/server/db/client";
import { resetDatabase, seedDatabase } from "@/server/db/seed/seed";
import { refreshExchangeRates } from "@/server/integrations/exchange-rates";

// Restores the demo: sample data back to the seed, files visitors uploaded
// that day deleted, and today's exchange rates fetched.
export async function resetDemo(demoPassword: string) {
  const started = Date.now();
  const passwordHash = await hashPassword(demoPassword);
  // One transaction: visitors never see a half-empty demo.
  const counts = await db.transaction(async (tx) => {
    await resetDatabase(tx);
    return seedDatabase(tx, { passwordHash });
  });

  // Uploaded files live under projects/ in Vercel Blob; the seed's sample files are static.
  let deletedFiles = 0;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: "projects/", cursor, limit: 1000 });
      if (page.blobs.length) await del(page.blobs.map((blob) => blob.url));
      deletedFiles += page.blobs.length;
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }

  // Best effort: if Frankfurter is down, the fixed demo rates from the seed stay.
  const rates = await refreshExchangeRates(db).catch((error: Error) => ({ error: error.message }));

  return {
    seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    rows: Object.values(counts).reduce((sum, n) => sum + n, 0),
    deletedFiles,
    rates,
  };
}
