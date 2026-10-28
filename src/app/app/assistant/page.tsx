import { ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requirePermission } from "@/server/auth/viewer";

export const metadata: Metadata = { title: "AI assistant" };

export default async function AssistantPage() {
  await requirePermission("assistant:use");

  return (
    <div className="mx-auto flex h-[calc(100svh-9rem)] max-w-3xl flex-col gap-4">
      <PageHeader
        title="AI assistant"
        description="Ask about your clients, projects and invoices in plain English."
      />
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        It looks things up with the same access rules as the rest of the app, so it only sees what your role can
        see. It can draft text for you but never sends or changes anything.
      </p>
      <Card className="min-h-0 flex-1 gap-0 overflow-hidden py-0">
        <AssistantChat className="h-full" />
      </Card>
    </div>
  );
}
