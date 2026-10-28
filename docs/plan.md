# Build plan

Written 23 Oct 2026 from `D:\claude md files\client-portal-project-prompt.md`. **Approved 23 Oct**: name Brieflow, Better Auth, Cache Components off, and the rest as written below.

**Schedule revised 27 Oct** (Maaz's choice): v1 moves to Friday 30 Oct, AI assistant first. The public `/roadmap` page tracks what's done.

## 1. Product name: pick one

A web search on 23 Oct found no existing software product called any of these. I haven't checked domains or trademarks.

| Name | Idea |
|---|---|
| **Brieflow** | an agency brief flowing through to an invoice (recommended: sounds like an agency tool) |
| **Workvane** | a weather vane: shows which way the business is heading |
| **Opsmint** | operations that feel fresh |

## 2. Decisions to confirm

| Decision | Recommendation | Why |
|---|---|---|
| Auth library | **Better Auth** instead of Auth.js | Auth.js v5 never left beta (`5.0.0-beta.32`, last release July 2026), and its maintainers joined Better Auth in 2025 and point new projects there. Better Auth is stable (1.7.x), has a Drizzle adapter, and handles email and password login, sessions and social login. Data access rules stay in our own code either way. |
| Next.js Cache Components | **Turn off for v1** | Nearly every app page depends on who is signed in, so caching gains little and adds Suspense rules to every session read. Turning it off keeps the code simple to explain. The landing page stays static either way. |
| DB driver | Standard `pg` driver through Drizzle (changed 24 Oct) | Works with Neon over TCP (what Vercel recommends for its Node runtime) and with a local PGlite server (`db:local`), so the same code runs everywhere. Supports transactions. |
| Tests | Vitest + PGlite (Postgres in-process) | Authorization tests run against real Postgres in seconds, offline and in CI, with no extra account. |
| AI wiring | Our own `AiProvider` interface + each provider's official SDK | It mirrors `PaymentProvider`. The tool loop is our code, so I can explain it on a call. |

## 3. Module map

| Area | Module | v1 (Wed 28) | Later |
|---|---|---|---|
| Overview | Dashboard | Working | AI insights card (v1.1) |
| Sales | Clients (CRM) | Working | map (if time) |
| Sales | Leads pipeline | Preview | working first after v1 |
| Delivery | Projects + tasks (table, kanban) | Working | AI "summarize" (v1.1) |
| Delivery | Time tracking | Preview | |
| Finance | Invoices + payments | Working | PDFs (v1.1) |
| Finance | Expenses, vendors, POs | Preview | |
| Finance | Reports | Preview | |
| People | Team, roles, permissions | Working | OAuth sign-in (v1.1) |
| People | HR directory + leave calendar | Preview (real holidays via Nager.Date) | |
| Support | Tickets | Preview | |
| Admin | Activity / audit log | Working | |
| Admin | Settings + Integrations status | Working | API keys, webhooks (v1.1) |
| Everywhere | AI assistant | Working | retrieval over help docs (v1.1) |
| Portal | Client home, project, invoice + pay | Working | |
| Portal | Client tickets | Preview | |
| Public | Landing, login, `/roadmap` | Working | `/docs/api` (v1.1) |

## 4. Database schema

All IDs are UUIDs. Money is stored as integer cents plus a 3-letter currency code. Every business table has `organization_id` (FK, indexed) and `created_at`.

**Tenancy and people**
- `organizations`: name, slug, base_currency
- auth tables from the auth library: `users` (name, email, image), `sessions`, `accounts` (password hash lives here, never selected by app queries), `verifications`
- `memberships`: user_id, organization_id, role (`admin | manager | accountant | staff | client`), client_id (only for client users), department_id, job_title, started_on, location. Unique (user, organization).
- `departments`: name

**CRM**
- `clients`: name, industry, website, country, city, currency, status (`active | paused | archived`), owner_id
- `contacts`: client_id, name, email (`example.com` only), job_title, is_primary, user_id (set when the contact has a portal login)
- `client_notes`: client_id, author_id, body

**Delivery**
- `projects`: client_id, code, name, status (`planned | active | on_hold | completed`), health (`on_track | at_risk | off_track`), budget_cents, currency, start_date, due_date, manager_id
- `project_members`: project_id, user_id
- `milestones`: project_id, title, due_date, status, position
- `tasks`: project_id, milestone_id, title, status (`todo | in_progress | review | done`), priority, assignee_id, due_date, estimate_hours, position
- `comments`: project_id, author_id, body, visibility (`internal | client`)
- `files`: project_id, uploaded_by, name, blob_pathname, blob_url, content_type, size_bytes, is_seed

**Finance**
- `invoices`: client_id, project_id, number (`INV-1042`), status (`draft | sent | paid | void`; "overdue" = sent and past due, computed in queries), currency, issue_date, due_date, subtotal_cents, tax_cents, total_cents, paid_at
- `invoice_items`: invoice_id, description, quantity, unit_price_cents, amount_cents
- `payments`: invoice_id, provider (`stripe | demo`), provider_ref (unique, makes the webhook idempotent), amount_cents, currency, status
- `exchange_rates`: rate_date, base, quote, rate (daily Frankfurter cache)
- Preview: `expenses` (project_id, vendor_id, category, amount_cents, currency, spent_on, status, submitted_by), `vendors`, `purchase_orders`

**Preview modules**
- `leads`: company, contact_name, source, stage (`new | qualified | proposal | negotiation | won | lost`), value_cents, currency, owner_id, expected_close
- `time_entries`: user_id, project_id, task_id, worked_on, minutes, billable, note
- `leave_requests`: user_id, type, start_date, end_date, status
- `tickets`: client_id, subject, body, status, priority, assignee_id, created_by

**Platform**
- `activity_log`: actor_id, action (`invoice.paid`), entity_type, entity_id, summary, metadata (jsonb)
- `notifications`: user_id, type, title, link, read_at
- `ai_usage`: user_id, usage_date, requests, input_tokens, output_tokens (shown in settings; quota fallback if Upstash is down)
- v1.1: `api_keys` (name, prefix, key_hash, last_used_at, revoked_at), `webhook_endpoints`, `webhook_deliveries`, `help_articles` + embeddings (pgvector)

## 5. Authorization and multi-tenancy

1. **Who is asking.** `getViewer()` reads the session once per request and returns `{ userId, organizationId, role, clientId }`.
2. **What they may do.** `src/server/authz/permissions.ts` is one table from role to allowed actions (`invoice:read`, `invoice:pay`, `project:update`, `team:manage`, `assistant:use`, …). `can(viewer, action)` checks it, and `/app/team` renders the same table as the permissions matrix.
3. **Which rows they may see.** Every query lives in a Data Access Layer (`src/server/data/*`, marked `server-only`). Each function takes the viewer first and always filters by `organization_id`. For client users it also filters by `client_id`, and internal comments and budgets are hidden. Pages, Server Actions, API routes and AI tools all call these functions; an ESLint rule blocks importing the database anywhere else.
4. **Not found, not forbidden.** A client asking for another client's invoice gets a 404, so ids can't be probed.
5. **Tests.** Vitest + PGlite seed two organizations, each with two clients. The tests assert that every data function and every AI tool returns nothing across clients and organizations, and that each role's allowed and denied actions match the table.

| Role | Can |
|---|---|
| admin | everything, including team, roles and settings |
| manager | all clients, projects and invoices; no team/role changes |
| accountant | invoices, payments, expenses, reports; read-only projects |
| staff | projects and tasks; no finance |
| client | own projects (client-visible comments), own files and invoices, pay own invoices |

## 6. AI assistant

- `AiProvider.chat({ system, messages, tools, maxOutputTokens })` streams text and tool calls. The adapters are Groq (default, `groq-sdk`), Gemini (fallback when Groq returns 429, `@google/genai`) and Claude (if time allows, `@anthropic-ai/sdk`).
- `/api/assistant` (Route Handler) checks the session and quota, then runs the loop: model → tool calls → our tools (Data Access Layer with the viewer) → model, at most 4 steps, and streams the reply to the panel.
- Read-only tools: `search_clients`, `list_projects`, `get_project`, `list_invoices`, `get_invoice`, `revenue_summary`. Client users get only the project and invoice tools, scoped to their own data. Reminders are drafted by the model from `get_invoice` data and shown as copyable text.
- The system prompt says tool results and user-written text are data, not instructions, that it cannot send or change anything, and gives today's date and the organization's currency.
- Quotas: about 25 messages per user per day and a global daily cap below Groq's free limit (Upstash). When the quota is used up, the panel says so plainly. Replies are capped at about 800 tokens and history at 20 messages.
- The seed adds one project comment with a prompt-injection attempt, for the demo.

## 7. Folder structure

```
src/
  app/
    (marketing)/          page.tsx (landing), roadmap/
    (auth)/login/
    app/                  layout.tsx (shell), page.tsx (dashboard),
                          clients/ projects/ invoices/ team/ activity/ settings/ assistant/
                          sales/ time/ expenses/ hr/ support/ reports/   ← Preview
    portal/               page.tsx, projects/[id]/, invoices/[id]/, support/
    api/                  auth/[...all]/, assistant/, stripe/webhook/, cron/reset/, v1/ (v1.1)
  components/
    ui/                   shadcn
    app-shell/            sidebar, top bar, command palette, demo banner
    data-table/  charts/  assistant/  preview/
  server/                 server-only code
    db/                   client.ts, schema/ (one file per area)
    auth/                 auth config, getViewer()
    authz/                permissions.ts, scope.ts, errors.ts
    data/                 Data Access Layer, one file per module
    actions/              Server Actions, one file per module
    ai/                   provider.ts, adapters/, tools.ts, run.ts, quota.ts
    payments/             provider.ts, adapters/stripe.ts, adapters/demo.ts
    integrations/         status.ts, frankfurter.ts, nager.ts, ratelimit.ts
  lib/                    utils.ts, money.ts, dates.ts
  config/                 site.ts, nav.ts (modules + Preview flags)
drizzle/                  migrations
scripts/                  seed.ts (deterministic faker seed), reset.ts
tests/                    authz/, ai-tools/
```

## 8. Accounts, in signup order

1. **Neon**: needed tonight for the schema and seed
2. **Groq** and **Google AI Studio**: free, no card
3. **Upstash**: free Redis
4. **Vercel Blob store**: Vercel → Storage
5. **Stripe**: try it; if it won't open from Pakistan, set `PAYMENT_PROVIDER=demo`

Put each key into `.env.local` yourself (see `.env.example`). v1.1 accounts come later.

## 9. Tonight, after approval

Drizzle schema and migrations → deterministic seed → push to a new public GitHub repo (I'll ask first) → connect Vercel (I'll ask first) → first deploy.
