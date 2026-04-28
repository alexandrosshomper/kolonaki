// Reason codes set by /reset-password and /auth/confirm handlers
const EXPIRED_LINK_REASONS = new Set([
  "otp_expired",
  "access_denied",
  "code_exchange_failed",
  "session_establish_failed",
]);

const RECOVERY_LINKS = {
  reset: { href: "/forgot-password", label: "Request a new password reset link" },
  confirm: { href: "/signup", label: "Go back to sign up" },
  login: { href: "/login", label: "Back to login" },
};

function getRecoveryLink(reason, errorParam) {
  if (!EXPIRED_LINK_REASONS.has(reason)) {
    return RECOVERY_LINKS.login;
  }
  // "access_denied" on the reset-password flow comes with error=access_denied,
  // while confirm-flow errors come via /auth/confirm redirect. Use the error
  // param to distinguish if available; default to the reset link since that's
  // the more common expired-link path.
  if (errorParam === "confirmation_expired" || errorParam === "signup") {
    return RECOVERY_LINKS.confirm;
  }
  return RECOVERY_LINKS.reset;
}

export default async function ErrorPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;

  const message =
    (typeof searchParams?.message === "string" && searchParams.message) ||
    "Sorry, something went wrong.";

  const status =
    typeof searchParams?.status === "string" ? searchParams.status : null;

  const reason =
    typeof searchParams?.reason === "string" ? searchParams.reason : null;

  const errorParam =
    typeof searchParams?.error === "string" ? searchParams.error : null;

  const isExpiredLink = reason && EXPIRED_LINK_REASONS.has(reason);
  const recovery = getRecoveryLink(reason, errorParam);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">
        {isExpiredLink ? "Link expired" : "Something went wrong"}
      </h1>
      <p className="max-w-sm text-muted-foreground text-sm">{message}</p>
      {status ? (
        <p className="text-muted-foreground text-xs">Status: {status}</p>
      ) : null}
      <a href={recovery.href} className="text-sm underline underline-offset-4">
        {recovery.label}
      </a>
    </div>
  );
}
