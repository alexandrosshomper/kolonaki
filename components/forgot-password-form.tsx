"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

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
import {
  sendPasswordResetLink,
  type ForgotPasswordFormState,
} from "@/app/login/actions";

const initialState: ForgotPasswordFormState = {
  status: "idle",
  message: null,
  email: "",
};

function ResetPasswordButton() {
  const { pending } = useFormStatus();
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
  const [state, formAction] = useActionState<
    ForgotPasswordFormState,
    FormData
  >(sendPasswordResetLink, initialState);

  useEffect(() => {
    const nextEmail = email ?? queryEmail ?? "";
    setInputEmail(nextEmail);
  }, [email, queryEmail]);

  useEffect(() => {
    if (state.status === "idle") {
      return;
    }

    setInputEmail(state.email);
  }, [state.email, state.status]);

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
          <form action={formAction}>
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
                <ResetPasswordButton />

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
