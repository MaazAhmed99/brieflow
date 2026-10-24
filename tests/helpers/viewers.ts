import { and, eq, ne } from "drizzle-orm";
import type { Viewer } from "@/server/auth/viewer";
import * as s from "@/server/db/schema";
import type { TestDb } from "./test-db";

// Builds the same Viewer object the app builds from a session, for any seeded user.
export async function viewerFor(db: TestDb, email: string): Promise<Viewer> {
  const [row] = await db
    .select({
      userId: s.users.id,
      name: s.users.name,
      email: s.users.email,
      image: s.users.image,
      organizationId: s.memberships.organizationId,
      organizationName: s.organizations.name,
      baseCurrency: s.organizations.baseCurrency,
      role: s.memberships.role,
      clientId: s.memberships.clientId,
      jobTitle: s.memberships.jobTitle,
    })
    .from(s.users)
    .innerJoin(s.memberships, eq(s.memberships.userId, s.users.id))
    .innerJoin(s.organizations, eq(s.organizations.id, s.memberships.organizationId))
    .where(eq(s.users.email, email));
  if (!row) throw new Error(`No seeded user ${email}`);
  return row;
}

/** A client user from the same organization as `viewer`, but a different client. */
export async function otherClientUser(db: TestDb, viewer: Viewer) {
  const [row] = await db
    .select({ email: s.users.email })
    .from(s.memberships)
    .innerJoin(s.users, eq(s.users.id, s.memberships.userId))
    .where(
      and(
        eq(s.memberships.organizationId, viewer.organizationId),
        eq(s.memberships.role, "client"),
        ne(s.memberships.clientId, viewer.clientId!),
      ),
    )
    .limit(1);
  return viewerFor(db, row.email);
}

/** The admin of the second organization (Fernvale Labs). */
export async function otherOrganizationAdmin(db: TestDb) {
  const [row] = await db
    .select({ email: s.users.email })
    .from(s.memberships)
    .innerJoin(s.users, eq(s.users.id, s.memberships.userId))
    .innerJoin(s.organizations, eq(s.organizations.id, s.memberships.organizationId))
    .where(and(eq(s.organizations.slug, "fernvale"), eq(s.memberships.role, "admin")));
  return viewerFor(db, row.email);
}
