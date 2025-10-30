"use server";

import { createClient } from "../../utils/supabase/server";

async function revalidateRootLayout() {
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/", "layout");
}

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

    const { redirect } = await import("next/navigation");
    redirect(`/error?${errorDetails.toString()}`);
  }

  await revalidateRootLayout();
}

const SIGNUP_ERROR_PREFIX = "Supabase signup error:";

export async function signup(prevState, formData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirm-password");

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return {
      status: "error",
      message: "Password and confirmation are required.",
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Passwords do not match.",
    };
  }

  const supabase = await createClient();

  const data = {
    email: formData.get("email"),
    password,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    console.error(SIGNUP_ERROR_PREFIX, error);

    return {
      status: "error",
      message: error.message ?? "Unable to sign up right now.",
    };
  }

  await revalidateRootLayout();

  return {
    status: "success",
    message: null,
  };
}
