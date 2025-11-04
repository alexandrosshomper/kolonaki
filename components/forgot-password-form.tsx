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
import { useSearchParams } from "next/navigation";
import { Logo } from "./logo";
import { createClient } from "@/utils/supabase/client";

type FieldStatus = "idle" | "error" | "success";

type ForgotPasswordFormState = {
  status: FieldStatus;
  message: string | null;
  email: string;
};

const initialState: ForgotPasswordFormState = {
  status: "idle",
  message: null,
  email: "",
};

const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Check your email for a link to reset your password.";

function ResetPasswordButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Sending..." : "Reset password"}
    </Button>
  );
}

export function ForgotPasswordForm({
  className,
  email,
  ...props
}: React.ComponentProps<"div"> & { email?: string }) {
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email") ?? undefined;
  const [inputEmail, setInputEmail] = useState(email ?? queryEmail ?? "");
  const [state, setState] = useState<ForgotPasswordFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextEmail = email ?? queryEmail ?? "";
    setInputEmail(nextEmail);
  }, [email, queryEmail]);

  function validateEmail(targetEmail: string): string | null {
    if (!targetEmail) {
      return "Email is required.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(targetEmail)) {
      return "Please enter a valid email address.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = inputEmail.trim();
    const validationError = validateEmail(trimmedEmail);

    if (validationError) {
      setState({
        status: "error",
        message: validationError,
        email: trimmedEmail,
      });
      return;
    }

    if (typeof window === "undefined") {
      setState({
        status: "error",
        message: "Unable to determine redirect location.",
        email: trimmedEmail,
      });
      return;
    }

    setIsSubmitting(true);
    setState((previous) => ({
      ...previous,
      status: "idle",
      message: null,
    }));

    try {
      const supabase = createClient();
      const redirectTo = new URL(
        `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
      ).toString();

      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        { redirectTo }
      );

      if (error) {
        setState({
          status: "error",
          message: error.message ?? "Unable to send a reset password link.",
          email: trimmedEmail,
        });
        return;
      }

      setState({
        status: "success",
        message: PASSWORD_RESET_SUCCESS_MESSAGE,
        email: "",
      });
      setInputEmail("");
    } catch (error) {
      console.error("Supabase reset password error:", error);
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send a reset password link.",
        email: trimmedEmail,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Logo />
      <Card>
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email below to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {state.message ? (
                <p
                  aria-live="polite"
                  role={state.status === "error" ? "alert" : "status"}
                  className={cn(
                    "text-sm",
                    state.status === "error"
                      ? "text-destructive"
                      : "text-green-600"
                  )}
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
                  placeholder="m@example.com"
                  required
                  value={inputEmail}
                  onChange={(event) => setInputEmail(event.target.value)}
                />
              </Field>

              <Field>
                <ResetPasswordButton pending={isSubmitting} />

                <FieldDescription className="text-center">
                  Remember your password? <a href="/login">Login</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
