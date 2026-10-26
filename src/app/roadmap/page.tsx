import { CheckCircle2Icon, CircleDashedIcon, CircleDotIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { roadmap } from "@/config/roadmap";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Roadmap",
  description: `What works in ${siteConfig.name} today, and what's being built next.`,
};

const icons = { done: CheckCircle2Icon, "in-progress": CircleDotIcon, planned: CircleDashedIcon } as const;
const iconColor = {
  done: "text-emerald-600 dark:text-emerald-400",
  "in-progress": "text-primary",
  planned: "text-muted-foreground",
} as const;

export default function RoadmapPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Try the demo</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-10 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Roadmap</h1>
          <p className="text-muted-foreground">
            {siteConfig.name} is a portfolio demo being built in the open. Here&apos;s what works today and what comes next.
          </p>
        </div>
        {roadmap.map((section) => {
          const Icon = icons[section.status];
          return (
            <section key={section.title} className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-semibold">{section.title}</h2>
                {section.target && <span className="text-sm text-muted-foreground">Target: {section.target}</span>}
              </div>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <Icon className={`mt-0.5 size-5 shrink-0 ${iconColor[section.status]}`} aria-hidden="true" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">Built by {siteConfig.author}</footer>
    </div>
  );
}
