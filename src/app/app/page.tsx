import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { HealthBadge } from "@/components/status-badges";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, formatRelative, isoDaysFromToday, isOverdue, todayIso } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { can, ROLE_LABELS } from "@/server/authz/permissions";
import { getMyOpenTasks, getRecentActivity, getRevenueByMonth } from "@/server/data/dashboard";
import { listInvoices } from "@/server/data/invoices";
import { listProjects } from "@/server/data/projects";
import { getCurrencyConverter } from "@/server/data/rates";

export const metadata: Metadata = { title: "Dashboard" };

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

function ViewAll({ href }: { href: string }) {
  return (
    <CardAction>
      <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        View all <ArrowRightIcon className="size-3.5" aria-hidden="true" />
      </Link>
    </CardAction>
  );
}

export default async function DashboardPage() {
  const viewer = await requirePermission("dashboard:view");
  const seesFinance = can(viewer, "finance:read");
  const today = todayIso();

  const [projects, invoices, revenue, myTasks, activity, fx] = await Promise.all([
    listProjects(viewer),
    seesFinance ? listInvoices(viewer) : Promise.resolve(null),
    seesFinance ? getRevenueByMonth(viewer) : Promise.resolve(null),
    getMyOpenTasks(viewer),
    can(viewer, "activity:read") ? getRecentActivity(viewer) : Promise.resolve(null),
    getCurrencyConverter(viewer),
  ]);

  const active = projects.filter((p) => p.status === "active");
  const needsAttention = active
    .filter((p) => p.health !== "on_track")
    .sort((a, b) => (a.health === "off_track" ? -1 : 1) - (b.health === "off_track" ? -1 : 1))
    .slice(0, 6);
  const money = (cents: number) => formatMoney(cents, fx.baseCurrency);
  const sumBase = (rows: { totalCents: number; currency: string }[]) =>
    rows.reduce((sum, row) => sum + fx.toBase(row.totalCents, row.currency), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={`Welcome back, ${viewer.name.split(" ")[0]}`}
        description={`${viewer.jobTitle ?? ROLE_LABELS[viewer.role]} at ${viewer.organizationName}`}
      />

      {invoices && revenue ? (
        <FinanceKpis
          revenue={revenue.months}
          open={invoices.filter((i) => i.status === "sent")}
          overdue={invoices.filter(isOverdue)}
          activeCount={active.length}
          atRiskCount={needsAttention.length}
          money={money}
          sumBase={sumBase}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active projects" value={active.length} />
          <StatCard label="My open tasks" value={myTasks.length} />
          <StatCard
            label="My tasks due this week"
            value={myTasks.filter((t) => t.dueDate && t.dueDate <= isoDaysFromToday(7)).length}
          />
          <StatCard label="Projects at risk" value={needsAttention.length} tone={needsAttention.length ? "warning" : undefined} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {revenue ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue received</CardTitle>
              <CardDescription>
                Paid invoices per month, last 12 months, in {revenue.currency}
                {revenue.ratesSource === "static" ? " (fixed demo exchange rates)" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart
                currency={revenue.currency}
                data={revenue.months.map((m) => ({ month: m.key, label: monthLabel.format(m.date), value: m.cents / 100 }))}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>My open tasks</CardTitle>
              <CardDescription>On active projects, soonest due first</CardDescription>
            </CardHeader>
            <CardContent>
              <TaskList tasks={myTasks} today={today} />
            </CardContent>
          </Card>
        )}

        {invoices ? (
          <Card>
            <CardHeader>
              <CardTitle>Overdue invoices</CardTitle>
              <ViewAll href="/app/invoices" />
            </CardHeader>
            <CardContent>
              {invoices.filter(isOverdue).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing overdue. Nice.</p>
              ) : (
                <ul className="divide-y">
                  {invoices
                    .filter(isOverdue)
                    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                    .slice(0, 6)
                    .map((invoice) => (
                      <li key={invoice.id}>
                        <Link href={`/app/invoices/${invoice.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{invoice.clientName}</span>
                            <span className="block text-xs text-muted-foreground">
                              {invoice.number} · due {formatDate(invoice.dueDate)}
                            </span>
                          </span>
                          <span className="tabular-nums">{formatMoney(invoice.totalCents, invoice.currency)}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : (
          <AttentionCard projects={needsAttention} />
        )}
      </div>

      {(invoices || activity) && (
        <div className="grid gap-6 lg:grid-cols-3">
          {invoices && <AttentionCard projects={needsAttention} />}
          {invoices && (
            <Card className={activity ? undefined : "lg:col-span-2"}>
              <CardHeader>
                <CardTitle>My open tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskList tasks={myTasks} today={today} />
              </CardContent>
            </Card>
          )}
          {activity && (
            <Card className={invoices ? undefined : "lg:col-span-3"}>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <ViewAll href="/app/activity" />
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {activity.map((entry) => (
                    <li key={entry.id} className="text-sm">
                      <p className="line-clamp-2">{entry.summary}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(entry.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function FinanceKpis({
  revenue,
  open,
  overdue,
  activeCount,
  atRiskCount,
  money,
  sumBase,
}: {
  revenue: { cents: number }[];
  open: { totalCents: number; currency: string }[];
  overdue: { totalCents: number; currency: string }[];
  activeCount: number;
  atRiskCount: number;
  money: (cents: number) => string;
  sumBase: (rows: { totalCents: number; currency: string }[]) => number;
}) {
  const thisMonth = revenue.at(-1)?.cents ?? 0;
  const lastMonth = revenue.at(-2)?.cents ?? 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* A partial month against a full one would mislead, so no % change here. */}
      <StatCard label="Revenue this month" value={money(thisMonth)} hint={`Month to date · last month ${money(lastMonth)}`} />
      <StatCard label="Outstanding" value={money(sumBase(open))} hint={`${open.length} open invoices`} />
      <StatCard
        label="Overdue"
        value={money(sumBase(overdue))}
        hint={`${overdue.length} invoices past due`}
        tone={overdue.length ? "warning" : undefined}
      />
      <StatCard label="Active projects" value={activeCount} hint={`${atRiskCount} at risk or off track`} />
    </div>
  );
}

function AttentionCard({ projects }: { projects: { id: string; name: string; clientName: string; health: string; dueDate: string | null }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects needing attention</CardTitle>
        <ViewAll href="/app/projects" />
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every active project is on track.</p>
        ) : (
          <ul className="divide-y">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/app/projects/${project.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{project.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {project.clientName} · due {formatDate(project.dueDate)}
                    </span>
                  </span>
                  <HealthBadge health={project.health} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TaskList({
  tasks,
  today,
}: {
  tasks: { id: string; title: string; dueDate: string | null; projectId: string; projectName: string }[];
  today: string;
}) {
  if (tasks.length === 0) return <p className="text-sm text-muted-foreground">No open tasks assigned to you.</p>;
  return (
    <ul className="divide-y">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link href={`/app/projects/${task.projectId}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{task.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{task.projectName}</span>
            </span>
            <span
              className={`shrink-0 text-xs ${task.dueDate && task.dueDate < today ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
            >
              {task.dueDate && task.dueDate < today ? "Overdue · " : "Due "}
              {formatDate(task.dueDate)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
