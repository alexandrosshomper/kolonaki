import { ForgotPasswordForm } from "@/components/forgot-password-form";

type ForgotPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: ForgotPasswordPageProps) {
  const resolvedParams = await searchParams;
  const emailParam = resolvedParams?.email;
  const email =
    typeof emailParam === "string"
      ? emailParam
      : Array.isArray(emailParam)
        ? emailParam[0]
        : undefined;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <ForgotPasswordForm email={email} />
      </div>
    </div>
  );
}
