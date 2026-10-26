import { CheckIcon, MinusIcon, UserPlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ComingSoonButton } from "@/components/preview-notice";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/server/auth/viewer";
import { can, PERMISSION_LABELS, PERMISSIONS, type Permission, ROLE_LABELS, type Role } from "@/server/authz/permissions";
import { listTeam } from "@/server/data/team";
import { TeamTable } from "./team-table";

export const metadata: Metadata = { title: "Team" };

const ROLES: Role[] = ["admin", "manager", "accountant", "staff", "client"];

export default async function TeamPage() {
  const viewer = await requirePermission("team:read");
  const people = await listTeam(viewer);
  const departments = [...new Set(people.map((p) => p.department).filter((d): d is string => Boolean(d)))].sort();
  const permissions = Object.keys(PERMISSIONS) as Permission[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Team"
        description="People, roles and what each role can do."
        actions={
          can(viewer, "team:manage") ? (
            <ComingSoonButton reason="Inviting people arrives in the next update (v1.1).">
              <UserPlusIcon aria-hidden="true" /> Invite person
            </ComingSoonButton>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="People" value={people.length} />
        <StatCard label="Departments" value={departments.length} />
        <StatCard label="Managers and admins" value={people.filter((p) => p.role === "admin" || p.role === "manager").length} />
      </div>

      <TeamTable people={people.map((p) => ({ ...p, roleLabel: ROLE_LABELS[p.role] }))} departments={departments} />

      <Card>
        <CardHeader>
          <CardTitle>Roles and permissions</CardTitle>
          <CardDescription>
            The same table the server checks on every page, action and AI tool. Clients also only ever see their own
            company&apos;s records.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} scope="col" className="px-2 py-2 text-center font-medium">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">
                    {PERMISSION_LABELS[permission]}
                  </th>
                  {ROLES.map((role) => (
                    <td key={role} className="px-2 py-2 text-center">
                      {can({ role }, permission) ? (
                        <CheckIcon className="mx-auto size-4 text-emerald-600 dark:text-emerald-400" aria-label="Allowed" />
                      ) : (
                        <MinusIcon className="mx-auto size-4 text-muted-foreground/50" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
