import "server-only";
import { PostHog } from "posthog-node";

// Singleton — safe to import in any server action or route handler.
// flushAt/flushInterval = 1/0 ensures events are sent immediately in serverless context.
export const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
  flushAt: 1,
  flushInterval: 0,
});
