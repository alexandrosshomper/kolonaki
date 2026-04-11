import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendKolonakiEmail } from "@/lib/kolonaki/email";

// Creating a handler to a GET request to route /auth/confirm
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // Create redirect link without the secret token
  const redirectTo = request.nextUrl.clone();
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Welcome email — fire-and-forget, confirmed address only
      if (user?.email) {
        sendKolonakiEmail("signup", user.email);
      }

      redirectTo.pathname = "/onboarding/segmentation";
      return NextResponse.redirect(redirectTo);
    }
  }

  // return the user to an error page with some instructions
  redirectTo.pathname = "/error";
  return NextResponse.redirect(redirectTo);
}
