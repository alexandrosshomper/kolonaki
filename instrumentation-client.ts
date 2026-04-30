import posthog from "posthog-js";

// Skip PostHog in dev unless explicitly opted in via NEXT_PUBLIC_POSTHOG_DEV=1.
// Reasons: (1) PostHog backend occasionally returns transient 5xx that leak to
// console via the SDK's internal console.error (no config to silence), (2) dev
// events would pollute prod analytics and burn event budget. Set
// NEXT_PUBLIC_POSTHOG_DEV=1 in .env.local when you need to verify capture in dev.
const shouldInit =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_POSTHOG_DEV === "1";

if (shouldInit) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}

// IMPORTANT: Never combine this approach with other client-side PostHog initialization
// approaches, especially components like a PostHogProvider.
// instrumentation-client.ts is the correct solution for initializing client-side
// PostHog in Next.js 15.3+ apps.
