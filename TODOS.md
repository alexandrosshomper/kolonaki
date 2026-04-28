# TODOS

## P2 — Activation State Infrastructure

### user_activation table

**What:** Postgres table in `public` schema replacing `user_metadata` as the store for activation state: `onboarding_steps`, `aha_reached_at`, `nudge_sent_at`, `segmentation`, `segmentation_completed_at`.
**Why:** `user_metadata` is a JWT blob with ~1KB practical limit, grows unbounded as config evolves, and cannot support atomic conditional updates (required for a true aha race fix). Phase 2 admin funnel also needs SQL-queryable access to activation state.
**Pros:** Atomic aha detection via SQL CAS, no JWT size limit, indexed SQL queries for cron and admin funnel, unblocks proper race condition fix.
**Cons:** Requires migration + RLS policy + updating all read/write paths in `lib/kolonaki/actions.ts` and the cron. Adds a DB round-trip on every auth request.
**Context:** Schema: `(user_id uuid PK references auth.users(id), onboarding_steps jsonb, aha_reached_at timestamptz, nudge_sent_at timestamptz, segmentation jsonb, segmentation_completed_at timestamptz)`. Replace `supabase.auth.updateUser({ data: meta })` with `supabase.from('user_activation').upsert(...)`. RLS: authenticated users can read/write their own row only.
**Effort:** M (human: ~1d / CC: ~2h). **Priority:** P2. **Depends on:** Phase 1 shipped.

---

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

## P3 — Performance

### Middleware double getUser() deduplication

**What:** Modify `utils/supabase/middleware.ts` to return `{ response, user }` from `updateSession()`. Update `proxy.js` to use the returned user instead of calling `getUser()` a second time.
**Why:** Every protected page load (`/dashboard`, `/onboarding`) currently triggers two Supabase auth verifications — one inside `updateSession`, one in the explicit `getUser()` call in `proxy.js`. That is one wasted round-trip per page load.
**Pros:** Halves the auth overhead on every protected route. Zero behavior change.
**Cons:** Minor refactor to `updateSession` signature; callers outside `proxy.js` are unaffected (they don't call `getUser` themselves).
**Context:** `proxy.js:15` calls `updateSession(request)`. `proxy.js:56,67` calls `supabase.auth.getUser()` again to check the user. Solution: `updateSession` already has the user after the internal `getUser()` call — thread it through the return value.
**Effort:** S (human: ~30min / CC: ~5min). **Priority:** P3.

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

## Marketing website

### Homepage complete with content and best practices

### Features page

### Features subpages

### Pricing PAge

### About us page

### Legal pages

---

## P3 — Sniper Link Follow-ups (from /qa 2026-04-28)

### Real fromEmail in kolonaki.config.ts

**What:** Replace placeholder `onboarding@yourproduct.com` in `kolonaki.config.ts:6` with the project's actual Resend verified sender address.
**Why:** The sniper link's Gmail/Yahoo/Proton/AOL search queries filter by this sender. Until it's set to a real sending address, the search will return zero results in users' inboxes and the sniper link is theatre, not function.
**Pros:** Activates the entire feature for real users. One-line change.
**Cons:** Requires a Resend account with a verified sender domain.
**Context:** Search query format: `from:(onboarding@yourproduct.com)+in:anywhere+newer_than:1h`. Only matches if Resend sends from this exact address. Verify match between `lib/kolonaki/email.ts` `from` field and the URL filter.
**Effort:** S (human: ~5min / CC: ~2min). **Priority:** P1 (blocks feature being useful in prod).

### Mobile native deep links for sniper button

**What:** Detect `iPhone`/`Android` user agent in `app/check-email/sniper-link-button.tsx` and switch to native app URLs (`googlegmail://`, `ms-outlook://`, `protonmail://`, etc.) when present.
**Why:** Mobile users currently get the web inbox in their phone's browser. Native deep links open the actual mail app, which is the more polished UX.
**Pros:** Matches buttondown/sniper-link parity. Smoother mobile UX. Adds ~30 lines.
**Cons:** Requires UA parsing. Native URLs can fail silently if the app isn't installed (no graceful fallback in v1 buttondown either).
**Context:** Reference `lib/sniper-link/providers.ts` — buttondown's full provider definitions include `getIosLink` and `getAndroidLink` (Android intent URLs with HTTPS fallback). Easiest path: extend `Provider` type with these methods, port the implementations from buttondown, add UA detection in the client component.
**Effort:** S (human: ~2h / CC: ~15min). **Priority:** P3.

### Memoize sniper link MX lookup

**What:** Wrap `getSniperLink()` call in `app/check-email/sniper-link-button.tsx` with `useMemo` (or move detection to a `useEffect` that only re-runs on `email` change — currently is, but the result isn't cached across mounts).
**Why:** If a user navigates back to /check-email multiple times with the same email cookie, the MX request fires each time. Cloudflare DoH is 8ms so it's not painful, but it's wasted network.
**Pros:** Eliminates repeat DNS queries for unchanged email. Low effort.
**Cons:** Negligible — MX lookups are 8ms.
**Context:** Add a module-level `Map<string, SniperLink | null>` cache keyed on `${recipient}|${sender}` in `lib/sniper-link/index.ts`. Or use SWR/React Query if you want per-tab cache. Cheapest: in-memory module Map.
**Effort:** XS (human: ~15min / CC: ~5min). **Priority:** P4 (polish).

### PostHog funnel for sniper link activation lift

**What:** Build a PostHog funnel: `signup_form_submitted` → `sniper_link_clicked` → `email_confirmed`. Compare to control: signups that did NOT click sniper link.
**Why:** Measures whether the sniper link actually improves email confirmation rates (the entire point of the feature). Without this metric, you don't know if it's worth the maintenance.
**Pros:** Quantifies the activation lift. Justifies (or kills) the feature based on data.
**Cons:** Needs ~100+ signups before the funnel is statistically meaningful.
**Context:** Event already wired (`sniper_link_clicked` with `provider` + `recipient_domain`). Just needs a PostHog insight/funnel built. Use the `/posthog-insights` skill or build directly in PostHog dashboard.
**Effort:** XS (human: ~30min / CC: N/A — manual in PostHog UI). **Priority:** P3.

---

## QA Deferred — 2026-04-24

### Hydration mismatch on input forms (ISSUE-002)

**What:** Add `suppressHydrationWarning` to password inputs if this mismatch surfaces in production error monitoring.
**Why:** Chromium's built-in password manager injects `caret-color: transparent` into inputs between server render and React hydration. Currently only observable in the gstack headless browser, not in real user sessions.
**Priority:** P3 / only act if confirmed in Sentry/PostHog.

### proxy.js → proxy.ts migration

**What:** Rename `proxy.js` to `proxy.ts` and add Node.js runtime types.
**Why:** Next.js 16 recommends TypeScript for the middleware/proxy file. Non-breaking, cosmetic improvement.
**Priority:** P3.
