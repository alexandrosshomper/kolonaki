import HeroSection from "@/components/hero-section";
import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function extractParam(
  value: string | string[] | undefined
): string | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedParams = await searchParams;
  const errorCode = extractParam(resolvedParams?.error_code);
  const error = extractParam(resolvedParams?.error);

  if (errorCode === "otp_expired" || error === "access_denied") {
    const params = new URLSearchParams({
      status: "error",
      reason: "otp_expired",
      message:
        "Your password reset link has expired. Please request a new link.",
    });

    redirect(`/reset-password?${params.toString()}`);
  }

  return <HeroSection />;
}
