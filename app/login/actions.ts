"use server";

import { headers } from "next/headers";

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

export type ForgotPasswordFormState = {
  status: FieldStatus;
  message: string | null;
  email: string;
};

async function revalidateRootLayout() {
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/otp", "layout");
}

const VERIFY_OTP_ERROR_PREFIX = "Supabase verify OTP error:";
const RESEND_OTP_ERROR_PREFIX = "Supabase resend OTP error:";
const RESET_PASSWORD_ERROR_PREFIX = "Supabase reset password error:";

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
  redirect("/dashboard");
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

export async function sendPasswordResetLink(
  prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  const redirectOriginEntry = formData.get("redirect-origin");
  const redirectOrigin =
    typeof redirectOriginEntry === "string"
      ? normalizeRedirectOrigin(redirectOriginEntry)
      : undefined;

  if (!email) {
    return {
      status: "error",
      message: "Email is required.",
      email: prevState.email,
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "Please enter a valid email address.",
      email,
    };
  }

  const supabase = await createClient();

  const redirectTo = await getResetPasswordRedirectUrl(redirectOrigin);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error(RESET_PASSWORD_ERROR_PREFIX, error);

    return {
      status: "error",
      message: error.message ?? "Unable to send a reset password link.",
      email,
    };
  }

  return {
    status: "success",
    message: "Check your email for a link to reset your password.",
    email: "",
  };
}

function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

async function getResetPasswordRedirectUrl(
  preferredBase?: string
): Promise<string> {
  const baseUrl =
    preferredBase ??
    getBaseUrlFromEnv() ??
    (await getBaseUrlFromHeaders()) ??
    "http://localhost:3000";

  try {
    return new URL("/reset-password", baseUrl).toString();
  } catch (error) {
    console.warn(
      "Invalid base URL for password reset redirect; falling back to localhost.",
      error
    );
    return "http://localhost:3000/reset-password";
  }
}

function normalizeRedirectOrigin(origin: string): string | undefined {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
  } catch {
    // ignore invalid origins
  }

  return undefined;
}

function getBaseUrlFromEnv(): string | undefined {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    process.env.VERCEL_URL;

  if (!envUrl) {
    return undefined;
  }

  return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
}

async function getBaseUrlFromHeaders(): Promise<string | undefined> {
  try {
    const headersList = await headers();

    if (!headersList) {
      return undefined;
    }

    const originHeader = headersList.get("origin");
    if (originHeader && originHeader.startsWith("http")) {
      return originHeader;
    }

    const protocolHeader = headersList.get("x-forwarded-proto");
    const hostHeader =
      headersList.get("x-forwarded-host") ?? headersList.get("host");

    if (hostHeader) {
      const protocol =
        protocolHeader ??
        (hostHeader.includes("localhost") || hostHeader.startsWith("127.")
          ? "http"
          : "https");
      return `${protocol}://${hostHeader}`;
    }
  } catch (error) {
    console.warn(
      "Unable to resolve base URL from request headers; falling back to defaults.",
      error
    );
  }

  return undefined;
}
