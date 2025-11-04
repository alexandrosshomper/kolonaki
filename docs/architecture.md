# Architecture Overview

This project is a [Next.js](https://nextjs.org/) application that implements authentication flows backed by Supabase. The repository follows the App Router structure and is organized around the following major areas:

## Application Surfaces (`app/`)
- **`app/layout.tsx` & `app/page.tsx`** provide the root layout and landing page. Layout wiring for fonts, metadata, and shared providers lives here.
- **Auth routes** such as `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, and `app/(auth)/reset-password/page.tsx` host the user-facing forms. Each route renders form components from `components/` and calls hooks in `hooks/` to perform Supabase actions.
- **API routes** under `app/api/` proxy requests that need secure server-side Supabase access (for example, creating server-side sessions or handling password resets).

## Components (`components/`)
Reusable UI building blocks live here, including:
- **Auth forms** (`login-form.tsx`, `signup-form.tsx`, `forgot-password-form.tsx`) that manage validation, call Supabase utilities, and display feedback.
- **UI primitives** (buttons, inputs, alerts) composed from Tailwind CSS classes defined in `app/globals.css`.

## Hooks (`hooks/`)
Client-side hooks encapsulate Supabase interactions and shared business logic. Examples include:
- `hooks/use-supabase.ts` for creating a browser Supabase client with the project configuration.
- `hooks/use-reset-password.ts` for coordinating the password reset flow between the forgot-password form and the reset-password page.

## Lib & Utils (`lib/`, `utils/`)
- `lib/supabase-server.ts` exposes helpers for creating Supabase clients on the server using service credentials when necessary.
- `utils/supabase/config.js` collects Supabase-related environment variables in one place and is shared between browser and server helpers.

## Styling & Configuration
- Tailwind CSS configuration lives in `tailwind.config.ts`, with PostCSS configuration in `postcss.config.mjs`.
- `components.json` configures shared UI tokens.
- Environment configuration is handled through `.env.local` files based on `.env.example` (see below).

## Data Flow Summary
1. A user submits an auth form component.
2. The component calls a hook (e.g., `useSupabaseClient`) which in turn uses helpers from `utils/supabase`.
3. Supabase operations are executed via the JS client using credentials defined in environment variables.
4. Success and error states are surfaced back through component state and shared UI primitives.

## Adding New Flows
When adding a new user flow (e.g., email verification), follow the same pattern:
1. Add an App Router page to host the UI.
2. Create or extend a form component in `components/`.
3. Encapsulate Supabase logic in a reusable hook under `hooks/`.
4. Update server helpers in `lib/` if secure server-side access is required.
5. Document any new environment variables in `.env.example`.

Refer to `CONTRIBUTING.md` for detailed setup instructions and task conventions.
