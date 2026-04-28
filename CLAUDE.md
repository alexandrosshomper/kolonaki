# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# How to work in this Repo

## What this is

kolonaki is a **Next.js 15 + Supabase PLG activation boilerplate**. It wires up the full activation loop:
segmentation wizard → checklist → aha moment → workspace invite. It is NOT a full product —
it is a starting point that builders customize by editing `kolonaki.config.ts`.

Tech stack: Next.js 15 App Router, Supabase (Auth + Postgres), Resend + React Email,
PostHog (server-side `posthog-node` + client-side `posthog-js`), Vercel cron, Zod config validation, Vitest.

## LLM documentation references

Fetch these when working with the relevant tool — always current, never stale:

**Core stack**

- Next.js: https://nextjs.org/llms.txt
- Vercel: https://vercel.com/llms.txt
- Supabase: https://supabase.com/llms.txt
- Resend: https://resend.com/docs/llms.txt
- PostHog: https://posthog.com/llms.txt
- shadcn/ui: https://ui.shadcn.com/llms.txt

**Auth alternative**

- Clerk: https://clerk.com/llms.txt

**Tooling**

- GitHub: https://github.com/llms.txt
- Mintlify: https://www.mintlify.com/docs/llms.txt

## Next.js / Turbopack: never use dynamic process.env access in client code

`process.env[variable]` (dynamic key access) returns `undefined` in browser bundles.
Turbopack and webpack only inline `NEXT_PUBLIC_*` env vars when they appear as **static**
member expressions: `process.env.NEXT_PUBLIC_FOO`. If you put the key name in a variable
or array and loop over it, the bundler cannot see the reference and the value is never inlined.

This affects any "use client" component and any code imported by one.
`utils/supabase/config.js` uses explicit static references for this reason — do not
refactor it back to a dynamic lookup pattern.

Server-side code (Server Components, Route Handlers, Server Actions) uses real Node.js
`process.env` and is unaffected. The bug only surfaces on client-side renders (e.g.,
navigating to `/dashboard` after onboarding via `router.push`).

## Supabase API key naming — new format

This project uses the **new Supabase API key format**, not the legacy one. Key names changed:

| Legacy (do NOT use)             | New (use this)                         |
| ------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY`     | `SUPABASE_SECRET_KEY`                  |

`utils/supabase/config.js` accepts both for backwards compatibility, but always write
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in examples, docs, and new env references.
`NEXT_PUBLIC_SUPABASE_URL` is still required — the new publishable key format (`sb_publishable_...`)
is not a JWT and the project URL cannot be derived from it.

The admin client (`utils/supabase/admin.ts`) checks `SUPABASE_SECRET_KEY` first,
then falls back to `SUPABASE_SERVICE_ROLE_KEY`. Always set `SUPABASE_SECRET_KEY`.

## What to know before editing

### Supabase user_metadata is a shallow merge

`supabase.auth.updateUser({ data: X })` merges X into user_metadata at the **top level only**.
Nested objects (like `onboarding_steps`) are replaced, not merged. Always write the full
`UserActivationMeta` object in a single `updateUser` call. Never write partial nested objects.
See `lib/kolonaki/types.ts` for the canonical shape.

### Server Components cannot write cookies

Use Route Handlers or Server Actions. `/invite/set-cookie/route.ts` exists specifically because
`/invite/accept/page.tsx` (a Server Component) cannot set the invite cookie itself.

### Next.js 15 async APIs

`searchParams` and `cookies()` are Promises in Server Components and Server Actions — always `await` them.
Route Handlers use `new URL(request.url).searchParams` (synchronous URLSearchParams), never the async prop.

### Fire-and-forget emails

`sendKolonakiEmail(trigger, email)` is intentionally void — do not `await` it, do not add `.catch()` to callers.
It handles its own error swallowing internally. Same for `posthog.identify()` and `posthog.capture()` — they
return void, never call `.catch()` on them.

### acceptInvitation has an email binding check

The signed-in user's email must match `invitation.email`. Do not remove this check — it prevents
token-forwarding attacks. The update is atomic (`.is("accepted_at", null)`); do not replace it
with a read-then-write pattern.

### Middleware (proxy.js)

`PROTECTED_PREFIXES` controls auth gating. `/invite/accept` is intentionally absent — it must reach
unauthenticated users. `/onboarding` and `/dashboard` are protected. Do not add routes that need
unauthenticated access to PROTECTED_PREFIXES.

### Admin client vs user client

`createAdminClient()` uses the service role key and bypasses RLS. Only use it for operations
that intentionally act on other users' data (invite lookup, cron nudge). Use `createClient()`
for everything scoped to the current user.

## Invariants — do not break

- `UserActivationMeta` in `lib/kolonaki/types.ts` is the source of truth for what lives in user_metadata.
  Any new metadata field must be added here.
- `EmailSequence.trigger` is a closed enum: `"signup" | "aha_moment_reached" | "checklist_stalled"`.
  Adding a new trigger requires updating the Zod schema in `lib/kolonaki/validate.ts` AND
  adding a subject + React Email component in `lib/kolonaki/email.ts`.
- Step IDs in `kolonaki.config.ts` must be unique (enforced by Zod at build time) **and are permanent**.
  Never remove or rename a step ID once users are in the funnel — `onboarding_steps` in user_metadata
  stores IDs as keys. A renamed ID silently makes every existing user's progress for that step invisible.
- The cron at `app/api/cron/activation-nudge/route.ts` uses `timingSafeEqual` for the CRON_SECRET
  check — do not replace it with `===`.
- `delayMinutes` in EmailSequence is defined but not implemented. Do not add delay logic without
  a proper queue (Vercel Queues or similar) — fire-and-forget via Resend is the current approach.

## Running things

```bash
npx vitest run          # unit tests (19 tests across validate, email, actions)
npm run build           # builds + runs Zod config validation (fails loudly on bad config)
npm run dev             # dev server on :3000
```

## UI components — shadcn first

Full shadcn/ui docs index (fetch when needed): https://ui.shadcn.com/llms.txt

Before writing any UI component, use the shadcn MCP to check if one already exists:

1. `mcp__shadcn__search_items_in_registries` with `registries: ["@shadcn"]` and the component name
2. If found: `mcp__shadcn__get_add_command_for_items` to get the install command, then use it
3. After implementing: `mcp__shadcn__get_audit_checklist` to verify

Never write raw `<button>`, `<input>`, `<select>`, `<dialog>`, `<table>`, or layout primitives
from scratch. If a shadcn component exists for it, use that. Custom components are only
acceptable when shadcn has no equivalent.

Tokens live in `app/globals.css` (CSS variables) and `tailwind.config.ts`. Use those —
never hardcode colors, radii, or spacing outside the token system.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:

- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
- PostHog analytics, funnels, retention queries → invoke posthog:query or posthog:insights
- PostHog feature flags, create/edit/audit flags → invoke posthog:flags
- PostHog error tracking, view/triage errors → invoke posthog:errors
- PostHog A/B tests, experiments → invoke posthog:experiments
- Add/update PostHog event tracking in code → invoke posthog:instrument-product-analytics
- PostHog dashboards → invoke posthog:dashboards
- Deploy to Vercel, check deploy status → invoke vercel-plugin:deploy
- Vercel environment variables → invoke vercel-plugin:env
- Stripe payment errors, decode error codes → invoke stripe:explain-error
- Test Stripe payment flows → invoke stripe:test-cards
- Next.js App Router patterns, RSC vs client component, route handler questions → invoke vercel-plugin:nextjs
- Middleware changes, auth gating, proxy.js edits → invoke vercel-plugin:routing-middleware
- Cron routes, serverless function limits, Vercel function config → invoke vercel-plugin:vercel-functions
- Build a new feature end-to-end → invoke feature-dev:feature-dev
- Commit changes, commit + push + open PR → invoke commit-commands:commit-push-pr
- Instrument PostHog error tracking in code → invoke posthog:instrument-error-tracking
- PostHog surveys → invoke posthog:surveys
- PostHog signals / alerts → invoke posthog:signals
- Add/install a shadcn component (button, dialog, table, etc.) → invoke vercel-plugin:shadcn
- Initialize shadcn in a project (`shadcn init`) → invoke vercel-plugin:shadcn
- Build or publish a custom shadcn registry → invoke vercel-plugin:shadcn
- Migrate shadcn (radix unified package, RTL support) → invoke vercel-plugin:shadcn
- Compose a page layout using shadcn (settings, dashboard, auth, CRUD table) → invoke vercel-plugin:shadcn
- shadcn theming, CSS variables, dark mode, presets → invoke vercel-plugin:shadcn
- Resend API operations, send email, manage contacts/domains → invoke resend
- React Email template work, build or edit email components → invoke react-email
- Email deliverability, DNS setup, best practices → invoke email-best-practices
- Monitor email inbox, check received emails → invoke agent-email-inbox
- Supabase schema, migrations, RLS policies, storage → invoke supabase
- Postgres query patterns, indexes, performance → invoke supabase-postgres-best-practices
