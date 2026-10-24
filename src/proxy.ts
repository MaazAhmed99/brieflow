import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// A quick, optimistic check before any signed-in page renders: no session
// cookie means straight to the login page. It only looks at the cookie; the
// real checks (valid session, role, permissions) run in the layouts, pages
// and data functions on the server.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/portal/:path*"],
};
