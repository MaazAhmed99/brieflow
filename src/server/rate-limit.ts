import "server-only";
import { headers } from "next/headers";

// A small fixed-window rate limiter kept in memory. It protects the login
// actions on a single server instance; v1 swaps the store for Upstash Redis so
// the limit holds across every Vercel instance.

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  entry.count++;
  return entry.count <= limit
    ? { ok: true, retryAfterMs: 0 }
    : { ok: false, retryAfterMs: entry.resetAt - now };
}

/** The visitor's IP address as seen by Vercel (or "local" in development). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
