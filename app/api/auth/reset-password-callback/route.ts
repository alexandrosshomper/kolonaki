import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Route Handler — can write cookies, unlike Server Components.
// Receives the Supabase reset-password callback (code or token pair),
// exchanges it for a session, then redirects to /reset-password.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Reset password code exchange error:", error);
      const params = new URLSearchParams({
        status: "error",
        reason: error.name ?? "code_exchange_failed",
        message:
          error.message ??
          "Your password reset link has expired. Please request a new link.",
      });
      return NextResponse.redirect(`${origin}/reset-password?${params}`);
    }

    const params = new URLSearchParams({
      status: "success",
      message: "Reset link confirmed. You can now choose a new password.",
    });
    return NextResponse.redirect(`${origin}/reset-password?${params}`);
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("Reset password session establish error:", error);
      const params = new URLSearchParams({
        status: "error",
        reason: error.name ?? "session_establish_failed",
        message:
          error.message ??
          "Your password reset link has expired. Please request a new link.",
      });
      return NextResponse.redirect(`${origin}/reset-password?${params}`);
    }

    const params = new URLSearchParams({
      status: "success",
      message: "Reset link confirmed. You can now choose a new password.",
    });
    return NextResponse.redirect(`${origin}/reset-password?${params}`);
  }

  // No recognized params — redirect to reset-password without a session
  return NextResponse.redirect(`${origin}/reset-password`);
}
