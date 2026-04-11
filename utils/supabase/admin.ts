// Service role client — bypasses RLS.
// Use only in: cron routes, acceptInvitation(), invite token lookup.
// NEVER import in client components or user-facing API routes.
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
