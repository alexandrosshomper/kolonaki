import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";

type CheckEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const resolvedParams = await searchParams;

  const rawMessage = resolvedParams?.message;
  const message =
    typeof rawMessage === "string"
      ? rawMessage
      : Array.isArray(rawMessage)
        ? rawMessage[0]
        : null;

  const rawEmail = resolvedParams?.email;
  const email =
    typeof rawEmail === "string"
      ? rawEmail
      : Array.isArray(rawEmail)
        ? rawEmail[0]
        : null;

  const otpHref = email ? `/otp?email=${encodeURIComponent(email)}` : "/otp";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Logo />
          <Card>
            <CardContent className="flex flex-col gap-3 p-6 text-center">
              <h1 className="text-2xl font-bold">Check your email</h1>
              {message ? (
                <p className="text-sm text-muted-foreground">{message}</p>
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
              <br />
              <FieldDescription className="text-center">
                Didn&apos;t receive it? Check your spam, or{" "}
                <a href="/signup" className="underline underline-offset-4">
                  try again
                </a>
                . <br />
                Already have an account? <a href="/login">Sign in</a>
              </FieldDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
