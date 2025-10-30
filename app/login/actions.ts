"use server";

import { createClient } from "../../utils/supabase/server";

export type FieldStatus = "idle" | "error" | "success";

export type SignupFormState = {
  status: FieldStatus;
  message: string | null;
  email: string;
  passwordStatus: FieldStatus;
  confirmPasswordStatus: FieldStatus;
  shouldResetPasswords: boolean;
};

async function revalidateRootLayout() {
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/", "layout");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const emailEntry = formData.get("email");
  const passwordEntry = formData.get("password");

  const data = {
    email: typeof emailEntry === "string" ? emailEntry : "",
    password: typeof passwordEntry === "string" ? passwordEntry : "",
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

export async function signup(
  prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirm-password");

  const passwordTooShortMessage =
    "Password too short. Password needs to be at least 8 characters long.";
  const confirmPasswordMismatchMessage =
    "Confirm password did not match the password.";

  const emailValue = typeof email === "string" ? email : prevState.email;

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return {
      status: "error",
      message: "Password and confirmation are required.",
      email: emailValue,
      passwordStatus: "error",
      confirmPasswordStatus: "error",
      shouldResetPasswords: true,
    };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: passwordTooShortMessage,
      email: emailValue,
      passwordStatus: "error",
      confirmPasswordStatus: "idle",
      shouldResetPasswords: true,
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: confirmPasswordMismatchMessage,
      email: emailValue,
      passwordStatus: "success",
      confirmPasswordStatus: "error",
      shouldResetPasswords: true,
    };
  }

  const supabase = await createClient();

  const data = {
    email: emailValue,
    password,
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    console.error(SIGNUP_ERROR_PREFIX, error);

    return {
      status: "error",
      message: error.message ?? "Unable to sign up right now.",
      email: emailValue,
      passwordStatus: "success",
      confirmPasswordStatus: "success",
      shouldResetPasswords: false,
    };
  }

  await revalidateRootLayout();

  return {
    status: "success",
    message: null,
    email: "",
    passwordStatus: "success",
    confirmPasswordStatus: "success",
    shouldResetPasswords: false,
  };
}
