"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { completeProfile } from "@/app/login/actions";
import type { ProfileFormState } from "@/app/login/actions";
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { OnboardingAvatarPicker } from "./onboarding-avatar-picker";

const initialState: ProfileFormState = {
  status: "idle",
  message: null,
  fullNameStatus: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Continue"}
    </Button>
  );
}

type OnboardingProfileFormProps = React.ComponentProps<"div"> & {
  userId: string;
  email: string;
  initialFullName: string;
  initialAvatarPath: string | null;
};

export function OnboardingProfileForm({
  className,
  userId,
  email,
  initialFullName,
  initialAvatarPath,
  ...props
}: OnboardingProfileFormProps) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    completeProfile,
    initialState
  );
  const [fullName, setFullName] = useState(initialFullName);

  const errorInputClasses =
    "border-destructive focus-visible:border-destructive";

  const fullNameClasses =
    state.fullNameStatus === "error" ? errorInputClasses : undefined;

  const avatarSeed = fullName.trim() || email || userId;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Logo />
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Set up your profile</CardTitle>
          <CardDescription>
            Add your name and a photo so others can recognize you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} method="post">
            <FieldGroup>
              <OnboardingAvatarPicker
                uid={userId}
                initialAvatarPath={initialAvatarPath}
                fullName={fullName}
                seed={avatarSeed}
              />
              {state.status === "error" && state.message ? (
                <p
                  aria-live="polite"
                  role="alert"
                  className="text-destructive text-sm text-center"
                >
                  {state.message}
                </p>
              ) : null}
              <Field>
                <FieldLabel htmlFor="full_name">Full name</FieldLabel>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  aria-invalid={state.fullNameStatus === "error" || undefined}
                  className={fullNameClasses}
                />
              </Field>
              <Field>
                <SubmitButton />
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
