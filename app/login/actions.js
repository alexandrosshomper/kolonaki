"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function login(formData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error("Supabase login error:", error);

    const errorDetails = new URLSearchParams({
      message: error.message ?? "Unable to log in right now.",
    });

    if (error.status) {
      errorDetails.set("status", String(error.status));
    }

    redirect(`/error?${errorDetails.toString()}`);
  }

  revalidatePath("/dashboard", "layout");
}

export async function signup(formData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    console.error("Supabase signup error:", error);

    const errorDetails = new URLSearchParams({
      message: error.message ?? "Unable to sign up right now.",
    });

    if (error.status) {
      errorDetails.set("status", String(error.status));
    }

    redirect(`/error?${errorDetails.toString()}`);
  }

  revalidatePath("/otp", "layout");
}

export async function signout() {
  const supabase = await createClient();

  await supabase.auth.signOut({ scope: "local" });

  revalidatePath("/", "layout");
}
