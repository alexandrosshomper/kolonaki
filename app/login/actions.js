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

  revalidatePath("/dashboard", "layout");
}

const SIGNUP_ERROR_PREFIX = "Supabase signup error:";
const SIGNUP_DEFAULT_ERROR = "Unable to sign up right now. Please try again.";
const SIGNUP_SUCCESS_MESSAGE =
  "Success! Please check your inbox to confirm your account.";

export async function signup(_prevState, formData) {
  return signupAction(formData);
}

export async function signupAction(formData) {
  return handleSignup(formData);
}

async function handleSignup(formData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const confirmPasswordValue = formData.get("confirm-password");

  const email =
    typeof emailValue === "string" ? emailValue.trim() : "";
  const password =
    typeof passwordValue === "string" ? passwordValue : "";
  const confirmPassword =
    typeof confirmPasswordValue === "string"
      ? confirmPasswordValue
      : "";

  if (email.length === 0) {
    return {
      status: "error",
      message: "Please enter a valid email address.",
    };
  }

  if (password.length === 0 || confirmPassword.length === 0) {
    return {
      status: "error",
      message: "Password and confirmation are required.",
      email,
    };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "Password must be at least 8 characters long.",
      email,
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: "Passwords do not match.",
      email,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error(SIGNUP_ERROR_PREFIX, error);

    return {
      status: "error",
      message: error.message ?? SIGNUP_DEFAULT_ERROR,
      email,
    };
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/otp", "layout");

  return {
    status: "success",
    message: SIGNUP_SUCCESS_MESSAGE,
    email,
  };
}

export async function signout() {
  const supabase = await createClient();

  await supabase.auth.signOut({ scope: "local" });

  revalidatePath("/", "layout");
}
