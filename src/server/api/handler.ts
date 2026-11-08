import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { API_KEY_PATTERN, hashApiKey } from "@/lib/api-keys";
import type { Viewer } from "@/server/auth/viewer";
import { db } from "@/server/db/client";
import { apiKeys, organizations } from "@/server/db/schema";
import { rateLimit } from "@/server/rate-limit";

// Shared plumbing for the REST API (/api/v1/*): API-key authentication, a
// per-key rate limit, and one error shape everywhere:
//   { "error": { "code": "not_found", "message": "..." } }

export type ApiErrorCode =
  | "unauthorized"
  | "not_found"
  | "invalid_request"
  | "rate_limited"
  | "internal_error"
  | "unavailable";

export function apiError(status: number, code: ApiErrorCode, message: string, headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status, headers });
}

/**
 * The organization a valid, unrevoked key belongs to, as a read-only Viewer.
 * API keys act with manager-level read access within their organization; the
 * API itself only exposes read endpoints.
 */
async function viewerForKey(key: string): Promise<{ viewer: Viewer; keyId: string } | null> {
  if (!API_KEY_PATTERN.test(key)) return null;
  const [row] = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdBy: apiKeys.createdBy,
      organizationId: organizations.id,
      organizationName: organizations.name,
      baseCurrency: organizations.baseCurrency,
    })
    .from(apiKeys)
    .innerJoin(organizations, eq(organizations.id, apiKeys.organizationId))
    .where(and(eq(apiKeys.keyHash, hashApiKey(key)), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!row) return null;

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
  return {
    keyId: row.id,
    viewer: {
      userId: row.createdBy ?? row.id,
      name: `API key "${row.name}"`,
      email: "",
      image: null,
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      baseCurrency: row.baseCurrency,
      role: "manager",
      clientId: null,
      clientName: null,
      jobTitle: null,
    },
  };
}

/** Wraps a GET handler: authenticates the key, rate limits it, and turns surprises into a 500 JSON error. */
export function apiRoute<Params>(
  handler: (input: { viewer: Viewer; request: Request; params: Params }) => Promise<Response>,
) {
  return async (request: Request, context: { params: Promise<Params> }) => {
    if (!process.env.DATABASE_URL) {
      return apiError(503, "unavailable", "The API isn't connected to its database on this deployment yet.");
    }
    try {
      const header = request.headers.get("authorization") ?? "";
      const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
      if (!key) return apiError(401, "unauthorized", "Send your API key as: Authorization: Bearer <key>");

      const auth = await viewerForKey(key);
      if (!auth) return apiError(401, "unauthorized", "That API key is not valid or has been revoked.");

      const limit = rateLimit(`api:${auth.keyId}`, 60, 60_000);
      if (!limit.ok) {
        return apiError(429, "rate_limited", "Too many requests. The limit is 60 per minute.", {
          "retry-after": String(Math.ceil(limit.retryAfterMs / 1000)),
        });
      }
      return await handler({ viewer: auth.viewer, request, params: await context.params });
    } catch (error) {
      console.error("API error", error);
      return apiError(500, "internal_error", "Something went wrong on our side.");
    }
  };
}

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** Reads and validates query parameters; returns an error Response when they're invalid. */
export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.infer<T> | Response {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return apiError(400, "invalid_request", `${issue.path.join(".") || "query"}: ${issue.message}`);
  }
  return parsed.data;
}

/** One page of results in the standard list envelope. */
export function paginate<T>(rows: T[], page: number, pageSize: number) {
  return {
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)) },
  };
}
