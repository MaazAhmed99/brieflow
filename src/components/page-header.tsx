import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  description,
  preview = false,
  actions,
}: {
  title: string;
  description?: string;
  preview?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {preview && <Badge variant="secondary">Preview</Badge>}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
