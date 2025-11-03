import { ResetPasswordForm } from "@/components/reset-password-form";
import type { FieldStatus } from "@/app/login/actions";
import { createClient } from "@/utils/supabase/server";
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

export default async function Page({
  searchParams,
}: ResetPasswordPageProps) {
  const code = extractParam(searchParams?.code);
  const accessToken = extractParam(searchParams?.access_token);
  const refreshToken = extractParam(searchParams?.refresh_token);

  if (code) {
    await exchangeCodeAndRedirect(code);
  }

  if (accessToken && refreshToken) {
    await establishSessionAndRedirect(accessToken, refreshToken);
  }

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

async function exchangeCodeAndRedirect(code: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  const params = new URLSearchParams();

  if (error) {
    params.set("status", "error");
    params.set("reason", error.name ?? "code_exchange_failed");
    params.set(
      "message",
      error.message ??
        "We could not verify your reset link. Please request a new email."
    );
  } else {
    params.set("status", "success");
    params.set(
      "message",
      "Reset link confirmed. You can now choose a new password."
    );
  }

  redirect(`/reset-password?${params.toString()}`);
}

async function establishSessionAndRedirect(
  accessToken: string,
  refreshToken: string
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const params = new URLSearchParams();

  if (error) {
    params.set("status", "error");
    params.set("reason", error.name ?? "session_establish_failed");
    params.set(
      "message",
      error.message ??
        "We could not verify your reset link. Please request a new email."
    );
  } else {
    params.set("status", "success");
    params.set(
      "message",
      "Reset link confirmed. You can now choose a new password."
    );
  }

  redirect(`/reset-password?${params.toString()}`);
}
