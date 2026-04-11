# Changelog

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
