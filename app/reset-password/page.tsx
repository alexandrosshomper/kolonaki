import { ResetPasswordForm } from "@/components/reset-password-form";
import type { FieldStatus } from "@/app/login/actions";

// Code/token exchange is handled by /api/auth/reset-password-callback (a Route
// Handler that can write session cookies). This page only renders the form using
// status/message/reason params set by that handler.

type ResetPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function extractParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function Page({ searchParams }: ResetPasswordPageProps) {
  const resolvedParams = await searchParams;

  const status = extractParam(resolvedParams?.status);
  const reason = extractParam(resolvedParams?.reason);
  const messageFromParams = extractParam(resolvedParams?.message);

  let notice: { status: FieldStatus; message: string } | undefined;

  if (status === "error" || status === "success") {
    notice = {
      status,
      message:
        messageFromParams ??
        (status === "error"
          ? "Your password reset link has expired. Please request a new link."
          : "Reset link confirmed. You can now choose a new password."),
    };
  } else if (reason === "otp_expired" || reason === "access_denied") {
    notice = {
      status: "error",
      message:
        messageFromParams ??
        "Your password reset link has expired. Please request a new link.",
    };
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ResetPasswordForm notice={notice} />
      </div>
    </div>
  );
}
