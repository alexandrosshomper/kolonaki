import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import config from "@/kolonaki.config";
import { InviteForm } from "./invite-form";

export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Skip invite step for solo-user products
  if (!config.workspace.enabled) redirect("/onboarding/checklist");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Logo placeholder */}
        <div className="text-center">
          <span className="text-xl font-bold tracking-tight">kolonaki</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">Invite your team</h1>
          <p className="text-sm text-muted-foreground">
            Collaboration is where things click.
          </p>
        </div>

        <InviteForm />

        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground underline text-center"
        >
          Skip for now →
        </Link>
      </div>
    </div>
  );
}
