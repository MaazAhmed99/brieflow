import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

// The Brieflow mark: two stacked "brief" pages with a flow line.
// `inverted` is for use on the brand-coloured background.
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="8" className={inverted ? "fill-primary-foreground" : "fill-primary"} />
      <path
        d="M10 9h8.5a4 4 0 0 1 0 8H10zM10 17h10a3.5 3.5 0 0 1 0 7H10z"
        className={cn("fill-none", inverted ? "stroke-primary" : "stroke-primary-foreground")}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark inverted={inverted} />
      <span>{siteConfig.name}</span>
    </span>
  );
}
