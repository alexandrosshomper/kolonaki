import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseCredentials } from "./config";

export function createClient() {
  // Create a Supabase client on the browser with project's credentials
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "implicit",
    },
  });
}
