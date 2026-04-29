# Changelog

## [0.3.1] — 2026-04-29

### Changed

- `/check-email`: reordered the layout so the "Don't see it? Check your spam folder, or tap Resend." instruction appears above the Resend button. Reading order now matches action order — read the prompt, then take the action — instead of the user clicking the button first and noticing the instruction below

### Docs

- Expanded `TODOS.md` Marketing website section from empty placeholder headers into actionable entries (homepage, features overview, features subpages, pricing, about, legal) with full What/Why/Pros/Cons/Context/Effort/Priority structure
- Added `P3 — Post-Merge Canary for v0.3.0` (production smoke test for resend + sniper link) and `P4 — Operational` items (VERSION-vs-package.json convention, MCP stability audit)

## [0.3.0] — 2026-04-28

### Added — Sniper Link on /check-email

- "Open Gmail / Outlook / Proton / etc." primary CTA on the check-email page that takes users straight to their inbox with a pre-filtered search for the confirmation email
- `lib/sniper-link/providers.ts` — 8 provider definitions (Gmail, Outlook, Yahoo, Proton, iCloud, HEY, AOL, Mail.ru) with desktop deep-search URLs. Logic ported from buttondown/sniper-link (MIT)
- `lib/sniper-link/index.ts` — `getSniperLink(recipient, sender)` public API
- MX record lookup via Cloudflare DNS-over-HTTPS for custom-domain email (Workspace, M365). Recognizes when `you@yourcompany.com` actually uses Gmail/Outlook under the hood and shows the right button
- Ambiguity-aware MX matching — returns no provider when MX records split between multiple providers, instead of guessing wrong
- Gmail uses the `?authuser=email` resolver pattern (correct for multi-account / Workspace users) instead of the broken `/u/{email}/` pattern
- `app/check-email/sniper-link-button.tsx` — client component with skeleton-while-loading state and graceful no-provider fallback
- PostHog `sniper_link_clicked` event capture with `provider` + `recipient_domain` properties (sent with `send_instantly: true` to survive new-tab navigation)
- 20 vitest unit tests covering domain extraction, hardcoded provider matching, MX parsing, ambiguity rejection, and link generation

### Changed — /check-email security model

- Email displayed on /check-email now comes from an httpOnly cookie (`kolonaki_pending_signup_email`) set by `signup()` / `login()`, NOT from the URL. Closes an open-relay vector where `/check-email?email=victim@example.com` could be shared to trigger Resend on arbitrary addresses
- `app/login/actions.ts` — new `resendSignupConfirmation` server action wired to the Resend button. Uses the cookie email, never accepts user input. Returns generic messages on failure to prevent account enumeration
- `app/check-email/messages.ts` — allowlisted message keys (`msg=resend_success`, `msg=resend_error`, etc.) replace free-text URL params. Prevents reflected phishing copy from being injected into the page
- `app/check-email/url-cleanup.tsx` — strips message keys from the URL after read so refreshes don't re-show the banner and links don't leak status to referers
- Updated copy: "Don't see it? Check your spam folder, or tap Resend." (drops the directional "above" reference now that the sniper button sits above the resend form)

### Added — Cookie helpers

- `lib/auth/pending-signup-email.ts` — `setPendingSignupEmail`, `readPendingSignupEmail`, `clearPendingSignupEmail`. httpOnly, secure-in-prod, SameSite=Lax, 24h TTL covering the typical confirmation window

## [0.2.0] — 2026-04-11

### Added — PLG Activation Layer (Phase 1A + 1B)

**Core infrastructure**
- `kolonaki.config.ts` — central config file for product metadata, segmentation questions, checklist steps, email sequences, workspace settings, and activation thresholds
- `lib/kolonaki/types.ts` — `KolonakiConfig`, `ChecklistStep`, `SegmentationQuestion`, `EmailSequence`, `UserActivationMeta` type definitions
- `lib/kolonaki/validate.ts` — Zod-based `validateKolonakiConfig()` with build-time validation via `next.config.ts`
- `utils/supabase/admin.ts` — service-role admin client for RLS-bypassing operations
- `lib/posthog/server.ts` — PostHog server singleton (flushes on every event)
- `lib/resend/server.ts` — Resend singleton

**Email system**
- `lib/emails/WelcomeEmail.tsx`, `AhaEmail.tsx`, `NudgeEmail.tsx` — React Email templates
- `lib/kolonaki/email.ts` — `sendKolonakiEmail(trigger, to)` fire-and-forget helper

**Server actions** (`lib/kolonaki/actions.ts`)
- `completeSegmentation(answers)` — writes segmentation answers + seeded checklist steps to `user_metadata`, calls `posthog.identify()`
- `trackAhaEvent(stepId)` — idempotent aha detection: marks step done, checks required steps, fires PostHog event + aha email on first completion
- `sendInvitation(email)` — inserts invitation row, emails invite link
- `acceptInvitation(token)` — validates + accepts invite token via admin client

**Onboarding flows**
- `/onboarding/segmentation` — multi-step wizard with option cards and progress dots
- `/onboarding/checklist` — animated checklist with `motion/react`, progress bar, aha banner, "Skip to dashboard" escape hatch
- `/onboarding/invite` — workspace invite form (skippable, guarded by `config.workspace.enabled`)
- `/invite/accept` — saves token to `httpOnly` cookie for pre-login invites

**Cron**
- `app/api/cron/activation-nudge/route.ts` — hourly cron (Vercel, `vercel.json`) that nudges stalled users who completed segmentation but haven't reached aha after 24h

**Auth wiring**
- `proxy.js` — extended to auth-guard `/dashboard`, `/onboarding`, `/invite/accept`
- `app/login/actions.ts` — `verifyOtp()` now fires welcome email, handles invite token cookie, redirects to segmentation
- `app/auth/confirm/route.js` — magic-link confirm fires welcome email, redirects to segmentation

### Changed
- `package.json` — added `posthog-node`, `resend`, `@react-email/components`
- `next.config.ts` — runs `validateKolonakiConfig()` at build time

### Added
- `TODOS.md` — P2 backlog: email preview route, cron optimization, aha confetti, dashboard metrics

---

## [0.1.0] — initial release

Base Next.js 16 + Supabase SSR boilerplate with auth (OTP + password reset), dashboard shell, and UI component library.
