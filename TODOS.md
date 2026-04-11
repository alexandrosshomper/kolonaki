# TODOS

## P2 — Post Phase 1A

### Email preview route
**What:** Dev-only route at `/api/preview-email?template=welcome` (also `aha_moment_reached`, `nudge`) that renders React Email components in the browser.
**Why:** Speeds up email template iteration without a real Resend account or live send.
**Pros:** Essential DX for onboarding email customization. Zero production risk (NODE_ENV guard).
**Cons:** Adds a route that must be carefully guarded.
**Context:** Start from `config.emails.sequences` to find the template list, render the matching component from `lib/emails/` server-side, return HTML.
**Effort:** S (human: ~3h / CC: ~10min). **Priority:** P2. **Depends on:** Phase 1A emails shipped.

### Cron query optimization (Postgres view)
**What:** Postgres materialized view in `public` schema indexing `user_metadata` fields: `segmentation_completed_at`, `aha_reached_at`, `nudge_sent_at`. Replaces O(n) `listUsers()` pagination scan in the activation-nudge cron with an indexed SQL query.
**Why:** `listUsers()` scans all users on every hourly cron run. Fine until ~10k users, bottleneck beyond that.
**Pros:** SQL-native filtering, avoids loading all user data into memory, pagination becomes unnecessary.
**Cons:** Requires Postgres view in public schema + migration. Adds complexity. Premature before scale is proven.
**Context:** Cron route at `app/api/cron/activation-nudge/route.ts`. Current pattern: `supabase.auth.admin.listUsers({ page, perPage })` with in-process filter. Replace with `supabase.from('user_activation_view').select().filter(...)` once view exists.
**Effort:** M (human: ~4h / CC: ~15min). **Priority:** P2. **Depends on:** Phase 1A shipped, user count approaching 5k.

### Aha celebration UI
**What:** Confetti animation + sonner toast when `trackAhaEvent()` returns `{ aha: true }`.
**Why:** The emotional peak of the onboarding flow. Makes the aha moment feel real and memorable.
**Pros:** Zero backend work. `sonner` already installed. High emotional impact.
**Cons:** Needs `canvas-confetti` package (~3KB gzipped).
**Context:** `trackAhaEvent()` returns `{ aha: boolean }`. On `aha: true` in the checklist client component, fire `toast.success("You did it!")` and `confetti()`. Guard: only fire once per session (check `aha_reached_at` in initial server render).
**Effort:** S (human: ~2h / CC: ~10min). **Priority:** P2. **Depends on:** Checklist UI (Phase 1B).

---

## P3 — Auth & Infrastructure

### Clerk for auth
**What:** Replace Supabase Auth with [Clerk](https://clerk.com) as the authentication provider.
**Why:** Clerk provides a dramatically better out-of-the-box auth UX (prebuilt UI components, MFA, passkeys, social logins, org/team support) with less custom code to maintain than rolling auth on top of Supabase.
**Pros:** Hosted, polished sign-in/sign-up flows. Built-in user management dashboard. First-class Next.js App Router integration via `@clerk/nextjs`. Webhook-based user lifecycle events replace manual Supabase auth hooks.
**Cons:** Adds a paid dependency. Supabase Auth is currently deeply integrated (RLS policies use `auth.uid()`). Migration requires updating RLS to use Clerk JWT claims, replacing `supabase.auth.*` calls throughout, and re-wiring the user metadata pattern.
**Context:** Migration path: (1) Install `@clerk/nextjs`, wrap root layout in `<ClerkProvider>`. (2) Add Clerk JWT template for Supabase so RLS still works (`auth.jwt() ->> 'sub'`). (3) Replace `createServerComponentClient` auth calls with `currentUser()` / `auth()` from Clerk. (4) Re-wire user creation webhook to Clerk's `user.created` event instead of Supabase auth trigger. (5) Update `user_metadata` table foreign key to use Clerk `userId` as PK. Clerk MCP is available for guided setup.
**Effort:** L (human: ~2d / CC: ~2h). **Priority:** P3.

---

## P3 — Boilerplate & Developer Experience

### MCPs in boilerplate
**What:** Add MCP server configurations to the boilerplate that match the tools already used in the project (e.g. Supabase, GitHub, Stripe, Postman, Notion, Slack, PostHog, Playwright).
**Why:** New developers starting from the boilerplate should have the same agentic tooling context available immediately, without manual MCP setup.
**Pros:** Zero friction onboarding for AI-assisted development. Keeps the boilerplate self-consistent.
**Cons:** MCPs are environment-specific; config must use env var references, not hardcoded credentials.
**Context:** Audit which MCPs are active in `.claude/settings.json` and mirror them into the boilerplate's MCP config scaffold, with placeholder env vars documented in `.env.example`.
**Effort:** S (human: ~1h / CC: ~10min). **Priority:** P3.

### CLAUDE.md for boilerplate
**What:** Write a `CLAUDE.md` at the root of the boilerplate that describes the project structure, key conventions, skills available, and how Claude Code should behave in this codebase.
**Why:** Without a `CLAUDE.md`, every new session starts cold. A good `CLAUDE.md` means Claude Code can orient itself in under one round-trip.
**Pros:** Dramatically improves AI-assisted development quality from day one. Acts as living documentation.
**Cons:** Must be kept up to date as the boilerplate evolves.
**Context:** Cover: tech stack (Next.js App Router, Supabase, Resend, Stripe), folder conventions, env var requirements, available gstack skills, and any non-obvious patterns (e.g. server actions pattern, aha-moment tracking).
**Effort:** S (human: ~1h / CC: ~15min). **Priority:** P3.

### Marketing site page markdowns (auto-updating)
**What:** Maintain canonical Markdown files for the three main marketing pages — `docs/marketing/landing.md`, `docs/marketing/products.md`, `docs/marketing/pricing.md` — that are auto-regenerated or validated on each commit/deployment.
**Why:** Keeps a source-of-truth representation of public-facing copy that AI agents, LLMs, and SEO tools can consume without parsing JSX. Also simplifies copy reviews.
**Pros:** Enables LLM-assisted copy iteration. Easy diff review in PRs. Can seed AI context for future rewrites.
**Cons:** Requires a generation step (either a CI script or a pre-commit hook) to stay in sync with the actual page components.
**Context:** Options: (1) a pre-commit hook that runs a scraper against the built output, or (2) a lightweight script that imports page component trees and extracts string literals. Trigger on changes to `app/(marketing)/**`.
**Effort:** M (human: ~4h / CC: ~30min). **Priority:** P3.

### SEO optimization
**What:** Systematic SEO pass across all marketing pages: meta tags, Open Graph, structured data (JSON-LD), sitemap, `robots.txt`, canonical URLs, and Core Web Vitals review.
**Why:** Organic discovery is the zero-cost acquisition channel. Missing basics (OG tags, sitemap) leave significant indexability on the table.
**Pros:** Compound returns over time. Most items are one-time setup.
**Cons:** Structured data and CWV tuning can be time-intensive; image optimization may require asset pipeline changes.
**Context:** Use Next.js `metadata` API for per-page meta/OG. Add `app/sitemap.ts` and `app/robots.ts`. Add `Organization` + `SoftwareApplication` JSON-LD on landing page. Run Lighthouse CI in the deployment pipeline to gate on CWV regressions. Reference `docs/marketing/*.md` (above) for consistent keyword usage across pages.
**Effort:** M (human: ~6h / CC: ~45min). **Priority:** P3. **Depends on:** Marketing site page markdowns.
