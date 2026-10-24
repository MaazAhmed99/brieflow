import { HammerIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { appNavItems } from "@/config/nav";
import { requirePermission } from "@/server/auth/viewer";

// Temporary page for modules that aren't built yet. Each real module gets its
// own folder (for example app/clients/page.tsx), which takes priority over this
// dynamic route, so this disappears module by module.

const findModule = (slug: string) => appNavItems.find((item) => item.href === `/app/${slug}`);

export async function generateMetadata({ params }: PageProps<"/app/[module]">): Promise<Metadata> {
  const item = findModule((await params).module);
  return { title: item?.title };
}

export default async function ModulePlaceholderPage({ params }: PageProps<"/app/[module]">) {
  const item = findModule((await params).module);
  if (!item) notFound();
  await requirePermission(item.permission);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title={item.title} description={item.description} preview={item.preview} />
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <HammerIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-medium">This module is being built</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {item.preview
            ? "A read-only preview with the sample data lands here before Wednesday 28 October."
            : "The working version of this page lands here before Wednesday 28 October."}
        </p>
      </div>
    </div>
  );
}
