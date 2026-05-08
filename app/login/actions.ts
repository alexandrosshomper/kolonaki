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

export type ResetPasswordFormState = {
  status: FieldStatus;
  message: string | null;
  passwordStatus: FieldStatus;
  confirmPasswordStatus: FieldStatus;
  shouldResetPasswords: boolean;
};

export type ProfileFormState = {
  status: FieldStatus;
  message: string | null;
  fullNameStatus: FieldStatus;
};

const PROFILE_UPSERT_ERROR_PREFIX = "Supabase profile upsert error:";
const FULL_NAME_REQUIRED_MESSAGE = "Please enter your full name.";
const FULL_NAME_TOO_LONG_MESSAGE =
  "Full name must be 80 characters or fewer.";

async function revalidateRootLayout() {
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/otp", "layout");
}

const VERIFY_OTP_ERROR_PREFIX = "Supabase verify OTP error:";
const RESEND_OTP_ERROR_PREFIX = "Supabase resend OTP error:";

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
  const { redirect } = await import("next/navigation");
  redirect("/dashboard");
}

const SIGNUP_ERROR_PREFIX = "Supabase signup error:";
const PASSWORD_TOO_SHORT_MESSAGE =
  "Password too short. Password needs to be at least 8 characters long.";
const CONFIRM_PASSWORD_MISMATCH_MESSAGE =
  "Confirm password did not match the password.";
const RESET_PASSWORD_UPDATE_ERROR_PREFIX =
  "Supabase reset password update error:";

export async function signup(
  prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirm-password");

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
      message: PASSWORD_TOO_SHORT_MESSAGE,
      email: emailValue,
      passwordStatus: "error",
      confirmPasswordStatus: "idle",
      shouldResetPasswords: true,
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: CONFIRM_PASSWORD_MISMATCH_MESSAGE,
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

  const { redirect } = await import("next/navigation");
  redirect(`/otp?email=${encodeURIComponent(emailValue)}`);

  return {
    status: "success",
    message: null,
    email: "",
    passwordStatus: "success",
    confirmPasswordStatus: "success",
    shouldResetPasswords: false,
  };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await revalidateRootLayout();
  const { redirect } = await import("next/navigation");
  redirect("/login");
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();

  const rawEmail = formData.get("email");
  const rawToken = formData.get("otp");

  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  const token = typeof rawToken === "string" ? rawToken.replace(/\D/g, "") : "";

  const { redirect } = await import("next/navigation");

  if (!email || token.length !== 6) {
    const params = new URLSearchParams();
    params.set("status", "error");

    if (!email) {
      params.set("message", "Missing email for verification.");
    } else {
      params.set("message", "Invalid verification code provided.");
      params.set("email", email);
    }

    redirect(`/otp?${params.toString()}`);
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    console.error(VERIFY_OTP_ERROR_PREFIX, error);

    const params = new URLSearchParams({
      message: error.message ?? "Unable to verify the provided code.",
      email,
      status: "error",
    });

    redirect(`/otp?${params.toString()}`);
  }

  await revalidateRootLayout();
  redirect("/onboarding/profile");
}

export async function resendOtp(formData: FormData) {
  const supabase = await createClient();

  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  const { redirect } = await import("next/navigation");

  if (!email) {
    const params = new URLSearchParams({
      status: "error",
      message: "Missing email for resending verification code.",
    });

    redirect(`/otp?${params.toString()}`);
  }

  const { error } = await supabase.auth.resend({
    email,
    type: "signup",
  });

  if (error) {
    console.error(RESEND_OTP_ERROR_PREFIX, error);

    const params = new URLSearchParams({
      status: "error",
      message: error.message ?? "Unable to resend the verification code.",
      email,
    });

    redirect(`/otp?${params.toString()}`);
  }

  const params = new URLSearchParams({
    status: "success",
    message: "A new verification code was sent to your email.",
    email,
  });

  redirect(`/otp?${params.toString()}`);
}

export async function resetPassword(
  prevState: ResetPasswordFormState,
  formData: FormData
): Promise<ResetPasswordFormState> {
  const passwordEntry = formData.get("password");
  const confirmPasswordEntry = formData.get("confirm-password");

  const password =
    typeof passwordEntry === "string" ? passwordEntry.trim() : "";
  const confirmPassword =
    typeof confirmPasswordEntry === "string"
      ? confirmPasswordEntry.trim()
      : "";

  if (!password || !confirmPassword) {
    return {
      status: "error",
      message: "Password and confirmation are required.",
      passwordStatus: password ? "success" : "error",
      confirmPasswordStatus: confirmPassword ? "success" : "error",
      shouldResetPasswords: false,
    };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: PASSWORD_TOO_SHORT_MESSAGE,
      passwordStatus: "error",
      confirmPasswordStatus: "idle",
      shouldResetPasswords: false,
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: CONFIRM_PASSWORD_MISMATCH_MESSAGE,
      passwordStatus: "success",
      confirmPasswordStatus: "error",
      shouldResetPasswords: false,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error(RESET_PASSWORD_UPDATE_ERROR_PREFIX, error);

    return {
      status: "error",
      message:
        error.message ?? "Unable to update your password. Please try again.",
      passwordStatus: "success",
      confirmPasswordStatus: "success",
      shouldResetPasswords: false,
    };
  }

  return {
    status: "success",
    message: "Your password has been updated. You can now sign in.",
    passwordStatus: "success",
    confirmPasswordStatus: "success",
    shouldResetPasswords: true,
  };
}

export async function completeProfile(
  prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  const fullNameEntry = formData.get("full_name");
  const avatarUrlEntry = formData.get("avatar_url");

  const fullName =
    typeof fullNameEntry === "string" ? fullNameEntry.trim() : "";
  const avatarUrl =
    typeof avatarUrlEntry === "string" && avatarUrlEntry.length > 0
      ? avatarUrlEntry
      : null;

  if (fullName.length < 2) {
    return {
      status: "error",
      message: FULL_NAME_REQUIRED_MESSAGE,
      fullNameStatus: "error",
    };
  }

  if (fullName.length > 80) {
    return {
      status: "error",
      message: FULL_NAME_TOO_LONG_MESSAGE,
      fullNameStatus: "error",
    };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error(PROFILE_UPSERT_ERROR_PREFIX, error);
    return {
      status: "error",
      message:
        error.message ?? "Unable to save your profile. Please try again.",
      fullNameStatus: "idle",
    };
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard", "layout");

  const { redirect } = await import("next/navigation");
  redirect("/dashboard");

  return {
    status: "success",
    message: null,
    fullNameStatus: "idle",
  };
}
