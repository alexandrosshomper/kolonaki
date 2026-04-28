"use server";

import { createClient } from "../../utils/supabase/server";
import { sendKolonakiEmail } from "@/lib/kolonaki/email";
import { acceptInvitation, completeSegmentation } from "@/lib/kolonaki/actions";
import { posthog } from "@/lib/posthog/server";
import {
  readPendingSignupEmail,
  setPendingSignupEmail,
} from "@/lib/auth/pending-signup-email";

export type FieldStatus = "idle" | "error" | "success";

export type SignupFormState = {
  status: FieldStatus;
  message: string | null;
  email: string;
  emailStatus: FieldStatus;
  passwordStatus: FieldStatus;
  confirmPasswordStatus: FieldStatus;
  shouldResetPasswords: boolean;
};

export type LoginFormState = {
  status: FieldStatus;
  message: string | null;
};

export type ResetPasswordFormState = {
  status: FieldStatus;
  message: string | null;
  passwordStatus: FieldStatus;
  confirmPasswordStatus: FieldStatus;
  shouldResetPasswords: boolean;
};

async function revalidateRootLayout() {
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/otp", "layout");
}

const VERIFY_OTP_ERROR_PREFIX = "Supabase verify OTP error:";
const RESEND_OTP_ERROR_PREFIX = "Supabase resend OTP error:";
const RESEND_SIGNUP_ERROR_PREFIX = "Supabase resend signup error:";

export async function login(
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const supabase = await createClient();

  const emailEntry = formData.get("email");
  const passwordEntry = formData.get("password");

  const credentials = {
    email: typeof emailEntry === "string" ? emailEntry : "",
    password: typeof passwordEntry === "string" ? passwordEntry : "",
  };

  const { data: authData, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    console.error("Supabase login error:", error);

    // Unconfirmed email: redirect to check-email with guidance
    const isUnconfirmed =
      error.code === "email_not_confirmed" ||
      error.message?.toLowerCase().includes("email not confirmed");

    if (isUnconfirmed) {
      if (credentials.email) {
        await setPendingSignupEmail(credentials.email);
      }
      const { redirect } = await import("next/navigation");
      redirect(`/check-email?msg=unconfirmed_login`);
    }

    return {
      status: "error",
      message: error.message ?? "Unable to log in right now.",
    };
  }

  if (authData.user) {
    posthog.identify({
      distinctId: authData.user.id,
      properties: { email: authData.user.email },
    });
    posthog.capture({
      distinctId: authData.user.id,
      event: "user_logged_in",
      properties: { email: authData.user.email },
    });
  }

  await revalidateRootLayout();
  const { redirect } = await import("next/navigation");
  redirect("/dashboard");

  return { status: "idle", message: null };
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
      emailStatus: "idle",
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
      emailStatus: "idle",
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
      emailStatus: "idle",
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

  const { data: signUpData, error } = await supabase.auth.signUp({
    ...data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    console.error(SIGNUP_ERROR_PREFIX, error);

    // Already-registered email: redirect to /check-email without revealing
    // whether the address exists (Supabase notifies the existing user separately)
    const isDuplicate =
      error.code === "user_already_exists" ||
      error.message?.toLowerCase().includes("user already registered");

    if (isDuplicate) {
      // Bind the cookie to the typed email so the Resend button works for
      // duplicate-signup users without revealing the duplicate state via URL.
      await setPendingSignupEmail(emailValue);
      const { redirect } = await import("next/navigation");
      redirect("/check-email");
    }

    return {
      status: "error",
      message: error.message ?? "Unable to sign up right now.",
      email: emailValue,
      emailStatus: "error",
      passwordStatus: "success",
      confirmPasswordStatus: "success",
      shouldResetPasswords: false,
    };
  }

  if (signUpData.user) {
    posthog.capture({
      distinctId: signUpData.user.id,
      event: "user_signed_up",
      properties: { email: signUpData.user.email },
    });
  }

  await setPendingSignupEmail(emailValue);
  const { redirect } = await import("next/navigation");
  redirect("/check-email");

  return {
    status: "success",
    message: null,
    email: "",
    emailStatus: "success",
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
    type: "email",
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

  const {
    data: { user: confirmedUser },
  } = await supabase.auth.getUser();

  if (confirmedUser) {
    posthog.identify({
      distinctId: confirmedUser.id,
      properties: { email: confirmedUser.email },
    });
    posthog.capture({
      distinctId: confirmedUser.id,
      event: "otp_verified",
      properties: { email: confirmedUser.email },
    });
  }

  // Welcome email — fire-and-forget, confirmed address only
  if (confirmedUser?.email) {
    sendKolonakiEmail("signup", confirmedUser.email);
  }

  // Invite token: set on /invite/accept before signup, consumed here after confirmation
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get("kolonaki_invite_token")?.value;
  if (inviteToken) {
    cookieStore.delete("kolonaki_invite_token");
    await acceptInvitation(inviteToken).catch(console.error);
    // Seed segmentation: {} so the checklist page guard passes (invitees skip segmentation).
    // Also seeds completedOnSignup steps the same way completeSegmentation would.
    await completeSegmentation({}).catch(console.error);
    redirect("/onboarding/checklist");
  }

  redirect("/onboarding/segmentation");
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

  // Use email as distinctId here: the user is unauthenticated at OTP resend time,
  // so user.id is unavailable. PostHog will merge this into the identified profile
  // once the user completes verification.
  posthog.capture({
    distinctId: email,
    event: "otp_resent",
    properties: { email },
  });

  const params = new URLSearchParams({
    status: "success",
    message: "A new verification code was sent to your email.",
    email,
  });

  redirect(`/otp?${params.toString()}`);
}

// Resend the signup confirmation email. The email is read from a server-set
// httpOnly cookie, NOT from formData — this prevents an attacker who shares
// /check-email?email=victim@example.com from triggering Supabase to deliver a
// confirmation email to an arbitrary address from our verified sender.
//
// Outcomes are collapsed to a single generic message regardless of Supabase's
// response, so error.message ("user not found", "already confirmed", "rate
// limited") cannot be used to enumerate which addresses have pending accounts.
export async function resendSignupConfirmation() {
  const { redirect } = await import("next/navigation");

  const email = (await readPendingSignupEmail()) ?? "";

  if (!email) {
    redirect(`/check-email?msg=resend_error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    email,
    type: "signup",
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    console.error(RESEND_SIGNUP_ERROR_PREFIX, error.code ?? error.status ?? "unknown");
    redirect(`/check-email?msg=resend_error`);
  }

  // User is unauthenticated at this point. Use email as distinctId — PostHog
  // will merge once verification completes (matches the resendOtp pattern).
  posthog.capture({
    distinctId: email,
    event: "signup_email_resent",
    properties: { email },
  });

  redirect(`/check-email?msg=resend_success`);
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

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (currentUser) {
    posthog.capture({
      distinctId: currentUser.id,
      event: "password_reset_completed",
      properties: { email: currentUser.email },
    });
  }

  // Token exchange already established a session — redirect to dashboard directly
  const { redirect } = await import("next/navigation");
  redirect("/dashboard");

  // redirect() throws internally; this return satisfies TypeScript's control flow analysis
  return {
    status: "success",
    message: null,
    passwordStatus: "success",
    confirmPasswordStatus: "success",
    shouldResetPasswords: true,
  };
}
