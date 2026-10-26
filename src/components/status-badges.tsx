import { Badge } from "@/components/ui/badge";
import { isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

const tone = {
  green: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  amber: "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
  red: "border-transparent bg-red-500/10 text-red-700 dark:text-red-400",
  blue: "border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-400",
  gray: "border-transparent bg-muted text-muted-foreground",
};

function ToneBadge({ color, children }: { color: keyof typeof tone; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("font-medium", tone[color])}>
      {children}
    </Badge>
  );
}

export function InvoiceStatusBadge({ invoice }: { invoice: { status: string; dueDate: string } }) {
  if (isOverdue(invoice)) return <ToneBadge color="red">Overdue</ToneBadge>;
  const map: Record<string, [keyof typeof tone, string]> = {
    draft: ["gray", "Draft"],
    sent: ["blue", "Open"],
    paid: ["green", "Paid"],
    void: ["gray", "Void"],
  };
  const [color, label] = map[invoice.status] ?? ["gray", invoice.status];
  return <ToneBadge color={color}>{label}</ToneBadge>;
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const map: Record<string, [keyof typeof tone, string]> = {
    planned: ["gray", "Planned"],
    active: ["blue", "Active"],
    on_hold: ["amber", "On hold"],
    completed: ["green", "Completed"],
  };
  const [color, label] = map[status] ?? ["gray", status];
  return <ToneBadge color={color}>{label}</ToneBadge>;
}

export function HealthBadge({ health }: { health: string }) {
  const map: Record<string, [keyof typeof tone, string]> = {
    on_track: ["green", "On track"],
    at_risk: ["amber", "At risk"],
    off_track: ["red", "Off track"],
  };
  const [color, label] = map[health] ?? ["gray", health];
  return <ToneBadge color={color}>{label}</ToneBadge>;
}

export function ClientStatusBadge({ status }: { status: string }) {
  const map: Record<string, [keyof typeof tone, string]> = {
    active: ["green", "Active"],
    paused: ["amber", "Paused"],
    archived: ["gray", "Archived"],
  };
  const [color, label] = map[status] ?? ["gray", status];
  return <ToneBadge color={color}>{label}</ToneBadge>;
}

/** Any status with an explicit colour, for the Preview modules. */
export function StatusPill({ color, children }: { color: keyof typeof tone; children: React.ReactNode }) {
  return <ToneBadge color={color}>{children}</ToneBadge>;
}

export function MilestoneStatusBadge({ status }: { status: string }) {
  const map: Record<string, [keyof typeof tone, string]> = {
    upcoming: ["gray", "Upcoming"],
    in_progress: ["blue", "In progress"],
    done: ["green", "Done"],
  };
  const [color, label] = map[status] ?? ["gray", status];
  return <ToneBadge color={color}>{label}</ToneBadge>;
}
