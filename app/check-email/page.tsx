import config from "@/kolonaki.config";
import { resendSignupConfirmation } from "@/app/login/actions";
import { readPendingSignupEmail } from "@/lib/auth/pending-signup-email";
import { Logo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";

import { lookupMessage } from "./messages";
import { ResendButton } from "./resend-button";
import { SniperLinkButton } from "./sniper-link-button";
import { UrlCleanup } from "./url-cleanup";

type CheckEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const resolvedParams = await searchParams;

  // Email comes from an httpOnly cookie set by signup() / login() — NOT from
  // the URL. This blocks the open-relay vector where an attacker shares
  // /check-email?email=victim@example.com to trigger a resend to an arbitrary
  // address. The page falls back to a generic UI when the cookie is absent.
  const email = await readPendingSignupEmail();

  // Only allowlisted message keys are honoured. Free-text URL params would
  // otherwise let an attacker render phishing copy ("Your account was
  // suspended. Call 1-555-SCAM.") inside our Card with our Logo.
  const msg = lookupMessage(readParam(resolvedParams?.msg));

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Logo />
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 text-center">
              <h1 className="text-2xl font-bold">Check your email</h1>

              {msg && (msg.tone === "success" || msg.tone === "error") ? (
                <Alert
                  variant={msg.tone === "success" ? "success" : "destructive"}
                  aria-live="polite"
                >
                  <AlertDescription>{msg.body}</AlertDescription>
                </Alert>
              ) : null}

              {msg && msg.tone === "info" ? (
                <p className="text-muted-foreground text-sm">{msg.body}</p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  We sent you a confirmation link to <br />
                  {email ? (
                    <strong className="text-foreground break-all">
                      {email}
                    </strong>
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
              </FieldDescription>

              {email ? (
                <form action={resendSignupConfirmation}>
                  <ResendButton />
                </form>
              ) : null}

              <FieldDescription className="text-center">
                Already have an account?{" "}
                <a href="/login" rel="noreferrer">
                  Sign in
                </a>
              </FieldDescription>
            </CardContent>
          </Card>
        </div>
      </div>
      <UrlCleanup />
    </div>
  );
}
