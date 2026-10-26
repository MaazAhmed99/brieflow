"use client";

// A <script> that runs while the browser parses the server HTML, before the
// first paint. On the client React would warn about rendering a script tag, so
// it becomes inert "text/plain" there; suppressHydrationWarning covers the
// type difference. (Pattern from the Next.js "Preventing flash" guide.)
// It must be a Client Component: rendered from a Server Component, the type
// would be decided on the server only and the browser would get text/javascript.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
