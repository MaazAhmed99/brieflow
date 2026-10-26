import { EyeIcon } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** The banner every Preview module shows: real sample data, read-only for now. */
export function PreviewNotice({ coming }: { coming: string }) {
  return (
    <Alert>
      <EyeIcon aria-hidden="true" />
      <AlertTitle>Preview module</AlertTitle>
      <AlertDescription>
        <p>
          You&apos;re looking at real sample data, read-only. Coming next: {coming}. See the{" "}
          <Link href="/roadmap" className="font-medium text-foreground underline underline-offset-4">
            roadmap
          </Link>
          .
        </p>
      </AlertDescription>
    </Alert>
  );
}

/** A write action that isn't built yet: visible, disabled, and says why. */
export function ComingSoonButton({ children, reason }: { children: React.ReactNode; reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Disabled buttons don't fire hover events, so the wrapper carries the tooltip. */}
        <span tabIndex={0} className="inline-flex rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Button disabled>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
