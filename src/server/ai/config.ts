import "server-only";
import type { AssistantConfig } from "@/components/assistant/assistant-provider";
import type { Viewer } from "@/server/auth/viewer";
import { can } from "@/server/authz/permissions";
import { isAiConfigured, primaryModelLabel } from "./providers";

// What the chat UI needs from the server: whether the assistant is set up,
// which model answers, and starter questions that fit this viewer's role.
export function assistantConfigFor(viewer: Viewer): AssistantConfig {
  let suggestions: string[];
  if (viewer.role === "client") {
    suggestions = [
      "What's the status of my projects?",
      "Which of my invoices still need paying?",
      "Summarise the latest comments on the Atlas project",
    ];
  } else if (can(viewer, "invoice:read")) {
    suggestions = [
      "Which invoices are overdue, and by how much?",
      "How much revenue did we receive each month this year?",
      "Draft a polite payment reminder for the oldest overdue invoice",
      "Summarise the latest comments on the Atlas project",
    ];
  } else {
    suggestions = [
      "Which active projects are at risk or off track?",
      "What's the status of the Atlas project?",
      "Summarise the latest comments on the Atlas project",
    ];
  }

  return {
    enabled: isAiConfigured() && can(viewer, "assistant:use"),
    modelLabel: primaryModelLabel(),
    suggestions,
  };
}
