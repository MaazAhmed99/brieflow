"use client";

import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AssistantChat } from "./assistant-chat";

/** "Ask AI" button in the top bar: opens the assistant in a side panel on any page. */
export function AssistantLauncher() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SparklesIcon aria-hidden="true" /> Ask AI
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>AI assistant</SheetTitle>
          <SheetDescription>Answers from your workspace data. Read-only.</SheetDescription>
        </SheetHeader>
        <AssistantChat className="flex-1" />
      </SheetContent>
    </Sheet>
  );
}
