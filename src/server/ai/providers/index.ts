import "server-only";
import type { AiProvider } from "../types";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider } from "./groq";

// Which models the assistant uses, in order: Groq first (fast, free, no card),
// then Gemini if Groq is rate limited. Both are free tiers; set the model ids
// with GROQ_MODEL / GEMINI_MODEL to follow each provider's current list.
// AI_PROVIDER=gemini puts Gemini first.

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

export function getAiProviders(): AiProvider[] {
  const providers: AiProvider[] = [];
  if (process.env.GROQ_API_KEY) {
    providers.push(createGroqProvider(process.env.GROQ_API_KEY, process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL));
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push(createGeminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL));
  }
  return process.env.AI_PROVIDER === "gemini" ? providers.reverse() : providers;
}

export function isAiConfigured() {
  return Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);
}

/** What the chat footer shows: the model that answers first. */
export function primaryModelLabel() {
  return getAiProviders()[0]?.label ?? null;
}
