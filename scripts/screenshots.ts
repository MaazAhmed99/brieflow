// Captures real screenshots of the running app for the landing page and README.
// Usage (with `db:local` and `dev` running):  corepack pnpm@9.15.4 screenshots
// Uses the installed Microsoft Edge through playwright-core, so no browser download.

import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright-core";

const BASE = process.env.SCREENSHOT_URL ?? "http://localhost:3000";
const OUT = "public/screenshots";

async function signInAs(page: Page, role: string) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: new RegExp(`Try as ${role}`) }).click();
  await page.waitForURL(/\/(app|portal)/);
}

async function shoot(page: Page, name: string, path: string, prepare?: (page: Page) => Promise<void>) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState("networkidle");
  if (prepare) await prepare(page);
  await page.waitForTimeout(600); // let charts finish their entrance animation
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 85 });
  console.log("saved", `${OUT}/${name}.jpg`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" });
  const page = await context.newPage();

  await signInAs(page, "Admin");
  await shoot(page, "dashboard", "/app");
  await shoot(page, "projects-board", "/app/projects", (p) => p.getByRole("tab", { name: "Board" }).click());
  await shoot(page, "invoices", "/app/invoices");
  await shoot(page, "reports", "/app/reports");
  await shoot(page, "team", "/app/team", (p) => p.getByText("Roles and permissions").scrollIntoViewIfNeeded());

  await signInAs(page, "Client");
  await shoot(page, "client-portal", "/portal");
  await shoot(page, "client-invoice", "/portal", async (p) => {
    await p.getByRole("link", { name: /INV-/ }).first().click();
    await p.waitForURL(/\/portal\/invoices\//);
  });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
