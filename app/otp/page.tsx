import { OTPForm } from "@/components/otp-form";

type OTPPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OTPPage({ searchParams }: OTPPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const emailParam = resolvedSearchParams.email;
  const messageParam = resolvedSearchParams.message;
  const statusParam = resolvedSearchParams.status;

  const email = Array.isArray(emailParam) ? emailParam[0] ?? "" : emailParam ?? "";
  const messageValue = Array.isArray(messageParam)
    ? messageParam[0] ?? null
    : messageParam ?? null;
  const message =
    typeof messageValue === "string"
      ? decodeURIComponent(messageValue.replace(/\+/g, " "))
      : null;
  const statusValue = Array.isArray(statusParam)
    ? statusParam[0]
    : statusParam;
  const messageStatus =
    statusValue === "success"
      ? "success"
      : statusValue === "error"
      ? "error"
      : undefined;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <OTPForm email={email} message={message} messageStatus={messageStatus} />
      </div>
    </div>
  );
}
