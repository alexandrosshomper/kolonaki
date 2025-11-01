"use client";

import { FormEvent, useEffect, useState } from "react";

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
import type { FieldStatus } from "@/app/login/actions";
import { Logo } from "./logo";

type ResetPasswordFormState = {
  status: FieldStatus;
  message: string | null;
  passwordStatus: FieldStatus;
  confirmPasswordStatus: FieldStatus;
  shouldResetPasswords: boolean;
};

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

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  const [state, setState] = useState<ResetPasswordFormState>(initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!state.shouldResetPasswords) {
      return;
    }

    setPassword("");
    setConfirmPassword("");

    setState((previous) => {
      if (!previous.shouldResetPasswords) {
        return previous;
      }

      return {
        ...previous,
        shouldResetPasswords: false,
        ...(previous.status === "success"
          ? {
              passwordStatus: "idle",
              confirmPasswordStatus: "idle",
            }
          : {}),
      };
    });
  }, [state.shouldResetPasswords]);

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
      setState({
        status: "error",
        message: passwordTooShortMessage,
        passwordStatus: "error",
        confirmPasswordStatus: "idle",
        shouldResetPasswords: true,
      });
      return;
    }

    if (!confirmPasswordRequirementsMet) {
      event.preventDefault();
      setState({
        status: "error",
        message: confirmPasswordMismatchMessage,
        passwordStatus: "success",
        confirmPasswordStatus: "error",
        shouldResetPasswords: true,
      });
      return;
    }

    setState({
      status: "success",
      message: null,
      passwordStatus: "success",
      confirmPasswordStatus: "success",
      shouldResetPasswords: true,
    });
  }

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
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {state.status === "error" && state.message ? (
                <p
                  aria-live="polite"
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {state.message}
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
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
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
                  <Button type="submit">Reset Password</Button>
                  <FieldDescription className="px-6 text-center">
                    Remember your password? <a href="/login">Sign in</a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
