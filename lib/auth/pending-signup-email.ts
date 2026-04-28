// Cookie that binds /check-email's Resend button to the email the user just
// signed up with (or attempted to log in with). httpOnly so JS can't read or
// write it — the value reflects the server's last decision, not anything an
// attacker can craft via URL or DOM. 24h covers the typical confirmation window.
const COOKIE_NAME = "kolonaki_pending_signup_email";
const TTL_SECONDS = 60 * 60 * 24;

export async function setPendingSignupEmail(email: string) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function readPendingSignupEmail(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function clearPendingSignupEmail() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
