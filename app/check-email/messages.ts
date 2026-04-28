export type CheckEmailMessageTone = "success" | "error" | "info";

export type CheckEmailMessage = {
  tone: CheckEmailMessageTone;
  body: string;
};

// Server-side allowlist consumed by /check-email and the auth actions that
// redirect there. Free-text URL params are NOT honoured — only these keys.
// This blocks reflected-content phishing via `?message=...` and prevents
// supabase.auth.resend errors from leaking enumeration signals.
export const CHECK_EMAIL_MESSAGES: Record<string, CheckEmailMessage> = {
  resend_success: {
    tone: "success",
    body: "If this email has a pending signup, we've resent the confirmation link.",
  },
  resend_error: {
    tone: "error",
    body: "We couldn't resend the email right now. Please try again in a few moments.",
  },
  unconfirmed_login: {
    tone: "info",
    body: "Please confirm your email before signing in. Check your inbox for the confirmation link.",
  },
};

export type CheckEmailMessageKey = keyof typeof CHECK_EMAIL_MESSAGES;

export function lookupMessage(key: string | null): CheckEmailMessage | null {
  if (!key) return null;
  return CHECK_EMAIL_MESSAGES[key] ?? null;
}
