import "server-only";
import { ApiError, type Content, GoogleGenAI, type Part } from "@google/genai";
import { type AiMessage, type AiProvider, AiRateLimitError, type AiToolCall } from "../types";

// Google Gemini's free tier, used as the fallback when Groq is rate limited.
// Gemini replies in "parts"; newer models attach thought signatures to their
// function calls, which must be sent back unchanged, so the model's own parts
// are kept (as `raw`) and replayed on the next round.

function toGeminiContents(messages: AiMessage[]): Content[] {
  const contents: Content[] = [];
  for (const message of messages) {
    if (message.role === "user") {
      contents.push({ role: "user", parts: [{ text: message.content }] });
    } else if (message.role === "assistant") {
      const raw = message.raw?.provider === "gemini" ? (message.raw.data as Part[]) : null;
      const parts: Part[] = raw ?? [
        ...(message.content ? [{ text: message.content }] : []),
        ...(message.toolCalls ?? []).map((call) => ({
          functionCall: { id: call.id, name: call.name, args: JSON.parse(call.arguments || "{}") },
        })),
      ];
      contents.push({ role: "model", parts });
    } else {
      // Consecutive tool results go into one user turn, as Gemini expects.
      const part: Part = {
        functionResponse: { id: message.toolCallId, name: message.name, response: { result: message.content } },
      };
      const last = contents.at(-1);
      if (last?.role === "user" && last.parts?.every((p) => p.functionResponse)) last.parts.push(part);
      else contents.push({ role: "user", parts: [part] });
    }
  }
  return contents;
}

export function createGeminiProvider(apiKey: string, model: string): AiProvider {
  const client = new GoogleGenAI({ apiKey });

  return {
    id: "gemini",
    label: `${model} on Google Gemini`,
    async *stream({ system, messages, tools, maxOutputTokens, signal }) {
      let response;
      try {
        response = await client.models.generateContentStream({
          model,
          contents: toGeminiContents(messages),
          config: {
            systemInstruction: system,
            maxOutputTokens,
            abortSignal: signal,
            tools: tools.length
              ? [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }]
              : undefined,
          },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) throw new AiRateLimitError("Gemini");
        throw error;
      }

      const modelParts: Part[] = [];
      const calls: AiToolCall[] = [];
      for await (const chunk of response) {
        for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
          modelParts.push(part);
          if (part.text && !part.thought) yield { type: "text", delta: part.text };
          if (part.functionCall?.name) {
            calls.push({
              id: part.functionCall.id ?? `call_${calls.length + 1}`,
              name: part.functionCall.name,
              arguments: JSON.stringify(part.functionCall.args ?? {}),
            });
          }
        }
        const usage = chunk.usageMetadata;
        if (usage?.promptTokenCount !== undefined) {
          yield { type: "usage", inputTokens: usage.promptTokenCount ?? 0, outputTokens: usage.candidatesTokenCount ?? 0 };
        }
      }
      if (calls.length > 0) yield { type: "tool_calls", calls, raw: modelParts };
    },
  };
}
