// Provider-neutral shapes for the AI assistant. Each adapter (Groq, Gemini)
// translates these to and from its own SDK, so the tool loop never depends on
// a specific vendor.

export type AiToolCall = {
  id: string;
  name: string;
  /** The arguments as the model sent them: a JSON string. */
  arguments: string;
};

export type AiMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      toolCalls?: AiToolCall[];
      /** The provider's raw turn, replayed as-is to the same provider (Gemini needs its thought signatures back). */
      raw?: { provider: string; data: unknown };
    }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export type AiToolDefinition = {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
};

export type AiStreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_calls"; calls: AiToolCall[]; raw?: unknown }
  | { type: "usage"; inputTokens: number; outputTokens: number };

export interface AiProvider {
  /** Short id, e.g. "groq". */
  id: string;
  /** Shown under the chat input, e.g. "openai/gpt-oss-120b on Groq". */
  label: string;
  stream(input: {
    system: string;
    messages: AiMessage[];
    tools: AiToolDefinition[];
    maxOutputTokens: number;
    signal?: AbortSignal;
  }): AsyncIterable<AiStreamEvent>;
}

/** Thrown by adapters when the free quota or rate limit is hit, so the loop can try the next provider. */
export class AiRateLimitError extends Error {
  constructor(provider: string) {
    super(`${provider} rate limit reached`);
    this.name = "AiRateLimitError";
  }
}
