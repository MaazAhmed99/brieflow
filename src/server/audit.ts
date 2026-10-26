import "server-only";
import type { Viewer } from "@/server/auth/viewer";
import type { Db } from "@/server/db/client";
import { activityLog } from "@/server/db/schema";

// Every change writes one audit-log row. Pass the transaction, so the log entry
// is saved together with the change or not at all.

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function recordActivity(
  tx: Tx,
  viewer: Pick<Viewer, "userId" | "organizationId">,
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.insert(activityLog).values({
    organizationId: viewer.organizationId,
    actorId: viewer.userId,
    ...entry,
  });
}
