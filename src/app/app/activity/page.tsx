import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/server/auth/viewer";
import { listActivity } from "@/server/data/team";
import { ActivityTable } from "./activity-table";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const viewer = await requirePermission("activity:read");
  const entries = await listActivity(viewer);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Activity"
        description="Audit log of every change: who did what, and when. Showing the latest 500 events."
      />
      <ActivityTable entries={entries} />
    </div>
  );
}
