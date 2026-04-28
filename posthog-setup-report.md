<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into kolonaki. Here's what was done:

- **`posthog-js`** installed and initialized via `instrumentation-client.ts` (Next.js 15.3+ approach — no provider needed). Client-side session replay and error tracking are enabled via `capture_exceptions: true`.
- **Reverse proxy** configured in `next.config.ts` so all PostHog requests route through `/ingest`, improving ad-blocker resilience and data accuracy.
- **Environment variables** written to `.env.local`: `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`.
- **Server-side events** added to `app/login/actions.ts` and `lib/kolonaki/actions.ts` using the existing `posthog-node` singleton at `lib/posthog/server.ts`. Server events include `posthog.identify()` calls so user identity is correlated across client and server.
- **Client-side events** added to `components/nav-user.tsx`, `components/forgot-password-form.tsx`, and `app/account/account-form.jsx` using `posthog-js` imported directly.

| Event | Description | File |
|---|---|---|
| `user_logged_in` | User successfully logs in with email and password | `app/login/actions.ts` |
| `user_signed_up` | User successfully creates a new account | `app/login/actions.ts` |
| `otp_verified` | User verifies their email OTP code after signup | `app/login/actions.ts` |
| `otp_resent` | User requests a new OTP verification code | `app/login/actions.ts` |
| `password_reset_completed` | User successfully resets their password | `app/login/actions.ts` |
| `user_logged_out` | User clicks Log out in the nav sidebar | `components/nav-user.tsx` |
| `password_reset_requested` | User submits the forgot password form | `components/forgot-password-form.tsx` |
| `profile_updated` | User saves changes to their account profile | `app/account/account-form.jsx` |
| `invitation_sent` | User sends an invitation email to another user | `lib/kolonaki/actions.ts` |
| `invitation_accepted` | New user accepts an invitation and completes registration | `lib/kolonaki/actions.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/378727/dashboard/1457732
- **Signups over time**: https://us.posthog.com/project/378727/insights/tdePiJPf
- **Daily active users (logins)**: https://us.posthog.com/project/378727/insights/EI9zLkKt
- **Signup → email verification funnel**: https://us.posthog.com/project/378727/insights/A93PX9o2
- **Password reset funnel**: https://us.posthog.com/project/378727/insights/sN2PMEtS
- **Invitation funnel**: https://us.posthog.com/project/378727/insights/eZYYF2yX

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
