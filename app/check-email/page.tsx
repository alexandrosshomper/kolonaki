import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";

type CheckEmailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
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
                  We sent you a confirmation link. Click it to verify your
                  account and get started.
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Didn&apos;t receive it? Check your spam folder, or{" "}
                <a href="/signup" className="underline underline-offset-4">
                  try again
                </a>
                .
              </p>
              <p className="text-muted-foreground text-xs">
                Received a 6-digit code instead?{" "}
                <a href={otpHref} className="underline underline-offset-4">
                  Enter it here
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
