import { z } from "zod";
import { getAiProviders, isAiConfigured } from "@/server/ai/providers";
import { claimAssistantRequest, recordAssistantTokens } from "@/server/ai/quota";
import { runAssistant } from "@/server/ai/run";
import { getViewer } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";

// POST /api/assistant: runs one assistant turn and streams it back as
// newline-delimited JSON events (status, text, done, error).

export const maxDuration = 60;

const body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((messages) => messages.at(-1)?.role === "user", "The last message must be from the user."),
});

const json = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return json(401, "Please sign in.");
  if (!can(viewer, "assistant:use")) return json(403, "You don't have access to the assistant.");
  if (!isAiConfigured()) return json(503, "The AI assistant isn't configured on this deployment yet.");

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "Invalid request.");

  const quota = await claimAssistantRequest(viewer);
  if (!quota.ok) {
    return json(
      429,
      quota.reason === "user"
        ? "You've used today's free AI questions. They reset tomorrow."
        : "The demo's free AI quota is used up for today. Please come back tomorrow.",
    );
  }

  let inputTokens = 0;
  let outputTokens = 0;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runAssistant({
          viewer,
          history: parsed.data.messages,
          providers: getAiProviders(),
          signal: request.signal,
          onUsage: (input, output) => {
            inputTokens += input;
            outputTokens += output;
          },
        })) {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
      } finally {
        controller.close();
        await recordAssistantTokens(viewer, inputTokens, outputTokens).catch(() => {});
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
