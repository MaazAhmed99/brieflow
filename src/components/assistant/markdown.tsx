"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders the assistant's markdown. Links are only kept when they point inside
// the app (urls the tools returned); anything else is shown as plain text, so
// a model can never send someone to an outside site.
export function AssistantMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children: label }) =>
          href?.startsWith("/") && !href.startsWith("//") ? (
            <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
              {label}
            </Link>
          ) : (
            <span>{label}</span>
          ),
        p: ({ children: text }) => <p className="leading-relaxed [&:not(:first-child)]:mt-2">{text}</p>,
        ul: ({ children: items }) => <ul className="mt-2 list-disc space-y-1 pl-5">{items}</ul>,
        ol: ({ children: items }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{items}</ol>,
        strong: ({ children: text }) => <strong className="font-semibold">{text}</strong>,
        code: ({ children: text }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{text}</code>,
        table: ({ children: rows }) => (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">{rows}</table>
          </div>
        ),
        th: ({ children: cell }) => <th className="border-b px-2 py-1 font-medium">{cell}</th>,
        td: ({ children: cell }) => <td className="border-b px-2 py-1">{cell}</td>,
        h1: ({ children: text }) => <p className="mt-2 font-semibold">{text}</p>,
        h2: ({ children: text }) => <p className="mt-2 font-semibold">{text}</p>,
        h3: ({ children: text }) => <p className="mt-2 font-semibold">{text}</p>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
