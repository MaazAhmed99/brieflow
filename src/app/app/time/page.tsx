import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ComingSoonButton, PreviewNotice } from "@/components/preview-notice";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { isoDaysFromToday } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { listTimeEntries } from "@/server/data/preview";
import { TimeTable } from "./time-table";

export const metadata: Metadata = { title: "Time tracking" };

// A full working week, used to show utilization.
const WEEK_HOURS = 37.5;

export default async function TimePage() {
  const viewer = await requirePermission("time:read");
  const entries = await listTimeEntries(viewer, 28);
  // Today plus the six days before it: seven calendar days, at most five working days.
  const weekStart = isoDaysFromToday(-6);
  const lastWeek = entries.filter((e) => e.workedOn >= weekStart);
  const totalHours = (rows: typeof entries) => rows.reduce((sum, e) => sum + e.minutes, 0) / 60;
  const billableShare = (rows: typeof entries) =>
    rows.length ? Math.round((rows.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0) / rows.reduce((s, e) => s + e.minutes, 0)) * 100) : 0;

  // Hours per person over the last 7 days, busiest first.
  const byPerson = [...lastWeek.reduce((map, e) => map.set(e.personName, (map.get(e.personName) ?? 0) + e.minutes / 60), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Time tracking"
        description="Timesheets and team utilization, last 4 weeks."
        preview
        actions={
          <ComingSoonButton reason="Logging time arrives after v1.">
            <PlusIcon aria-hidden="true" /> Log time
          </ComingSoonButton>
        }
      />
      <PreviewNotice coming="logging time from a timer or timesheet, and billing hours straight onto invoices" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hours, last 7 days" value={totalHours(lastWeek).toFixed(0)} />
        <StatCard label="Billable share" value={`${billableShare(lastWeek)}%`} hint="Last 7 days" />
        <StatCard label="Hours, last 4 weeks" value={totalHours(entries).toFixed(0)} hint={`${entries.length} entries`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Utilization, last 7 days</CardTitle>
            <CardDescription>Logged hours against a {WEEK_HOURS}-hour week</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {byPerson.map(([name, hoursLogged]) => {
                const percent = Math.min(100, Math.round((hoursLogged / WEEK_HOURS) * 100));
                return (
                  <li key={name} className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{name}</span>
                      <span className="text-muted-foreground tabular-nums">{hoursLogged.toFixed(1)} h · {percent}%</span>
                    </div>
                    <Progress value={percent} aria-label={`${name}: ${percent}% utilized`} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <TimeTable entries={entries} />
        </div>
      </div>
    </div>
  );
}
