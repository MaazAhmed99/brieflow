import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/auth";

// Better Auth's own endpoints (sign-in, sign-out, session) live under /api/auth/*.
export const { GET, POST } = toNextJsHandler(auth);
