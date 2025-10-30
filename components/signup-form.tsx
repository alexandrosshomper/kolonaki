"use client";

import * as React from "react";
import { useActionState } from "react";

import { signupAction } from "@/app/login/actions";
import { initialState, type SignupFormState } from "@/types/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function normalizeToState(res: unknown): SignupFormState {
  if (res && typeof res === "object" && "status" in res) {
    const result = res as Record<string, unknown>;
    if (result.status === "success") {
      const message =
        typeof result.message === "string"
          ? result.message
          : "Success";
      const email =
        typeof result.email === "string" ? result.email : undefined;
      return { status: "success", message, email };
    }

    if (result.status === "error") {
      const message =
        typeof result.message === "string"
          ? result.message
          : "Something went wrong.";
      const email =
        typeof result.email === "string" ? result.email : undefined;
      return { status: "error", message, email };
    }
  }

  return {
    status: "error",
    message: "Unexpected response from signup.",
  };
}

async function reducer(
  _prev: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  try {
    const res = await signupAction(formData);
    const nextState = normalizeToState(res);
    if (nextState.status === "error" && !nextState.email) {
      const email = formData.get("email");
      if (typeof email === "string" && email.length > 0) {
        return { ...nextState, email };
      }
    }
    return nextState;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unknown error.";
    const email = formData.get("email");
    return {
      status: "error",
      message,
      email: typeof email === "string" ? email : undefined,
    };
  }
}

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, formAction] = useActionState<SignupFormState, FormData>(
    reducer,
    initialState
  );

  const emailFieldValue =
    state.status === "success" || state.status === "error"
      ? state.email ?? ""
      : "";

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={formAction} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Enter your email below to create your Kolonaki account
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
              {state.status === "success" && state.message ? (
                <p
                  aria-live="polite"
                  role="status"
                  className="text-sm text-emerald-600"
                >
                  {state.message}
                </p>
              ) : null}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  key={emailFieldValue}
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="m@example.com"
                  defaultValue={emailFieldValue}
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
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={state.status === "submitting"}>
                  Create Account
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Already have an account? <a href="/login">Sign in</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/moods/greek-forest.png"
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
