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

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard:view": "See the dashboard",
  "client:read": "View clients",
  "client:write": "Add and edit clients",
  "project:read": "View projects",
  "project:write": "Create and edit projects",
  "task:write": "Create and update tasks",
  "comment:write": "Comment on projects",
  "file:upload": "Upload files",
  "invoice:read": "View invoices",
  "invoice:write": "Create invoices and mark them paid",
  "invoice:pay": "Pay invoices online",
  "finance:read": "View expenses and reports",
  "sales:read": "View the sales pipeline",
  "time:read": "View time tracking",
  "hr:read": "View HR and leave",
  "support:read": "View support tickets",
  "team:read": "View the team",
  "team:manage": "Invite people and change roles",
  "activity:read": "View the audit log",
  "settings:manage": "Manage organization settings",
  "assistant:use": "Use the AI assistant",
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  accountant: "Accountant",
  staff: "Staff",
  client: "Client",
};
