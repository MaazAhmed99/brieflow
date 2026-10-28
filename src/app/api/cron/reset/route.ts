import { resetDemo } from "@/server/demo-reset";

// The nightly demo reset (Vercel Cron, see vercel.json). Vercel sends
// CRON_SECRET as a Bearer token; anyone else gets a 401.

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (!demoPassword) return Response.json({ error: "DEMO_USER_PASSWORD is not set." }, { status: 500 });

  return Response.json({ ok: true, ...(await resetDemo(demoPassword)) });
}
