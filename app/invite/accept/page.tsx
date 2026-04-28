import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import config from "@/kolonaki.config";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function InviteAcceptPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
        <div className="w-full max-w-md flex flex-col gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            This invitation link is invalid or has expired.
          </p>
          <Link href="/signup" className="text-sm underline">
            Create an account →
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to the Route Handler which sets the httpOnly cookie then
    // forwards to /signup. Server Components cannot write cookies directly.
    redirect(`/invite/set-cookie?token=${encodeURIComponent(token)}`);
  }

  // Authenticated — show accept UI
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md flex flex-col gap-6 text-center">
        <span className="text-xl font-bold tracking-tight">kolonaki</span>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">You&apos;ve been invited</h1>
          <p className="text-sm text-muted-foreground">
            You have an invitation to join {config.product.name}.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`/onboarding/checklist?accept_token=${encodeURIComponent(token)}`}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Accept invitation →
          </Link>
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground underline"
          >
            Go to dashboard instead
          </Link>
        </div>
      </div>
    </div>
  );
}
