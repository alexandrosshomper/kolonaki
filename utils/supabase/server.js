import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseCredentials } from "./config";

export async function createClient() {
  const cookieStore = cookies();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();

  // Create a server's supabase client with newly configured cookie,
  // which could be used to maintain user's session
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "implicit",
    },
    cookies: {
      get(name) {
        const cookie =
          typeof cookieStore.get === "function"
            ? cookieStore.get(name)
            : undefined;
        if (!cookie) {
          return undefined;
        }

        return typeof cookie === "string" ? cookie : cookie.value;
      },
      async set(name, value, options) {
        if (typeof cookieStore.set !== "function") {
          return;
        }

        try {
          cookieStore.set(name, value, options);
        } catch (error) {
          console.warn(
            "Unable to persist Supabase auth cookies from this context.",
            error
          );
        }
      },
      async remove(name, options) {
        if (typeof cookieStore.delete === "function") {
          try {
            cookieStore.delete(name, options);
          } catch (error) {
            console.warn(
              "Unable to remove Supabase auth cookies from this context.",
              error
            );
          }
          return;
        }

        if (typeof cookieStore.set === "function") {
          try {
            cookieStore.set(name, "", {
              ...options,
              maxAge: 0,
            });
          } catch (error) {
            console.warn(
              "Unable to clear Supabase auth cookies from this context.",
              error
            );
          }
        }
      },
    },
  });
}
