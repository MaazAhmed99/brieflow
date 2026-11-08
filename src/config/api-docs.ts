// What /docs/api documents. The example responses were captured from the
// seeded demo data, and tests/api.test.ts checks each one still matches the
// API's real output schema, so the docs can't drift from the code.

export type ApiParam = { name: string; type: string; description: string };
export type ApiEndpoint = {
  id: string;
  title: string;
  path: string;
  description: string;
  params: ApiParam[];
  /** The request the curl example sends. */
  example: string;
  response: unknown;
};

const pagingParams: ApiParam[] = [
  { name: "page", type: "integer", description: "Page number, starting at 1. Default 1." },
  { name: "pageSize", type: "integer", description: "Results per page, 1 to 100. Default 25." },
];

const idParam: ApiParam = { name: "id", type: "uuid", description: "Part of the path." };

const harborAndFinch = {
  id: "c03d39de-2e95-47d8-b2a7-23d16e43db9e",
  name: "Harbor & Finch",
  industry: "Retail & e-commerce",
  country: "United States",
  city: "Portland",
  status: "active",
  activeProjects: 3,
  outstanding: { amountCents: 5245000, currency: "USD" },
};

const juniper = {
  id: "3ae12bcf-435d-4344-b73d-4bb38502613f",
  code: "LRK-1022",
  name: "Juniper: API integration",
  status: "active",
  health: "off_track",
  startDate: "2026-10-07",
  dueDate: "2026-12-01",
  budget: { amountCents: 14650000, currency: "USD" },
  client: { id: "5ee255e9-131b-4a10-b8e5-a5971183b9ba", name: "Quitzon and Sons" },
};

const inv1182 = {
  id: "6c9ed847-c855-40ff-8b81-f3c7afcfc61e",
  number: "INV-1182",
  status: "paid",
  issueDate: "2026-10-24",
  dueDate: "2026-11-07",
  paidAt: "2026-11-08T18:42:19.354Z",
  total: { amountCents: 754000, currency: "USD" },
  client: { id: "7d2a5ec6-66db-48fa-b85e-c360d7386bf1", name: "Grant LLC" },
  project: { id: "3743c07b-be1c-492e-b1dc-05de7551b062", name: "Rivet: Mobile app MVP" },
};

export const apiEndpoints: ApiEndpoint[] = [
  {
    id: "list-clients",
    title: "List clients",
    path: "/api/v1/clients",
    description: "Your organization's clients, with their active project count and unpaid invoice total.",
    params: [
      { name: "status", type: "active | paused | archived", description: "Only clients with this status." },
      { name: "search", type: "string", description: "Matches the client name. Results are sorted by name." },
      ...pagingParams,
    ],
    example: "/api/v1/clients?search=harbor",
    response: { data: [harborAndFinch], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 } },
  },
  {
    id: "list-projects",
    title: "List projects",
    path: "/api/v1/projects",
    description: "Projects across all clients, most recently started first. health is reported for active projects only, and is null otherwise.",
    params: [
      { name: "status", type: "planned | active | on_hold | completed", description: "Only projects with this status." },
      { name: "clientId", type: "uuid", description: "Only this client's projects." },
      { name: "search", type: "string", description: "Matches the project name, code or client name." },
      ...pagingParams,
    ],
    example: "/api/v1/projects?status=active&pageSize=1",
    response: { data: [juniper], pagination: { page: 1, pageSize: 1, total: 36, totalPages: 36 } },
  },
  {
    id: "get-project",
    title: "Get a project",
    path: "/api/v1/projects/{id}",
    description: "One project, with its milestones, manager and task progress.",
    params: [idParam],
    example: `/api/v1/projects/${juniper.id}`,
    response: {
      data: {
        ...juniper,
        description: "API integration for Quitzon and Sons.",
        manager: "Heaven Zulauf",
        milestones: [
          { title: "Discovery", status: "done", dueDate: "2026-10-25" },
          { title: "Build", status: "in_progress", dueDate: "2026-11-12" },
          { title: "QA & launch", status: "upcoming", dueDate: "2026-12-01" },
        ],
        tasks: { total: 8, done: 4 },
      },
    },
  },
  {
    id: "list-invoices",
    title: "List invoices",
    path: "/api/v1/invoices",
    description: "Invoices, newest first. An unpaid invoice past its due date is reported as overdue, otherwise open.",
    params: [
      { name: "status", type: "draft | open | overdue | paid | void", description: "Only invoices with this status." },
      { name: "clientId", type: "uuid", description: "Only this client's invoices." },
      ...pagingParams,
    ],
    example: "/api/v1/invoices?status=paid&pageSize=1",
    response: { data: [inv1182], pagination: { page: 1, pageSize: 1, total: 159, totalPages: 159 } },
  },
  {
    id: "get-invoice",
    title: "Get an invoice",
    path: "/api/v1/invoices/{id}",
    description: "One invoice, with its line items, tax and the payments recorded against it.",
    params: [idParam],
    example: `/api/v1/invoices/${inv1182.id}`,
    response: {
      data: {
        ...inv1182,
        subtotal: { amountCents: 754000, currency: "USD" },
        tax: { amountCents: 0, currency: "USD" },
        items: [
          {
            description: "Project management: 52 h",
            quantity: 52,
            unitPrice: { amountCents: 14500, currency: "USD" },
            amount: { amountCents: 754000, currency: "USD" },
          },
        ],
        payments: [
          { amount: { amountCents: 754000, currency: "USD" }, method: "bank_transfer", paidAt: "2026-11-08T18:42:19.354Z" },
        ],
      },
    },
  },
];

export const apiErrors = [
  { status: 400, code: "invalid_request", meaning: "A query parameter is missing or invalid. The message says which." },
  { status: 401, code: "unauthorized", meaning: "No API key, or the key is invalid or revoked." },
  { status: 404, code: "not_found", meaning: "No such record in your organization." },
  { status: 429, code: "rate_limited", meaning: "More than 60 requests in a minute. Wait for the Retry-After seconds." },
  { status: 500, code: "internal_error", meaning: "Something failed on our side." },
  { status: 503, code: "unavailable", meaning: "This deployment isn't connected to its database yet." },
] as const;
