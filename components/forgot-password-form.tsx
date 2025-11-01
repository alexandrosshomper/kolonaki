"use client";

import { useEffect, useState } from "react";

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

export function ForgotPasswordForm({
  className,
  email,
  ...props
}: React.ComponentProps<"div"> & { email?: string }) {
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email") ?? undefined;
  const [inputEmail, setInputEmail] = useState(email ?? queryEmail ?? "");

  useEffect(() => {
    const nextEmail = email ?? queryEmail ?? "";
    setInputEmail(nextEmail);
  }, [email, queryEmail]);

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
          <form>
            <FieldGroup>
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
                <Button type="submit">Reset password</Button>

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
