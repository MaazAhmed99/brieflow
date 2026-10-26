import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ComingSoonButton, PreviewNotice } from "@/components/preview-notice";
import { StatCard } from "@/components/stat-card";
import { formatDate, formatMoney } from "@/lib/format";
import { requirePermission } from "@/server/auth/viewer";
import { listLeads } from "@/server/data/preview";
import { getCurrencyConverter } from "@/server/data/rates";

export const metadata: Metadata = { title: "Pipeline" };

const STAGES = [
  { stage: "new", title: "New" },
  { stage: "qualified", title: "Qualified" },
  { stage: "proposal", title: "Proposal" },
  { stage: "negotiation", title: "Negotiation" },
  { stage: "won", title: "Won" },
  { stage: "lost", title: "Lost" },
] as const;

export default async function SalesPage() {
  const viewer = await requirePermission("sales:read");
  const [leads, fx] = await Promise.all([listLeads(viewer), getCurrencyConverter(viewer)]);
  const money = (cents: number) =>
    formatMoney(cents, fx.baseCurrency).replace(/\.00$/, "");
  const valueOf = (rows: typeof leads) => rows.reduce((sum, l) => sum + fx.toBase(l.valueCents, l.currency), 0);

  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");
  const won = leads.filter((l) => l.stage === "won");
  const closed = won.length + leads.filter((l) => l.stage === "lost").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Pipeline"
        description="Leads and deals by stage."
        preview
        actions={
          <ComingSoonButton reason="Adding and moving deals arrives after v1.">
            <PlusIcon aria-hidden="true" /> New lead
          </ComingSoonButton>
        }
      />
      <PreviewNotice coming="adding leads, dragging deals between stages, and turning won deals into clients" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open pipeline" value={money(valueOf(open))} hint={`${open.length} deals in progress`} />
        <StatCard label="Won" value={money(valueOf(won))} hint={`${won.length} deals`} />
        <StatCard label="Win rate" value={closed ? `${Math.round((won.length / closed) * 100)}%` : "—"} hint="Of closed deals" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {STAGES.map(({ stage, title }) => {
          const items = leads.filter((l) => l.stage === stage);
          return (
            <section key={stage} aria-label={title} className="flex w-64 shrink-0 flex-col rounded-xl bg-muted/50 p-3">
              <h2 className="mb-1 flex items-center justify-between px-1 text-sm font-medium">
                {title}
                <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                  {items.length}
                </span>
              </h2>
              <p className="mb-3 px-1 text-xs text-muted-foreground tabular-nums">{money(valueOf(items))}</p>
              <ul className="space-y-2">
                {items.slice(0, 12).map((lead) => (
                  <li key={lead.id} className="space-y-1 rounded-lg border bg-card p-3 text-sm shadow-xs">
                    <p className="font-medium leading-snug">{lead.company}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.contactName} · {lead.source}
                    </p>
                    <p className="flex items-center justify-between text-xs">
                      <span className="font-medium tabular-nums">
                        {formatMoney(lead.valueCents, lead.currency).replace(/\.00$/, "")}
                      </span>
                      <span className="text-muted-foreground">
                        {stage === "won" || stage === "lost" ? "Closed" : "Close"} {formatDate(lead.expectedClose)}
                      </span>
                    </p>
                  </li>
                ))}
                {items.length > 12 && (
                  <li className="px-1 text-xs text-muted-foreground">+ {items.length - 12} more</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
