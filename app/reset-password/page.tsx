import { ResetPasswordForm } from "@/components/reset-password-form";
import type { FieldStatus } from "@/app/login/actions";
import { redirect } from "next/navigation";

type ResetPasswordPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function extractParam(
  value: string | string[] | undefined
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function Page({ searchParams }: ResetPasswordPageProps) {
  const error = extractParam(searchParams?.error);
  const errorCode = extractParam(searchParams?.error_code);
  const errorDescription = extractParam(searchParams?.error_description);
  const status = extractParam(searchParams?.status);
  const reason = extractParam(searchParams?.reason);
  const messageFromParams = extractParam(searchParams?.message);

  const shouldNormalizeErrorParams =
    (error || errorCode || errorDescription) && !reason && !status;

  if (shouldNormalizeErrorParams) {
    const params = new URLSearchParams();
    params.set("status", "error");

    if (errorCode) {
      params.set("reason", errorCode);
    } else if (error) {
      params.set("reason", error);
    }

    params.set(
      "message",
      errorDescription ??
        "Your password reset link has expired. Please request a new link."
    );

    redirect(`/reset-password?${params.toString()}`);
  }

  let notice: { status: FieldStatus; message: string } | undefined;

  if (status === "error" || status === "success") {
    const derivedMessage =
      messageFromParams ??
      (status === "error"
        ? "Your password reset link has expired. Please request a new link."
        : "Password reset link accepted.");

    notice = {
      status,
      message: derivedMessage,
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
