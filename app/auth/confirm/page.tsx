import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { sendKolonakiEmail } from "@/lib/kolonaki/email";
import { acceptInvitation, completeSegmentation } from "@/lib/kolonaki/actions";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function confirmEmail(formData: FormData) {
  "use server";

  const token_hash = formData.get("token_hash") as string;
  const type = formData.get("type") as string;

  if (!token_hash || !type) {
    redirect("/error");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as "signup" });

  if (error) {
    redirect(
      `/error?error=access_denied&error_code=otp_expired&error_description=${encodeURIComponent(
        "Your confirmation link has expired. Please sign up again."
      )}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    sendKolonakiEmail("signup", user.email);
  }

  // Invite token: set on /invite/accept before signup, consumed here after confirmation
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get("kolonaki_invite_token")?.value;
  if (inviteToken) {
    cookieStore.delete("kolonaki_invite_token");
    await acceptInvitation(inviteToken).catch(console.error);
    await completeSegmentation({}).catch(console.error);
    redirect("/onboarding/checklist");
  }

  redirect("/onboarding/segmentation");
}

type ConfirmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams;

  const token_hash =
    typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "";
  const error = typeof params.error === "string" ? params.error : "";
  const errorDescription =
    typeof params.error_description === "string"
      ? params.error_description
      : "";

  if (error) {
    redirect(
      `/error?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(
        errorDescription ||
          "Your confirmation link has expired. Please sign up again."
      )}`
    );
  }

  if (!token_hash || !type) {
    redirect("/error");
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Logo />
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 text-center">
              <h1 className="text-2xl font-bold">Confirm your email</h1>
              <p className="text-muted-foreground text-sm">
                Click the button below to verify your email address and activate
                your account.
              </p>
              <form action={confirmEmail}>
                <input type="hidden" name="token_hash" value={token_hash} />
                <input type="hidden" name="type" value={type} />
                <Button type="submit" className="w-full">
                  Confirm email
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
