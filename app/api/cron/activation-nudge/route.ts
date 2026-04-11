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

  if (
    request.headers.get("Authorization") !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // listUsers() does not support server-side filtering — paginate + filter in-process.
  // For scale beyond ~10k users, replace with a Postgres view (see TODOS.md).
  let page = 1;
  const perPage = 1000;
  let nudgedCount = 0;

  while (true) {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error || !users.length) break;

    for (const user of users) {
      const meta = user.user_metadata as Partial<UserActivationMeta>;
      const completedAt = meta.segmentation_completed_at;

      // Skip: no segmentation, already reached aha, nudge already sent, or too recent
      if (!completedAt) continue;
      if (meta.aha_reached_at) continue;
      if (meta.nudge_sent_at) continue;
      if (new Date(completedAt) > staleCutoff) continue;
      if (!user.email) continue;

      sendKolonakiEmail("checklist_stalled", user.email);

      await supabase.auth.admin
        .updateUserById(user.id, {
          data: { nudge_sent_at: new Date().toISOString() },
        })
        .catch(console.error);

      nudgedCount++;
    }

    if (users.length < perPage) break;
    page++;
  }

  return Response.json({ nudged: nudgedCount });
}
