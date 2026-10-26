import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/server/auth/viewer";
import { ROLE_LABELS } from "@/server/authz/permissions";
import { getIntegrationStatus, type IntegrationState } from "@/server/integrations/status";

export const metadata: Metadata = { title: "Settings" };

const stateLabel: Record<IntegrationState, [string, "green" | "blue" | "amber" | "gray"]> = {
  connected: ["Connected", "green"],
  "test-mode": ["Connected · test mode", "green"],
  "free-tier": ["Connected · free tier", "green"],
  demo: ["Demo mode", "amber"],
  local: ["Local development", "blue"],
  "not-configured": ["Not configured", "gray"],
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm sm:col-span-2">{children}</dd>
    </div>
  );
}

export default async function SettingsPage() {
  const viewer = await requirePermission("team:read");
  const integrations = await getIntegrationStatus();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings" description="Your profile, the organization and integrations." />

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>Editing your profile and password arrives in v1.1.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <Field label="Name">{viewer.name}</Field>
            <Field label="Email">{viewer.email}</Field>
            <Field label="Job title">{viewer.jobTitle ?? "—"}</Field>
            <Field label="Role">
              <Badge variant="secondary">{ROLE_LABELS[viewer.role]}</Badge>
            </Field>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <Field label="Name">{viewer.organizationName}</Field>
            <Field label="Base currency">{viewer.baseCurrency}</Field>
            <Field label="Data">Sample data, reset every night</Field>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            The real status of each service on this deployment, checked from its configuration. Nothing here is
            shown as connected unless it is.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {integrations.map((integration) => {
              const [label, color] = stateLabel[integration.state];
              return (
                <li key={integration.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{integration.name}</span>
                    {integration.phase === "v1.1" && (
                      <Badge variant="outline" className="ml-2 text-[10px]">v1.1</Badge>
                    )}
                    <span className="block text-sm text-muted-foreground">
                      {integration.purpose}
                      {integration.detail && ` · ${integration.detail}`}
                    </span>
                  </span>
                  <StatusPill color={color}>{label}</StatusPill>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
