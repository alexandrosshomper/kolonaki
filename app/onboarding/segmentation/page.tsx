import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SegmentationWizard } from "./segmentation-wizard";
import config from "@/kolonaki.config";

export default async function SegmentationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Already segmented — skip to checklist
  if (user.user_metadata?.segmentation) redirect("/onboarding/checklist");

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <SegmentationWizard questions={config.segmentation.questions} />
      </div>
    </div>
  );
}
