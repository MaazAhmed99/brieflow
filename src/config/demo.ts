// The demo workspace and the one-click demo accounts shown on the login page.
// All names, companies and emails are invented; example.com addresses never
// receive mail.

export const demoOrganizationSlug = "larkspur";

export const demoAccounts = [
  {
    role: "admin",
    label: "Admin",
    email: "admin@larkspur.example.com",
    description: "Everything, including team, roles and settings",
  },
  {
    role: "manager",
    label: "Manager",
    email: "manager@larkspur.example.com",
    description: "Clients, projects and invoices",
  },
  {
    role: "accountant",
    label: "Accountant",
    email: "accountant@larkspur.example.com",
    description: "Invoices, payments and reports",
  },
  {
    role: "staff",
    label: "Staff",
    email: "staff@larkspur.example.com",
    description: "Projects and tasks, no finance",
  },
  {
    role: "client",
    label: "Client",
    email: "client@harborandfinch.example.com",
    description: "The client portal for Harbor & Finch",
  },
] as const;

export type DemoRole = (typeof demoAccounts)[number]["role"];

// A public, read-only REST API key for the demo workspace, shown on /docs/api.
// It can only read Larkspur Digital's sample data, which resets every night.
export const demoApiKey = "bf_demo_readonly_k7Qm2xVw9Lp4Rt8Zs3Nd";
