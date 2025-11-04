# Contributing Guide

Thank you for helping improve this project! This guide covers the conventions and tooling we use so that new contributors can get productive quickly.

## Prerequisites
- Node.js 18+
- npm (bundled with Node.js)
- A Supabase project (free tier is sufficient)

## Environment Setup
1. Copy `.env.example` to `.env.local`.
2. Fill in the Supabase credentials from your project settings (Project URL and anon service key).
3. Set `NEXT_PUBLIC_SITE_URL` to the URL where the app will run (e.g., `http://localhost:3000` in development).

```bash
cp .env.example .env.local
```

## Running the App Locally
```bash
npm install
npm run dev
```

Visit `http://localhost:3000` after the server starts.

## Standing Up Supabase
1. Create a project at [supabase.com](https://supabase.com/).
2. In the Supabase dashboard, go to **Project Settings → API**.
3. Copy the **Project URL** to `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`.
4. Copy the **anon public key** to `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY`.
5. (Optional) If using service-role keys for server-side flows, add `SUPABASE_SERVICE_ROLE_KEY` and load it only on the server.
6. Enable email auth under **Authentication → Providers → Email**.
7. Configure the site URL under **Authentication → URL Configuration** to match `NEXT_PUBLIC_SITE_URL` so Supabase sends correct redirect links.

## Running Auth Flows
- **Sign Up / Sign In**: Use the forms at `/signup` and `/login`. Successful flows create Supabase sessions stored in local storage via the Supabase JS client.
- **Forgot Password**: Visit `/forgot-password`, submit an email, and follow the link sent by Supabase. The reset page is served from `/reset-password` and expects the redirect parameters Supabase appends.
- **Local Testing**: Supabase emails sent to localhost environments will contain links using `NEXT_PUBLIC_SITE_URL`. Copy the link manually into the browser if your mail client cannot open it directly.

## Task Conventions
- Keep UI components in `components/` and business logic in `hooks/` or `lib/` as outlined in `docs/architecture.md`.
- When adding a new flow, update both the relevant component and hook, and ensure environment variables are documented in `.env.example`.
- Add tests or manual verification steps to PR descriptions when applicable.
- Run `npm run lint` before opening a PR to catch style issues.

## Submitting Changes
1. Create a feature branch.
2. Make your changes with clear commit messages.
3. Open a pull request summarizing the feature, testing performed, and any Supabase configuration changes.
4. Ensure CI passes before requesting review.

Happy hacking!
