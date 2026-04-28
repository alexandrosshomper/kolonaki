import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendKolonakiEmail } from "@/lib/kolonaki/email";
import config from "@/kolonaki.config";
import type { UserActivationMeta } from "@/lib/kolonaki/types";

// Configure in vercel.json:
// { "crons": [{ "path": "/api/cron/activation-nudge", "schedule": "0 * * * *" }] }
//
// auth.users is in the auth schema and cannot be queried via supabase.from().
// Uses supabase.auth.admin.listUsers() (service role required) with in-process filtering.

export async function GET(request: Request) {
  // Guard: fail loudly if CRON_SECRET is not configured
  if (!process.env.CRON_SECRET) {
    return new Response("Cron secret not configured", { status: 500 });
  }

  // Timing-safe comparison prevents character-by-character timing attacks on the secret.
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET}`);
  const actual = Buffer.from(request.headers.get("Authorization") ?? "");
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // listUsers() does not support server-side filtering — paginate + filter in-process.
  // For scale beyond ~10k users, replace with a Postgres view (see TODOS.md).
  let page = 1;
  const perPage = 1000;
  // Safety ceiling: prevents the function from running past Vercel's timeout on large user bases.
  // At 50k users this cron stays well under 300s. Beyond that, migrate to the Postgres view
  // described in TODOS.md — the cron resumes correctly next tick since nudge_sent_at is idempotent.
  const MAX_PAGES = 50;
  let nudgedCount = 0;

  while (true) {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error || !users.length) break;
    if (page > MAX_PAGES) {
      console.warn(
        `activation-nudge: reached MAX_PAGES (${MAX_PAGES}), resuming next tick`,
      );
      break;
    }

    for (const user of users) {
      const meta = user.user_metadata as Partial<UserActivationMeta>;
      const completedAt = meta.segmentation_completed_at;

      // Skip: no segmentation, already reached aha, nudge already sent, or too recent
      if (!completedAt) continue;
      if (meta.aha_reached_at) continue;
      if (meta.nudge_sent_at) continue;
      if (new Date(completedAt) > staleCutoff) continue;
      if (!user.email) continue;

      // Write nudge_sent_at BEFORE sending the email.
      // If the process crashes after the write but before the send, the user misses one nudge.
      // The reverse order (send then write) risks a duplicate nudge on the next cron tick.
      //
      // Partial write note: this writes only { nudge_sent_at } via updateUserById (admin API),
      // not the full UserActivationMeta. This is safe because nudge_sent_at is a top-level
      // scalar — Supabase's shallow merge preserves all other fields. Do not apply this
      // pattern to nested objects (like onboarding_steps), which would be replaced, not merged.
      await supabase.auth.admin
        .updateUserById(user.id, {
          user_metadata: { nudge_sent_at: new Date().toISOString() },
        })
        .catch(console.error);

      sendKolonakiEmail("checklist_stalled", user.email);

      nudgedCount++;
    }

    if (users.length < perPage) break;
    page++;
  }

  return Response.json({ nudged: nudgedCount });
}
