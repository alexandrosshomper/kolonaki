import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseCredentials } from "./config";

export function createClient() {
  // Create a supabase client on the browser with project's credentials
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
