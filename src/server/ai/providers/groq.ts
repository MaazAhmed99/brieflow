import "server-only";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { type AiMessage, type AiProvider, AiRateLimitError, type AiToolCall } from "../types";

// Groq's free tier (no card needed). Groq uses the common chat-completions
// format: streamed text deltas, and tool calls that arrive in fragments keyed
// by index.

function toGroqMessages(system: string, messages: AiMessage[]): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: system },
    ...messages.map((message): ChatCompletionMessageParam => {
      if (message.role === "user") return { role: "user", content: message.content };
      if (message.role === "tool") {
        return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
      }
      return {
        role: "assistant",
        content: message.content || null,
        tool_calls: message.toolCalls?.map((call) => ({
          id: call.id,
          type: "function",
          function: { name: call.name, arguments: call.arguments },
        })),
      };
    }),
  ];
}

export function createGroqProvider(apiKey: string, model: string): AiProvider {
  const client = new Groq({ apiKey, maxRetries: 1 });

  return {
    id: "groq",
    label: `${model} on Groq`,
    async *stream({ system, messages, tools, maxOutputTokens, signal }) {
      let response;
      try {
        response = await client.chat.completions.create(
          {
            model,
            stream: true,
            max_completion_tokens: maxOutputTokens,
            messages: toGroqMessages(system, messages),
            tools: tools.length
              ? tools.map((tool) => ({
                  type: "function" as const,
                  function: { name: tool.name, description: tool.description, parameters: tool.parameters },
                }))
              : undefined,
          },
          { signal },
        );
      } catch (error) {
        if (error instanceof Groq.RateLimitError) throw new AiRateLimitError("Groq");
        throw error;
      }

      const partial = new Map<number, AiToolCall>();
      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) yield { type: "text", delta: delta.content };
        for (const fragment of delta?.tool_calls ?? []) {
          const call = partial.get(fragment.index) ?? { id: "", name: "", arguments: "" };
          if (fragment.id) call.id = fragment.id;
          if (fragment.function?.name) call.name += fragment.function.name;
          if (fragment.function?.arguments) call.arguments += fragment.function.arguments;
          partial.set(fragment.index, call);
        }
        const usage = chunk.x_groq?.usage;
        if (usage) yield { type: "usage", inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens };
      }
      if (partial.size > 0) yield { type: "tool_calls", calls: [...partial.values()] };
    },
  };
}
