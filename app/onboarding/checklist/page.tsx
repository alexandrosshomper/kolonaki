import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import config from "@/kolonaki.config";
import { ChecklistClient } from "./checklist-client";

export default async function ChecklistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!user.user_metadata?.segmentation) redirect("/onboarding/segmentation");

  const seg: Record<string, string> = user.user_metadata.segmentation ?? {};
  const completedSteps: Record<string, boolean> =
    user.user_metadata.onboarding_steps ?? {};
  const ahaReached = Boolean(user.user_metadata?.aha_reached_at);

  const steps = config.activation.steps.map((step) => ({
    id: step.id,
    title: step.title,
    description:
      typeof step.description === "function"
        ? step.description(seg)
        : step.description,
    actionLabel: step.actionLabel,
    actionHref: step.actionHref,
    optional: step.optional ?? false,
    completedOnSignup: step.completedOnSignup ?? false,
    done: completedSteps[step.id] ?? false,
  }));

  const ahaEventLabel =
    config.activation.ahaEventLabel ?? "You've seen the value.";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Logo placeholder */}
        <div className="text-center">
          <span className="text-xl font-bold tracking-tight">kolonaki</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">Let&apos;s get you to your first win</h1>
          <ChecklistClient
            steps={steps}
            ahaReached={ahaReached}
            ahaEventLabel={ahaEventLabel}
          />
        </div>

        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground underline text-center"
        >
          Skip to dashboard →
        </Link>
      </div>
    </div>
  );
}
