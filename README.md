# Brieflow

An all-in-one operations platform for small digital agencies: CRM, projects, invoicing, a client portal and an AI assistant.

**Status: work in progress.** This is a portfolio demo with generated sample data. The first public version is planned for 28 Oct 2026; see [`docs/plan.md`](docs/plan.md) for the full plan and what is built so far.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS and shadcn/ui, PostgreSQL on Neon with Drizzle ORM, Better Auth, Vercel Blob, Stripe (test mode), and a free-tier AI provider (Groq, with Gemini as a fallback). Tests run with Vitest against an in-memory Postgres (PGlite).

## Run it locally

Requires Node 22 and pnpm 9 (this repo uses pnpm through corepack).

```bash
corepack pnpm@9.15.4 install
cp .env.example .env.local        # then fill in the values
corepack pnpm@9.15.4 db:migrate   # create the tables
corepack pnpm@9.15.4 db:seed      # load the demo data
corepack pnpm@9.15.4 dev
```

Run the tests with `corepack pnpm@9.15.4 test`.

---

Built by Maaz Ahmed.
