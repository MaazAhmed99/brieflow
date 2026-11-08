# Going live (about 15 minutes)

The live site (https://brieflow-ten.vercel.app) needs a database and a few secrets before the demo sign-in works. Everything below happens in your browser on vercel.com. You never paste a secret into chat.

## 1. Create the database (Neon, free)

1. Open vercel.com → project **brieflow** → **Storage** tab → **Create Database** → **Neon** (Serverless Postgres) → **Continue**.
2. Accept Neon's free plan. Pick the region **Washington, D.C. (iad1) / US East**, the same as the site.
3. Name it `brieflow-db` and click **Create**, then **Connect** it to the **brieflow** project. Tick **Production, Preview and Development**.

Vercel now adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to the project automatically.

## 2. Create file storage (Vercel Blob, free)

1. Same **Storage** tab → **Create Database** → **Blob** → name it `brieflow-files` → **Create**.
2. Connect it to **brieflow** with all three environments ticked. Vercel adds `BLOB_READ_WRITE_TOKEN`.

## 3. Add the secrets

Open **Settings → Environment Variables**. Add each of these with **all three environments** ticked:

| Name | Value |
|---|---|
| `BETTER_AUTH_SECRET` | A long random string (see below) |
| `BETTER_AUTH_URL` | `https://brieflow-ten.vercel.app` |
| `DEMO_USER_PASSWORD` | Another random string, 12+ characters |
| `CRON_SECRET` | Another random string |
| `GROQ_API_KEY` | Your key from console.groq.com (starts with `gsk_`) |

To make a random string, run this in a terminal and copy the output (once per secret):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Optional:
- `GEMINI_API_KEY`: the AI fallback.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`: Stripe test-mode keys only, starting `sk_test_` and `whsec_`. Without them, payments use the labelled demo checkout.

## 4. Tell Claude "env is set"

Claude then does the rest:

1. Pulls the variables into a local, git-ignored file with `vercel env pull`. You don't copy anything by hand.
2. Creates the tables and loads the demo data into Neon. This uses the same `DEMO_USER_PASSWORD`, so the one-click demo buttons work.
3. Redeploys and checks every role on the live site, plus the AI assistant.
