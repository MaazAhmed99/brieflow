import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** One KPI: a label, a big number and an optional line of context. */
export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <Card className="min-w-0 gap-1">
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "truncate text-2xl font-semibold tabular-nums",
            tone === "warning" && "text-red-600 dark:text-red-400",
          )}
        >
          {value}
        </CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
    </Card>
  );
}
