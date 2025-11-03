"use client";

import { useActionState, useEffect, useEffectEvent, useState } from "react";

import { cn } from "@/lib/utils";
import { signup } from "../app/login/actions";
import type { FieldStatus, SignupFormState } from "../app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Logo } from "./logo";

const initialState: SignupFormState = {
  status: "idle",
  message: null,
  email: "",
  passwordStatus: "idle",
  confirmPasswordStatus: "idle",
  shouldResetPasswords: false,
};

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, formAction] = useActionState<SignupFormState, FormData>(
    signup,
    initialState
  );
  const [email, setEmail] = useState(initialState.email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const syncEmail = useEffectEvent((nextEmail: string) => {
    setEmail(nextEmail);
  });

  useEffect(() => {
    syncEmail(state.email);
  }, [state.email]);

  const resetPasswords = useEffectEvent(() => {
    setPassword("");
    setConfirmPassword("");
  });

  useEffect(() => {
    if (state.shouldResetPasswords || state.status === "success") {
      resetPasswords();
    }
  }, [state.shouldResetPasswords, state.status]);

  const passwordStatus = state.passwordStatus ?? "idle";
  const confirmPasswordStatus = state.confirmPasswordStatus ?? "idle";

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
      : passwordStatus;

  const activeConfirmPasswordStatus: FieldStatus =
    confirmPassword.length > 0 || password.length > 0
      ? confirmPasswordRequirementsMet
        ? "success"
        : "idle"
      : confirmPasswordStatus;

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

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Logo />
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={formAction} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enter your email below to create your account
                </p>
              </div>
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
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="m@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <FieldDescription>
                  We&apos;ll use this to contact you. We will not share your
                  email with anyone else.
                </FieldDescription>
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
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
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit">Create Account</Button>
              </Field>

              <FieldDescription className="text-center">
                Already have an account? <a href="/login">Sign in</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/moods/ionic-column-athean-forest.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
