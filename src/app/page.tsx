import {
  ArrowRightIcon,
  BarChart3Icon,
  Building2Icon,
  CreditCardIcon,
  FolderKanbanIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import clientInvoiceShot from "../../public/screenshots/client-invoice.jpg";
import dashboardShot from "../../public/screenshots/dashboard.jpg";
import projectsShot from "../../public/screenshots/projects-board.jpg";
import reportsShot from "../../public/screenshots/reports.jpg";

export const metadata: Metadata = {
  title: `${siteConfig.name}: run your agency from one place`,
  description: siteConfig.description,
};

const REPO_URL = "https://github.com/MaazAhmed99/brieflow";

const features = [
  { icon: Building2Icon, title: "Clients and contacts", text: "Every client company with its contacts, notes, projects and balances." },
  { icon: FolderKanbanIcon, title: "Projects and tasks", text: "Milestones, tasks, files and comments, in a table or on a board." },
  { icon: CreditCardIcon, title: "Invoices and payments", text: "Multi-currency invoices that clients pay online (Stripe test mode)." },
  { icon: SparklesIcon, title: "AI assistant", text: "Ask questions about your data. It sees only what your role can see." },
  { icon: ShieldCheckIcon, title: "Roles and audit log", text: "Five roles, a client portal, and a record of every change." },
  { icon: BarChart3Icon, title: "Dashboard and reports", text: "Revenue, overdue invoices and projects at risk, at a glance." },
];

const highlights = [
  "Access rules in one place, checked on every page, action, API call and AI tool, with automated tests proving one client can't see another's data",
  "PostgreSQL with Drizzle ORM, versioned migrations and a deterministic seed",
  "Better Auth sign-in, Server Actions validated with Zod, and an audit log written in the same transaction as each change",
  "Stripe Checkout in test mode with a signed, idempotent webhook",
  "An AI assistant on free-tier models (Groq, with Gemini as fallback) using read-only tools",
  "Next.js 16, TypeScript, Tailwind CSS and shadcn/ui, deployed on Vercel",
];

function Screenshot({ src, alt, priority = false }: { src: StaticImageData; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-muted shadow-xl shadow-primary/5">
      <Image
        src={src}
        alt={alt}
        priority={priority}
        placeholder="blur"
        sizes="(min-width: 1024px) 960px, 100vw"
        className="aspect-[16/10] w-full object-cover object-top"
      />
    </div>
  );
}

function Showcase({
  eyebrow,
  title,
  text,
  image,
  alt,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  image: StaticImageData;
  alt: string;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-5 lg:gap-12">
      <div className={`space-y-3 lg:col-span-2 ${reverse ? "lg:order-2" : ""}`}>
        <p className="text-sm font-medium text-primary">{eyebrow}</p>
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground">{text}</p>
      </div>
      <div className="lg:col-span-3">
        <Screenshot src={image} alt={alt} />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" aria-label={`${siteConfig.name} home`}>
            <Logo />
          </Link>
          <nav className="hidden gap-5 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <Link href="/roadmap" className="hover:text-foreground">Roadmap</Link>
            <a href={REPO_URL} className="hover:text-foreground">GitHub</a>
          </nav>
          <Button asChild size="sm" className="ml-auto">
            <Link href="/login">Try the live demo</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl space-y-10 px-4 pt-16 pb-12 sm:pt-24">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <Badge variant="secondary">Portfolio demo · invented sample data</Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Run your agency from one place.
            </h1>
            <p className="text-lg text-pretty text-muted-foreground">
              {siteConfig.name} brings clients, projects, invoices, a client portal and an AI assistant into one
              app. Explore it as an admin, a manager, an accountant, a staff member or a client.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">
                  Try the live demo <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/roadmap">See what&apos;s built</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">No sign-up. Pick a role and look around; the data resets every night.</p>
          </div>
          <Screenshot src={dashboardShot} alt="The Brieflow dashboard with revenue, overdue invoices and a 12-month revenue chart" priority />
        </section>

        <section id="features" className="scroll-mt-16 border-t bg-muted/40">
          <div className="mx-auto max-w-6xl space-y-10 px-4 py-20">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">Everything a small agency runs on</h2>
              <p className="text-muted-foreground">
                The core modules work end to end. Pipeline, time tracking, expenses, HR, support and reports are
                read-only previews for now; the roadmap says what&apos;s next.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <li key={feature.title} className="space-y-2 rounded-xl border bg-card p-5">
                  <feature.icon className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl space-y-20 px-4 py-20">
          <Showcase
            eyebrow="Delivery"
            title="Every project on one board"
            text="See what's planned, active, on hold and done, with health flags for anything at risk. Open a project for its milestones, tasks, files and comments."
            image={projectsShot}
            alt="Projects board with columns for planned, active, on hold and completed projects"
          />
          <Showcase
            eyebrow="Client portal"
            title="Clients see their work and pay online"
            text="Each client signs in to their own portal: their projects, files, comments and invoices, and nothing from anyone else. Invoices are paid by card through Stripe in test mode."
            image={clientInvoiceShot}
            alt="An invoice in the client portal with a Pay button"
            reverse
          />
          <Showcase
            eyebrow="Finance"
            title="Know where the money is"
            text="Revenue received each month, what's outstanding and what's overdue, in your base currency with daily exchange rates."
            image={reportsShot}
            alt="Reports page with revenue and expenses per month and top clients"
          />
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">Built like a real product</h2>
              <p className="text-muted-foreground">
                {siteConfig.name} is a portfolio project by {siteConfig.author}, a React and Next.js developer. The
                code is public, so you can see exactly how it works.
              </p>
              <Button asChild variant="outline">
                <a href={REPO_URL}>Read the code on GitHub</a>
              </Button>
            </div>
            <ul className="space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-5 px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">See it for yourself</h2>
          <p className="text-muted-foreground">Sign in with one click as any role. Nothing you change is kept past tonight.</p>
          <Button asChild size="lg">
            <Link href="/login">
              Try the live demo <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <p>Built by {siteConfig.author}</p>
          <div className="flex gap-5">
            <Link href="/roadmap" className="hover:text-foreground">Roadmap</Link>
            <a href={REPO_URL} className="hover:text-foreground">Source code on GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
