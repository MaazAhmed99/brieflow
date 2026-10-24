import {
  BarChart3Icon,
  Building2Icon,
  CalendarDaysIcon,
  FolderKanbanIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  type LucideIcon,
  ReceiptIcon,
  SettingsIcon,
  SparklesIcon,
  TargetIcon,
  TimerIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { Permission } from "@/server/authz/permissions";

// Every module in the agency app. `preview: true` marks modules that show
// seeded data read-only while they are being built; `/roadmap` lists them.

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
  description: string;
  preview?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const appNav: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/app", icon: LayoutDashboardIcon, permission: "dashboard:view", description: "Revenue, projects and what needs attention today." },
      { title: "AI assistant", href: "/app/assistant", icon: SparklesIcon, permission: "assistant:use", description: "Ask questions about your clients, projects and invoices." },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Clients", href: "/app/clients", icon: Building2Icon, permission: "client:read", description: "Every client company, its contacts, projects and invoices." },
      { title: "Pipeline", href: "/app/sales", icon: TargetIcon, permission: "sales:read", description: "Leads and deals by stage.", preview: true },
    ],
  },
  {
    label: "Delivery",
    items: [
      { title: "Projects", href: "/app/projects", icon: FolderKanbanIcon, permission: "project:read", description: "Projects, milestones, tasks, files and comments." },
      { title: "Time tracking", href: "/app/time", icon: TimerIcon, permission: "time:read", description: "Timesheets and team utilization.", preview: true },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Invoices", href: "/app/invoices", icon: ReceiptIcon, permission: "invoice:read", description: "Invoices, payments and what's overdue." },
      { title: "Expenses", href: "/app/expenses", icon: WalletIcon, permission: "finance:read", description: "Expenses, vendors and purchase orders.", preview: true },
      { title: "Reports", href: "/app/reports", icon: BarChart3Icon, permission: "finance:read", description: "Profit and loss, revenue by client and utilization.", preview: true },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Team", href: "/app/team", icon: UsersIcon, permission: "team:read", description: "People, roles and what each role can do." },
      { title: "HR", href: "/app/hr", icon: CalendarDaysIcon, permission: "hr:read", description: "Employee directory and leave calendar.", preview: true },
    ],
  },
  {
    label: "Support",
    items: [
      { title: "Tickets", href: "/app/support", icon: LifeBuoyIcon, permission: "support:read", description: "Client support requests.", preview: true },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Activity", href: "/app/activity", icon: HistoryIcon, permission: "activity:read", description: "Audit log of every change: who did what, and when." },
      { title: "Settings", href: "/app/settings", icon: SettingsIcon, permission: "team:read", description: "Your profile, the organization and integrations." },
    ],
  },
];

export const appNavItems = appNav.flatMap((group) => group.items);

/** The nav item a path belongs to (the longest matching href wins). */
export function navItemFor(pathname: string) {
  return appNavItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
