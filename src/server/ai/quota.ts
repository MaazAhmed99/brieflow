import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { todayIso } from "@/lib/format";
import type { Viewer } from "@/server/auth/viewer";
import { db } from "@/server/db/client";
import { aiUsage } from "@/server/db/schema";

// Daily limits that keep the assistant inside the providers' free tiers.
// Counted in Postgres (ai_usage), so the limit holds across every server
// instance. Each request is counted when it starts, before calling the model.

const PER_USER_DAILY = Number(process.env.AI_DAILY_LIMIT_PER_USER ?? 25);
const GLOBAL_DAILY = Number(process.env.AI_DAILY_LIMIT_GLOBAL ?? 800);

export type QuotaResult = { ok: true; remaining: number } | { ok: false; reason: "user" | "global" };

export async function claimAssistantRequest(viewer: Viewer): Promise<QuotaResult> {
  const today = todayIso();
  const [global] = await db
    .select({ total: sql<number>`coalesce(sum(${aiUsage.requests}), 0)`.mapWith(Number) })
    .from(aiUsage)
    .where(eq(aiUsage.usageDate, today));
  if (global.total >= GLOBAL_DAILY) return { ok: false, reason: "global" };

  const [mine] = await db
    .insert(aiUsage)
    .values({ organizationId: viewer.organizationId, userId: viewer.userId, usageDate: today, requests: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.usageDate],
      set: { requests: sql`${aiUsage.requests} + 1` },
    })
    .returning({ requests: aiUsage.requests });

  if (mine.requests > PER_USER_DAILY) {
    // Over the limit: give the claim back so the count stays accurate.
    await db
      .update(aiUsage)
      .set({ requests: sql`${aiUsage.requests} - 1` })
      .where(and(eq(aiUsage.userId, viewer.userId), eq(aiUsage.usageDate, today)));
    return { ok: false, reason: "user" };
  }
  return { ok: true, remaining: PER_USER_DAILY - mine.requests };
}

export async function recordAssistantTokens(viewer: Viewer, inputTokens: number, outputTokens: number) {
  await db
    .update(aiUsage)
    .set({
      inputTokens: sql`${aiUsage.inputTokens} + ${inputTokens}`,
      outputTokens: sql`${aiUsage.outputTokens} + ${outputTokens}`,
    })
    .where(and(eq(aiUsage.userId, viewer.userId), eq(aiUsage.usageDate, todayIso())));
}
