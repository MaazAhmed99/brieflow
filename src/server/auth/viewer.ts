import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { can, type Permission, type Role } from "@/server/authz/permissions";
import { db } from "@/server/db/client";
import { memberships, organizations } from "@/server/db/schema";
import { auth } from "./auth";

// The signed-in person, their organization and their role. Every data
// function takes a Viewer, so access rules always know who is asking.
export type Viewer = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  organizationId: string;
  organizationName: string;
  baseCurrency: string;
  role: Role;
  clientId: string | null;
  jobTitle: string | null;
};

// cache() runs this once per request, however many components call it.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [membership] = await db
    .select({
      organizationId: memberships.organizationId,
      organizationName: organizations.name,
      baseCurrency: organizations.baseCurrency,
      role: memberships.role,
      clientId: memberships.clientId,
      jobTitle: memberships.jobTitle,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(eq(memberships.userId, session.user.id))
    .limit(1);
  if (!membership) return null;

  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    ...membership,
  };
});

/** For pages and actions that need a signed-in user. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/**
 * For pages that need a permission. Shows "not found" rather than "forbidden",
 * so nobody can learn that a page or record exists.
 */
export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!can(viewer, permission)) notFound();
  return viewer;
}

/** Where each role lands after signing in. */
export function homePathFor(role: Role) {
  return role === "client" ? "/portal" : "/app";
}
