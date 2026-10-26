import { CalendarPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ComingSoonButton, PreviewNotice } from "@/components/preview-notice";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, todayIso } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { listEmployees, listUpcomingLeave } from "@/server/data/preview";
import { getPublicHolidays } from "@/server/integrations/holidays";
import { EmployeesTable } from "./employees-table";

export const metadata: Metadata = { title: "HR" };

const leaveLabel = { annual: "Annual leave", sick: "Sick leave", unpaid: "Unpaid leave", parental: "Parental leave" } as const;
const leaveColor = { pending: "amber", approved: "green", rejected: "red" } as const;

export default async function HrPage() {
  const viewer = await requirePermission("hr:read");
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const [employees, leave, holidaysThisYear, holidaysNextYear] = await Promise.all([
    listEmployees(viewer),
    listUpcomingLeave(viewer),
    getPublicHolidays("GB", year, "GB-ENG"),
    getPublicHolidays("GB", year + 1, "GB-ENG"),
  ]);
  const holidays =
    holidaysThisYear && holidaysNextYear
      ? [...holidaysThisYear, ...holidaysNextYear].filter((h) => h.date >= today).slice(0, 6)
      : null;
  const offToday = leave.filter((l) => l.status === "approved" && l.startDate <= today && l.endDate >= today);
  const departments = [...new Set(employees.map((e) => e.department).filter((d): d is string => Boolean(d)))].sort();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="HR"
        description="Employee directory and leave calendar."
        preview
        actions={
          <ComingSoonButton reason="Requesting and approving leave arrives after v1.">
            <CalendarPlusIcon aria-hidden="true" /> Request leave
          </ComingSoonButton>
        }
      />
      <PreviewNotice coming="leave requests and approvals, leave balances, and onboarding checklists" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Employees" value={employees.length} hint={`${departments.length} departments`} />
        <StatCard label="Off today" value={offToday.length} />
        <StatCard label="Leave awaiting approval" value={leave.filter((l) => l.status === "pending").length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EmployeesTable employees={employees} departments={departments} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming leave</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {leave.slice(0, 8).map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{entry.personName}</span>
                      <StatusPill color={leaveColor[entry.status]}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </StatusPill>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {leaveLabel[entry.type]} · {formatDate(entry.startDate)} – {formatDate(entry.endDate)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Public holidays</CardTitle>
              <CardDescription>England · live from the Nager.Date API</CardDescription>
            </CardHeader>
            <CardContent>
              {holidays === null ? (
                <p className="text-sm text-muted-foreground">Couldn&apos;t reach the holidays API just now.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {holidays.map((holiday) => (
                    <li key={`${holiday.date}-${holiday.name}`} className="flex justify-between gap-3">
                      <span>{holiday.localName}</span>
                      <span className="shrink-0 text-muted-foreground">{formatDate(holiday.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
