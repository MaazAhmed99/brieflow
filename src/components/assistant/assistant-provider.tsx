"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

// One conversation per page load, shared by the slide-over panel and the full
// assistant page. Each question is POSTed to /api/assistant, which streams back
// newline-delimited JSON events.

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Tool steps shown while the answer is being prepared, e.g. "Looking up invoices". */
  steps: string[];
  error?: string;
  model?: string;
};

export type AssistantConfig = {
  enabled: boolean;
  modelLabel: string | null;
  suggestions: string[];
};

type AssistantContextValue = {
  config: AssistantConfig;
  messages: ChatMessage[];
  pending: boolean;
  send: (text: string) => void;
  stop: () => void;
  reset: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("useAssistant must be used inside AssistantProvider");
  return value;
}

type ServerEvent =
  | { type: "status"; text: string }
  | { type: "text"; delta: string }
  | { type: "done"; model: string }
  | { type: "error"; message: string };

export function AssistantProvider({ config, children }: { config: AssistantConfig; children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const update = (id: string, change: (message: ChatMessage) => ChatMessage) =>
    setMessages((current) => current.map((m) => (m.id === id ? change(m) : m)));

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || pending) return;

      const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content: question, steps: [] };
      const answer: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "", steps: [] };
      // The model gets the last few completed turns as context.
      const history = [...messages, user]
        .filter((m) => m.content && !m.error)
        .slice(-12)
        .map(({ role, content }) => ({ role, content }));

      setMessages((current) => [...current, user, answer]);
      setPending(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const { error } = await response.json().catch(() => ({ error: "Something went wrong." }));
          update(answer.id, (m) => ({ ...m, error }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            if (!line) continue;
            const event = JSON.parse(line) as ServerEvent;
            if (event.type === "text") update(answer.id, (m) => ({ ...m, content: m.content + event.delta }));
            else if (event.type === "status") update(answer.id, (m) => ({ ...m, steps: [...m.steps, event.text] }));
            else if (event.type === "done") update(answer.id, (m) => ({ ...m, model: event.model }));
            else update(answer.id, (m) => ({ ...m, error: event.message }));
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          update(answer.id, (m) => ({ ...m, error: "Couldn't reach the assistant. Check your connection." }));
        }
      } finally {
        setPending(false);
        abortRef.current = null;
      }
    },
    [messages, pending],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return (
    <AssistantContext.Provider value={{ config, messages, pending, send, stop, reset }}>
      {children}
    </AssistantContext.Provider>
  );
}
