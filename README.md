# LearnHub

Academic learning platform built with **Next.js**, **Supabase** (Postgres + Auth), and server-side AI providers.

## Stack

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Supabase Auth (email/password) synced to Postgres `"user"` / `profiles`
- Postgres via `DATABASE_URL` (Supabase pooler) with RLS + `/api/*` routes
- TanStack Query for workspace and admin data
- Light / dark / system themes (LearnHub teal `#1B6B5A`, ink `#14202B`)

## Quick start

1. Copy `.env.example` to `.env.local` and set **Supabase** + **DATABASE_URL** + **AI** keys. Set **`NEXT_PUBLIC_APP_URL`** to your public site URL (e.g. `https://learnhub.example.edu`) so Open Graph / Twitter link previews use the correct domain and logo.
2. Install: `pnpm install`
3. Apply schema: `pnpm db:migrate` (runs `db/migrations/*.sql` against `DATABASE_URL`)
4. Seed demo auth users: `pnpm supabase:seed`
5. Seed academic catalogue (optional): `pnpm db:seed`
6. Run: `pnpm dev`
7. Open [http://localhost:3000](http://localhost:3000)

## Development login credentials (local / seeded only)

| Email | Password | Role | Workspace home |
|-------|----------|------|----------------|
| student@learnhub.demo | LearnHubDemo2026! | student | `/dashboard` |
| lecturer@learnhub.demo | LearnHubDemo2026! | lecturer | `/lecturer/dashboard` |
| admin@learnhub.demo | LearnHubDemo2026! | admin | `/admin/dashboard` |
| superadmin@learnhub.demo | LearnHubDemo2026! | super_admin | `/super-admin/dashboard` |

Password must match `DEMO_ACCOUNT_PASSWORD` when seeding. Rotate both together in production.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Next.js dev server |
| `pnpm db:migrate` | Apply Postgres migrations |
| `pnpm db:seed` | Academic catalogue + sample content |
| `pnpm supabase:seed` | Supabase Auth demo users + `"user"` sync |
| `pnpm typecheck` | TypeScript |
| `pnpm test:e2e` | Playwright smoke tests |

## Deploy on Vercel

Sign-in calls Supabase Auth, then **`GET /api/workspace`**, which needs Postgres. If that step fails, the login form shows *“The service could not complete this request.”*

1. In **Vercel → Settings → Environment Variables**, set (Production and Preview):
   - `NEXT_PUBLIC_APP_URL` = `https://learnhub-gh.vercel.app` (your deployment URL)
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL` = **Session pooler** URI from Supabase (host like `aws-1-….pooler.supabase.com:5432`, user `postgres.<project-ref>`)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, for seeding)
2. On your machine (with the same `DATABASE_URL` in `.env.local`), run **`pnpm db:migrate`** then **`pnpm supabase:seed`** so demo users exist in **production** Auth + Postgres.
3. Redeploy, then open **`/api/health`** — every check should be `"ok"`.
4. Sign in with the demo table above (password from `DEMO_ACCOUNT_PASSWORD`).

## Environment

See `.env.example` for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `GROQ_API_KEY` / `AI_PROVIDER`, and Vercel Blob settings for uploads when enabled.
