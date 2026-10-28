"use client";

import { ArrowUpIcon, CheckIcon, Loader2Icon, RotateCcwIcon, SparklesIcon, SquareIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAssistant } from "./assistant-provider";
import { AssistantMarkdown } from "./markdown";

export function AssistantChat({ className }: { className?: string }) {
  const { config, messages, pending, send, stop, reset } = useAssistant();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view while an answer streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const submit = (text: string) => {
    if (!text.trim() || pending) return;
    send(text);
    setDraft("");
  };

  if (!config.enabled) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 p-6 text-center", className)}>
        <SparklesIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">The AI assistant isn&apos;t configured on this deployment yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          It answers questions about your clients, projects and invoices using a free-tier model, once an API key
          is added.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-4 pt-4">
            <div className="space-y-1 text-center">
              <SparklesIcon className="mx-auto size-7 text-primary" aria-hidden="true" />
              <p className="font-medium">Ask about your clients, projects and invoices</p>
              <p className="text-sm text-muted-foreground">It only sees what your role can see, and can&apos;t change anything.</p>
            </div>
            <ul className="grid gap-2">
              {config.suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => submit(suggestion)}
                    className="w-full rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                {message.content}
              </div>
            ) : (
              <div key={message.id} className="max-w-[95%] space-y-2 text-sm">
                {message.steps.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {message.steps.map((step, index) => (
                      <li key={`${step}-${index}`} className="flex items-center gap-1.5">
                        <CheckIcon className="size-3" aria-hidden="true" /> {step}
                      </li>
                    ))}
                  </ul>
                )}
                {message.content ? (
                  <AssistantMarkdown>{message.content}</AssistantMarkdown>
                ) : (
                  !message.error &&
                  pending && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Loader2Icon className="size-4 animate-spin" aria-hidden="true" /> Thinking…
                    </p>
                  )
                )}
                {message.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">{message.error}</p>}
              </div>
            ),
          )
        )}
        <div ref={endRef} />
      </div>

      <form
        className="space-y-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(draft);
              }
            }}
            placeholder="Ask a question…"
            aria-label="Ask the assistant"
            rows={1}
            maxLength={2000}
            className="max-h-32 min-h-10 resize-none"
          />
          {pending ? (
            <Button type="button" size="icon" variant="outline" onClick={stop} aria-label="Stop">
              <SquareIcon />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send">
              <ArrowUpIcon />
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>AI answers can be wrong. Model: {config.modelLabel} (free tier)</span>
          {messages.length > 0 && (
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 hover:text-foreground">
              <RotateCcwIcon className="size-3" aria-hidden="true" /> New chat
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
