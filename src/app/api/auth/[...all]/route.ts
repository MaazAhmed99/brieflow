import { getAuth, isAuthConfigured } from "@/server/auth/auth";

// Better Auth's own endpoints (sign-in, sign-out, session) live under /api/auth/*.

function handle(request: Request) {
  if (!isAuthConfigured()) {
    return Response.json({ error: "Sign-in isn't configured on this deployment yet." }, { status: 503 });
  }
  return getAuth().handler(request);
}

export { handle as GET, handle as POST };
