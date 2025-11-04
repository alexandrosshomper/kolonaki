"use client";

import {
  FormEvent,
  startTransition,
  useEffect,
  useState,
  useActionState,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  type FieldStatus,
  type ResetPasswordFormState,
  resetPassword,
} from "@/app/login/actions";
import { Logo } from "./logo";

const initialState: ResetPasswordFormState = {
  status: "idle",
  message: null,
  passwordStatus: "idle",
  confirmPasswordStatus: "idle",
  shouldResetPasswords: false,
};

const passwordTooShortMessage =
  "Password too short. Password needs to be at least 8 characters long.";
const confirmPasswordMismatchMessage =
  "Confirm password did not match the password.";

function ResetPasswordButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Reset Password"}
    </Button>
  );
}

type ResetPasswordFormProps = React.ComponentProps<typeof Card> & {
  notice?: { status: FieldStatus; message: string };
};

export function ResetPasswordForm({
  className,
  notice,
  ...props
}: ResetPasswordFormProps) {
  const [serverState, formAction] = useActionState<
    ResetPasswordFormState,
    FormData
  >(resetPassword, initialState);
  const [clientState, setClientState] =
    useState<ResetPasswordFormState>(initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const { location } = window;

    if (!location.hash) {
      return;
    }

    const hash = location.hash.startsWith("#")
      ? location.hash.slice(1)
      : location.hash;
    if (!hash) {
      return;
    }

    const hashParams = new URLSearchParams(hash);
    const keysToTransfer = [
      "code",
      "error",
      "error_code",
      "error_description",
      "access_token",
      "refresh_token",
      "expires_in",
      "token_type",
      "type",
    ];

    const nextSearchParams = new URLSearchParams(location.search);
    let shouldNavigate = false;

    for (const key of keysToTransfer) {
      if (!hashParams.has(key)) {
        continue;
      }

      if (key === "error" || key === "error_code") {
        if (!nextSearchParams.has("status")) {
          nextSearchParams.set("status", "error");
          shouldNavigate = true;
        }

        if (!nextSearchParams.has("reason")) {
          nextSearchParams.set(
            "reason",
            hashParams.get("error_code") ?? hashParams.get("error") ?? ""
          );
          shouldNavigate = true;
        }

        if (
          !nextSearchParams.has("message") &&
          hashParams.get("error_description")
        ) {
          nextSearchParams.set(
            "message",
            hashParams.get("error_description") ?? ""
          );
          shouldNavigate = true;
        }

        continue;
      }

      if (!nextSearchParams.has(key)) {
        nextSearchParams.set(key, hashParams.get(key) ?? "");
        shouldNavigate = true;
      }
    }

    if (!shouldNavigate) {
      return;
    }

    const nextUrl =
      nextSearchParams.size > 0
        ? `${location.pathname}?${nextSearchParams.toString()}`
        : location.pathname;

    router.replace(nextUrl);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined" || sessionReady) {
      return;
    }

    const hasAuthParams =
      window.location.search.includes("code=") ||
      window.location.search.includes("access_token=") ||
      window.location.search.includes("error=");

    if (!hasAuthParams) {
      return;
    }

    let isActive = true;

    const run = async () => {
      if (!isActive) {
        return;
      }

      startTransition(() => {
        if (!isActive) {
          return;
        }

        setSessionReady(false);
        setSessionError(null);
      });

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (error) {
        console.error("exchangeCodeForSession error:", error);
        if (isActive) {
          startTransition(() => {
            if (!isActive) {
              return;
            }

            setSessionError(
              error.message ?? "Invalid or expired reset link."
            );
            setSessionReady(false);
          });
        }
        return;
      }

      if (isActive) {
        startTransition(() => {
          if (!isActive) {
            return;
          }

          setSessionError(null);
          setSessionReady(true);
        });
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [searchParamsKey, sessionReady]);

  useEffect(() => {
    if (!serverState.shouldResetPasswords) {
      return;
    }

    startTransition(() => {
      setPassword("");
      setConfirmPassword("");
      setClientState(() => ({ ...initialState }));
    });
  }, [serverState.shouldResetPasswords]);

  const state = chooseState(serverState, clientState);

  const passwordRequirementsMet = password.length >= 8;
  const confirmPasswordRequirementsMet =
    passwordRequirementsMet &&
    confirmPassword.length > 0 &&
    confirmPassword === password;

  const successInputClasses =
    "border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/50";
  const errorInputClasses =
    "border-destructive focus-visible:border-destructive";

  const activePasswordStatus: FieldStatus =
    password.length > 0
      ? passwordRequirementsMet
        ? "success"
        : "idle"
      : state.passwordStatus;

  const activeConfirmPasswordStatus: FieldStatus =
    confirmPassword.length > 0 || password.length > 0
      ? confirmPasswordRequirementsMet
        ? "success"
        : "idle"
      : state.confirmPasswordStatus;

  const passwordClasses =
    activePasswordStatus === "error"
      ? errorInputClasses
      : activePasswordStatus === "success"
      ? successInputClasses
      : undefined;

  const confirmPasswordClasses =
    activeConfirmPasswordStatus === "error"
      ? errorInputClasses
      : activeConfirmPasswordStatus === "success"
      ? successInputClasses
      : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!passwordRequirementsMet) {
      event.preventDefault();
      setClientState({
        status: "error",
        message: passwordTooShortMessage,
        passwordStatus: "error",
        confirmPasswordStatus: "idle",
        shouldResetPasswords: false,
      });
      return;
    }

    if (!confirmPasswordRequirementsMet) {
      event.preventDefault();
      setClientState({
        status: "error",
        message: confirmPasswordMismatchMessage,
        passwordStatus: "success",
        confirmPasswordStatus: "error",
        shouldResetPasswords: false,
      });
      return;
    }

    setClientState((previous) => ({
      ...previous,
      status: "idle",
      message: null,
    }));
  }

  const formNotice =
    state.status !== "idle" && state.message
      ? { status: state.status, message: state.message }
      : undefined;

  const activeNotice = formNotice ?? notice;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Logo />
      <Card {...props}>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Choose a new password for your Kolonaki account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sessionReady ? (
            <p className="text-sm text-muted-foreground">
              {sessionError ?? "Validating reset link…"}
            </p>
          ) : (
            <form action={formAction} method="post" onSubmit={handleSubmit}>
              <FieldGroup>
                {activeNotice?.message ? (
                  <p
                    aria-live="polite"
                    role={activeNotice.status === "error" ? "alert" : "status"}
                    className={cn(
                      "text-sm",
                      activeNotice.status === "error"
                        ? "text-destructive"
                        : "text-green-600"
                    )}
                  >
                    {activeNotice.message}
                  </p>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={activePasswordStatus === "error" || undefined}
                    className={passwordClasses}
                  />
                  <FieldDescription>
                    Must be at least 8 characters long.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">
                    Confirm Password
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    aria-invalid={
                      activeConfirmPasswordStatus === "error" || undefined
                    }
                    className={confirmPasswordClasses}
                  />
                  <FieldDescription>
                    Please confirm your password.
                  </FieldDescription>
                </Field>
                <FieldGroup>
                  <Field>
                    <ResetPasswordButton />
                    <FieldDescription className="px-6 text-center">
                      Remember your password? <a href="/login">Sign in</a>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function chooseState(
  serverState: ResetPasswordFormState,
  clientState: ResetPasswordFormState
): ResetPasswordFormState {
  const hasServerFeedback =
    serverState.status !== "idle" ||
    !!serverState.message ||
    serverState.passwordStatus !== "idle" ||
    serverState.confirmPasswordStatus !== "idle" ||
    serverState.shouldResetPasswords;

  return hasServerFeedback ? serverState : clientState;
}
