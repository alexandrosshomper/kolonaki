import config from "@/kolonaki.config";
import { resendSignupConfirmation } from "@/app/login/actions";
import { Logo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";

import { ResendButton } from "./resend-button";
import { SniperLinkButton } from "./sniper-link-button";

type CheckEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const resolvedParams = await searchParams;

  const message = readParam(resolvedParams?.message);
  const email = readParam(resolvedParams?.email);
  const rawStatus = readParam(resolvedParams?.status);
  const status: "success" | "error" | null =
    rawStatus === "success" || rawStatus === "error" ? rawStatus : null;

  // When a resend just succeeded/failed we surface that in an Alert and keep
  // the default body copy ("we sent you a link to X"). When status is unset
  // and a message was passed (e.g. unconfirmed-email login redirect from
  // app/login/actions.ts), the message replaces the default body — same as
  // the previous behaviour.
  const showInlineMessage = !status && Boolean(message);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Logo />
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 text-center">
              <h1 className="text-2xl font-bold">Check your email</h1>

              {status && message ? (
                <Alert
                  variant={status === "success" ? "success" : "destructive"}
                  aria-live="polite"
                >
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}

              {showInlineMessage ? (
                <p className="text-muted-foreground text-sm">{message}</p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  We sent you a confirmation link to <br />
                  {email ? (
                    <strong className="text-foreground">{email}</strong>
                  ) : (
                    "your email"
                  )}
                  . <br />
                  Click it to verify your account and get started.
                </p>
              )}

              {email ? (
                <SniperLinkButton
                  email={email}
                  from={config.product.fromEmail}
                />
              ) : null}

              {email ? (
                <form action={resendSignupConfirmation}>
                  <input type="hidden" name="email" value={email} />
                  <ResendButton />
                </form>
              ) : null}

              <FieldDescription className="text-center">
                {email ? (
                  "Don't see it? Check your spam folder, or tap Resend."
                ) : (
                  <>
                    Didn&apos;t receive it? Check your spam, or{" "}
                    <a href="/signup" className="underline underline-offset-4">
                      sign up again
                    </a>
                    .
                  </>
                )}
                <br />
                Already have an account? <a href="/login">Sign in</a>
              </FieldDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
