import { redirect } from "next/navigation";

import { OnboardingProfileForm } from "@/components/onboarding-profile-form";
import { createClient } from "@/utils/supabase/server";

export default async function OnboardingProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.full_name && profile.full_name.trim().length > 0) {
    redirect("/dashboard");
  }

  return (
    <OnboardingProfileForm
      userId={user.id}
      email={user.email ?? ""}
      initialFullName={profile?.full_name ?? ""}
      initialAvatarPath={profile?.avatar_url ?? null}
    />
  );
}
