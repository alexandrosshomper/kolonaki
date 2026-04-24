import { NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCredentials } from "@/utils/supabase/config";

// /invite/accept is intentionally NOT protected — it handles unauthenticated users
// by setting an invite cookie and redirecting to /signup. Middleware must let it through.
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

// Authenticated users visiting these paths are bounced to /dashboard
const AUTH_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

export async function proxy(request) {
  // Always refresh the auth session first (updates session cookies)
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  );

  // Bounce authenticated users away from auth-only pages
  const isAuthOnly = AUTH_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isAuthOnly) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }

    return response;
  }

  if (!isProtected) return response;

  // Auth-only check for protected routes — does NOT read user_metadata.
  // Page server components handle user_metadata-based redirects (e.g. segmentation → checklist).
  const { supabaseUrl, supabaseAnonKey } = getSupabaseCredentials();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Cookies already handled by updateSession above
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - ingest (PostHog proxy — handled by next.config.ts rewrites, must bypass proxy)
     */
    "/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
