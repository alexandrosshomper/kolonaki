import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /invite/set-cookie?token=X
 *
 * Sets the httpOnly invite token cookie (not possible in Server Components)
 * then redirects the unauthenticated user to /signup with the token in the URL.
 * The cookie is belt-and-suspenders: verifyOtp() reads it after OTP confirmation.
 * The URL param is the primary fallback if the cookie is lost across tabs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Validate UUID format before touching cookies or redirects.
  // invitations.token is gen_random_uuid() — anything else is invalid or tampered.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!token || !UUID_RE.test(token)) {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  const cookieStore = await cookies();
  cookieStore.set("kolonaki_invite_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60, // 30 minutes
    path: "/",
  });

  const signupUrl = new URL("/signup", request.url);
  signupUrl.searchParams.set("invite_token", token);
  return NextResponse.redirect(signupUrl);
}
