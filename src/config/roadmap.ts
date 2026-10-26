// The public roadmap. Update an item's status when it ships; /roadmap renders this.

export type RoadmapItem = { title: string; detail: string };
export type RoadmapSection = {
  title: string;
  status: "done" | "in-progress" | "planned";
  target?: string;
  items: RoadmapItem[];
};

export const roadmap: RoadmapSection[] = [
  {
    title: "Working now",
    status: "done",
    items: [
      { title: "Sign-in and roles", detail: "One-click demo accounts for admin, manager, accountant, staff and client." },
      { title: "Access rules", detail: "Every query is limited to your organization, and clients to their own company. Covered by automated tests." },
      { title: "Dashboard", detail: "Revenue, outstanding and overdue amounts, a 12-month revenue chart and work lists." },
      { title: "Clients, projects and invoices", detail: "Searchable tables, a project board, detail pages and CSV export." },
      { title: "Mark invoices paid", detail: "Records the payment and writes the audit log in one transaction." },
      { title: "Team, permissions and audit log", detail: "Who can do what, and a record of every change." },
      { title: "Client portal (read-only)", detail: "Clients see their own projects, milestones, comments and invoices." },
    ],
  },
  {
    title: "In progress",
    status: "in-progress",
    target: "Wednesday 28 October 2026",
    items: [
      { title: "AI assistant", detail: "Ask questions about your clients, projects and invoices, on a free-tier model, respecting the same access rules." },
      { title: "Online payments", detail: "Clients pay invoices by card with Stripe in test mode." },
      { title: "Comments and file uploads", detail: "For both the agency team and clients." },
      { title: "Nightly demo reset", detail: "Restores the sample data every night." },
    ],
  },
  {
    title: "Next",
    status: "planned",
    target: "Sunday 1 November 2026",
    items: [
      { title: "REST API and webhooks", detail: "Versioned read-only API with API keys and docs; signed webhooks for automation tools." },
      { title: "Emails and real-time notifications", detail: "Invoice emails and live updates when a client comments or pays." },
      { title: "Invoice PDFs", detail: "Download any invoice as a PDF." },
      { title: "Preview modules go live", detail: "Pipeline first, then time tracking, expenses, HR, support and reports." },
    ],
  },
];
