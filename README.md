# kolonaki

**PLG activation boilerplate** — Next.js 15 + Supabase + Resend + PostHog

Wires up the full activation loop out of the box: segmentation wizard → activation checklist → aha moment → workspace invite. Customize everything in `kolonaki.config.ts`. Delete what you don't need.

## What you get

- Signup + email/password auth (Supabase Auth)
- Post-signup segmentation wizard (answers stored in `user_metadata` + sent to PostHog as `identify()` traits)
- Activation checklist with per-step progress tracking
- Aha moment detection + celebration banner when all required steps complete
- Workspace invite flow: token-based email links, email binding check, atomic accept
- Triggered email sequences (signup, aha moment, stalled nudge) via Resend + React Email
- Daily activation nudge cron (`/api/cron/activation-nudge`) via Vercel cron + Resend
- PostHog: server-side `identify` + `capture` on every key activation event

## Prerequisites

- [Supabase](https://supabase.com) project
- [Resend](https://resend.com) account with a verified sender domain
- [PostHog](https://posthog.com) project
- [Vercel](https://vercel.com) account (for cron + deploy)
- Node.js 20+

## Quick start

```bash
git clone <repo-url> your-app
cd your-app
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page — new publishable key format (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | Same page — service role equivalent, server-only |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog → Project Settings → Project API key |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` |

> **Key format note:** This project uses the new Supabase API key format. Do not use `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` — those are the legacy names. See [Supabase API key docs](https://supabase.com/docs/guides/api/api-keys).

## Database setup

The migration is at `supabase/migrations/20250101000000_create_invitations.sql`.

**Option A — Supabase CLI (recommended):**

```bash
supabase init          # creates supabase/config.toml (one-time)
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

**Option B — SQL editor:**

Paste the contents of the migration file into the Supabase SQL editor and run it.

The only custom table is `invitations`. All other activation data lives in `auth.users.user_metadata`.

Also configure auth redirect URLs in Supabase dashboard → Authentication → URL Configuration:

- Site URL: `http://localhost:3000` (dev) / your production URL (prod)
- Redirect URLs: `http://localhost:3000/**`

## Customize

Everything that changes per-product lives in `kolonaki.config.ts`:

```ts
product.name           // your app name
product.fromEmail      // verified Resend sender (e.g. onboarding@yourapp.com)

segmentation.questions // post-signup questionnaire — answers become PostHog traits

activation.steps       // checklist items: id, title, description, actionLabel, actionHref
activation.ahaEventName      // PostHog event name that triggers the aha moment
activation.ahaEventLabel     // text shown in the aha celebration banner

workspace.enabled      // false = skip invite flow entirely (solo products)
workspace.allowedDomainsOnly // true = only same-domain emails can be invited

emails.sequences       // email triggers: signup / aha_moment_reached / checklist_stalled
```

Step `description` can be a string or a function `(seg) => string` that receives the user's segmentation answers, so you can personalize copy per role/use case.

## Auth flow

```
signup → segmentation wizard → dashboard (checklist)
                                     ↓
                          steps marked complete via Server Actions
                                     ↓
                          all required steps done → PostHog event → aha banner
                                     ↓
                          invite teammate → token email via Resend
                                     ↓
                          recipient clicks link → /invite/accept → Server Action
```

**Critical constraint:** `exchangeCodeForSession()` and cookie writes must happen in Route Handlers or Server Actions — not Server Components. Server Components cannot write cookies. The reset-password callback and invite flows both use Route Handlers for this reason.

## Email sequences

Three triggers fire emails automatically:

| Trigger | When |
|---|---|
| `signup` | User completes signup |
| `aha_moment_reached` | All required checklist steps complete |
| `checklist_stalled` | Cron job runs daily and finds users who haven't progressed |

Email templates live in `lib/emails/`. They use React Email components. The `fromEmail` in `kolonaki.config.ts` must be a verified Resend sender address.

> Note: `delayMinutes` in email sequences is defined but not yet implemented — emails fire immediately. Adding delay requires a proper queue (Vercel Queues or similar).

## Deploy

```bash
vercel deploy
```

Set all variables from `.env.example` in your Vercel project settings. The cron at `vercel.json` fires `/api/cron/activation-nudge` daily — it requires `CRON_SECRET` to be set, matching the value in your env.

## Running things

```bash
npm run dev         # dev server on :3000
npm run build       # build + Zod config validation (fails loudly on misconfigured kolonaki.config.ts)
npx vitest run      # unit tests (validate, email, actions)
```

## Claude Code AI tooling

This repo ships with Claude Code configuration for AI-assisted development.

**Skills** (`skills-lock.json`) — auto-loaded when you open this project in Claude Code:
- `supabase`, `supabase-postgres-best-practices` — Supabase schema, RLS, queries
- `resend`, `react-email`, `email-best-practices` — Resend API, React Email templates
- `shadcn` — shadcn/ui component installation and composition

**MCPs** (`.mcp.json`) — auto-configured for this project:
- `supabase` — query your DB, inspect schema, manage auth
- `posthog` — analytics, flags, experiments
- `stripe` — payment flows and error lookup
- `vercel` — deployments, logs, env vars
- `shadcn` — component search and install

Each HTTP MCP requires a one-time OAuth authentication — Claude Code will prompt you on first use.

**gstack** — skill-based workflows (`/ship`, `/qa`, `/investigate`, etc.). Install once:

```bash
git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup
```
