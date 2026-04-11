import { NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseCredentials } from "@/utils/supabase/config";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/invite/accept"];

export async function proxy(request) {
  // Always refresh the auth session first (updates session cookies)
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  );

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
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
