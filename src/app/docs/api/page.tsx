import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CopyButton } from "@/components/copy-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiEndpoints, apiErrors, type ApiParam } from "@/config/api-docs";
import { demoApiKey } from "@/config/demo";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "API reference",
  description: `The ${siteConfig.name} REST API: read clients, projects and invoices with an API key.`,
};

const curl = (path: string) => `curl ${siteConfig.url}${path} \\\n  -H "Authorization: Bearer ${demoApiKey}"`;

function Code({ children, copy }: { children: string; copy?: boolean }) {
  return (
    <div className="relative min-w-0">
      <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 pr-12 font-mono text-[0.8rem] leading-relaxed">
        <code>{children}</code>
      </pre>
      {copy && <CopyButton value={children} className="absolute top-2 right-2" />}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="min-w-0 scroll-mt-20 space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Params({ params }: { params: ApiParam[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parameter</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {params.map((param) => (
            <TableRow key={param.name}>
              <TableCell className="font-mono text-xs">{param.name}</TableCell>
              <TableCell className="max-w-40 font-mono text-xs whitespace-normal text-muted-foreground">
                {param.type}
              </TableCell>
              <TableCell className="min-w-40 whitespace-normal">{param.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ApiDocsPage() {
  const connected = Boolean(process.env.DATABASE_URL);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
          <Link href="/" aria-label={`${siteConfig.name} home`}>
            <Logo />
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Try the demo</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl min-w-0 flex-1 space-y-12 px-4 py-10">
        <div className="space-y-3">
          <Badge variant="secondary">v1 · read-only</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">API reference</h1>
          <p className="max-w-2xl text-muted-foreground">
            Read your clients, projects and invoices from scripts, spreadsheets and automation tools. JSON over HTTPS,
            authenticated with an API key, and limited to your own organization by the same access rules as the app.
          </p>
          <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-sm">
            {[
              ["quick-start", "Quick start"],
              ["authentication", "Authentication"],
              ["pagination", "Pagination"],
              ["errors", "Errors"],
              ["endpoints", "Endpoints"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-primary underline-offset-4 hover:underline">
                {label}
              </a>
            ))}
          </nav>
        </div>

        {!connected && (
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              This deployment isn&apos;t connected to its database yet, so requests return 503 for now. The docs below
              describe the API as it runs locally and in the tests.
            </AlertDescription>
          </Alert>
        )}

        <Section id="quick-start" title="Quick start">
          <p>
            This key is public on purpose. It reads the fictional Larkspur Digital demo organization, can&apos;t change
            anything, and the data resets every night.
          </p>
          <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/50 py-1.5 pr-1.5 pl-4">
            <code className="min-w-0 flex-1 truncate font-mono text-sm">{demoApiKey}</code>
            <CopyButton value={demoApiKey} label="Copy the demo key" />
          </div>
          <Code copy>{curl("/api/v1/invoices?status=overdue")}</Code>
        </Section>

        <Section id="authentication" title="Authentication">
          <p>
            Send the key in the <code className="font-mono text-sm">Authorization</code> header on every request. Keys
            are stored only as a SHA-256 hash, can be revoked at any time, and each one is limited to 60 requests a
            minute.
          </p>
          <Code>{`Authorization: Bearer ${demoApiKey}`}</Code>
        </Section>

        <Section id="pagination" title="Pagination, money and dates">
          <p>
            Lists take <code className="font-mono text-sm">page</code> and{" "}
            <code className="font-mono text-sm">pageSize</code> (up to 100) and return the same envelope:
          </p>
          <Code>{JSON.stringify({ data: ["…"], pagination: { page: 1, pageSize: 25, total: 36, totalPages: 2 } }, null, 2)}</Code>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Amounts are integer cents with an ISO 4217 currency code, so{" "}
              <code className="font-mono text-sm">{`{ "amountCents": 754000, "currency": "USD" }`}</code> is $7,540.00.
            </li>
            <li>Dates are YYYY-MM-DD; timestamps are ISO 8601 in UTC.</li>
            <li>v1 only ever gains fields. Anything that would break a client goes to /api/v2.</li>
          </ul>
        </Section>

        <Section id="errors" title="Errors">
          <p>Every error has the same shape, with a message written for people:</p>
          <Code>{JSON.stringify({ error: { code: "not_found", message: "No invoice with that id." } }, null, 2)}</Code>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Meaning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiErrors.map((error) => (
                  <TableRow key={error.code}>
                    <TableCell className="tabular-nums">{error.status}</TableCell>
                    <TableCell className="font-mono text-xs">{error.code}</TableCell>
                    <TableCell className="min-w-56 whitespace-normal">{error.meaning}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <div id="endpoints" className="scroll-mt-20 space-y-12">
          {apiEndpoints.map((endpoint) => (
            <Section key={endpoint.id} id={endpoint.id} title={endpoint.title}>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge>GET</Badge>
                <code className="font-mono text-sm break-all">{endpoint.path}</code>
              </div>
              <p className="text-muted-foreground">{endpoint.description}</p>
              <Params params={endpoint.params} />
              <Code copy>{curl(endpoint.example)}</Code>
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium">Example response</summary>
                <div className="pt-3">
                  <Code>{JSON.stringify(endpoint.response, null, 2)}</Code>
                </div>
              </details>
            </Section>
          ))}
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <p>Built by {siteConfig.author}</p>
          <div className="flex gap-5">
            <Link href="/roadmap" className="hover:text-foreground">Roadmap</Link>
            <a href={siteConfig.repoUrl} className="hover:text-foreground">Source code on GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
