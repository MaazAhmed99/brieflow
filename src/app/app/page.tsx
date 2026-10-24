import { CheckIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/server/auth/viewer";
import {
  can,
  PERMISSION_LABELS,
  PERMISSIONS,
  type Permission,
  ROLE_LABELS,
} from "@/server/authz/permissions";
import { listInvoices } from "@/server/data/invoices";
import { listProjects } from "@/server/data/projects";

export const metadata: Metadata = { title: "Dashboard" };

// Interim dashboard: real counts through the access-checked data layer, plus
// what the signed-in role can do. The full dashboard (KPIs and charts) replaces it.
export default async function DashboardPage() {
  const viewer = await requirePermission("dashboard:view");
  const today = new Date().toISOString().slice(0, 10);

  const projects = await listProjects(viewer);
  const invoices = can(viewer, "invoice:read") ? await listInvoices(viewer) : null;

  const stats = [
    { label: "Active projects", value: projects.filter((p) => p.status === "active").length },
    { label: "Projects at risk", value: projects.filter((p) => p.status === "active" && p.health !== "on_track").length },
    ...(invoices
      ? [
          { label: "Open invoices", value: invoices.filter((i) => i.status === "sent").length },
          {
            label: "Overdue invoices",
            value: invoices.filter((i) => i.status === "sent" && i.dueDate < today).length,
          },
        ]
      : []),
  ];

  const permissions = Object.keys(PERMISSIONS) as Permission[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={`Welcome back, ${viewer.name.split(" ")[0]}`}
        description={`${viewer.jobTitle ?? ROLE_LABELS[viewer.role]} at ${viewer.organizationName}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your access as {ROLE_LABELS[viewer.role]}</CardTitle>
          <CardDescription>
            Checked on the server for every page, action and AI tool. Sign in with another role to compare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {permissions.map((permission) => {
              const allowed = can(viewer, permission);
              return (
                <li key={permission} className="flex items-center gap-2">
                  {allowed ? (
                    <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" aria-label="Allowed" />
                  ) : (
                    <XIcon className="size-4 text-muted-foreground/60" aria-label="Not allowed" />
                  )}
                  <span className={allowed ? undefined : "text-muted-foreground"}>
                    {PERMISSION_LABELS[permission]}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
