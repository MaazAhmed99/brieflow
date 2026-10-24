import type { memberRole } from "@/server/db/schema";

// Who may do what. This one table is the source of truth: Server Actions,
// pages, API routes and AI tools all check it, and /app/team renders it as the
// permissions matrix. Row-level limits (a client only sees their own rows)
// live in the Data Access Layer, not here.

export type Role = (typeof memberRole.enumValues)[number];

export const STAFF_ROLES = ["admin", "manager", "accountant", "staff"] as const satisfies readonly Role[];
const ALL_ROLES = [...STAFF_ROLES, "client"] as const satisfies readonly Role[];

export const PERMISSIONS = {
  "dashboard:view": STAFF_ROLES,
  "client:read": STAFF_ROLES,
  "client:write": ["admin", "manager"],
  "project:read": ALL_ROLES,
  "project:write": ["admin", "manager"],
  "task:write": ["admin", "manager", "staff"],
  "comment:write": ["admin", "manager", "staff", "client"],
  "file:upload": ["admin", "manager", "staff", "client"],
  "invoice:read": ["admin", "manager", "accountant", "client"],
  "invoice:write": ["admin", "manager", "accountant"],
  "invoice:pay": ["client"],
  "finance:read": ["admin", "manager", "accountant"],
  "sales:read": ["admin", "manager"],
  "time:read": ["admin", "manager", "staff"],
  "hr:read": ["admin", "manager"],
  "support:read": ALL_ROLES,
  "team:read": STAFF_ROLES,
  "team:manage": ["admin"],
  "activity:read": ["admin", "manager"],
  "settings:manage": ["admin"],
  "assistant:use": ALL_ROLES,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(viewer: { role: Role }, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(viewer.role);
}

export function isStaff(viewer: { role: Role }) {
  return viewer.role !== "client";
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  accountant: "Accountant",
  staff: "Staff",
  client: "Client",
};
