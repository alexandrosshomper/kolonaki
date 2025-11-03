import { randomUUID } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const tsModuleUrl = new URL("./actions.ts", import.meta.url);
const tsModulePath = fileURLToPath(tsModuleUrl);
const source = await readFile(tsModulePath, "utf8");

const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
  },
  fileName: tsModulePath,
});

const resolvedOutput = outputText.replace(
  /from "(\.\.?\/[^"\n]+)"/g,
  (fullMatch, specifier) => {
    if (/\.(?:[cm]?js|ts|tsx|json)$/.test(specifier)) {
      return fullMatch;
    }
    return fullMatch.replace(specifier, `${specifier}.js`);
  }
);

const tempFilename = `.actions.test-${process.pid}-${randomUUID()}.mjs`;
const tempFilePath = join(dirname(tsModulePath), tempFilename);
await writeFile(tempFilePath, resolvedOutput, "utf8");

let moduleNamespace;
try {
  moduleNamespace = await import(pathToFileURL(tempFilePath).href);
} finally {
  await unlink(tempFilePath).catch(() => {});
}

export const login = moduleNamespace.login;
export const signup = moduleNamespace.signup;
export const signout = moduleNamespace.signout;
export const verifyOtp = moduleNamespace.verifyOtp;
export const resendOtp = moduleNamespace.resendOtp;
export const sendPasswordResetLink = moduleNamespace.sendPasswordResetLink;
export const resetPassword = moduleNamespace.resetPassword;
"use server"

import { createClient } from "../../utils/supabase/server"

export async function login(formData) {
  const supabase = await createClient()

  const emailEntry = formData.get("email")
  const passwordEntry = formData.get("password")

  const data = {
    email: typeof emailEntry === "string" ? emailEntry : "",
    password: typeof passwordEntry === "string" ? passwordEntry : "",
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error("Supabase login error:", error)

    const errorDetails = new URLSearchParams({
      message: error.message ?? "Unable to log in right now.",
    })

    if (error.status) {
      errorDetails.set("status", String(error.status))
    }

    const { redirect } = await import("next/navigation")
    redirect(`/error?${errorDetails.toString()}`)
  }

  await revalidateRootLayout()
  const { redirect } = await import("next/navigation")
  redirect("/dashboard")
}

async function revalidateRootLayout() {
  const { revalidatePath } = await import("next/cache")
  revalidatePath("/otp", "layout")
}

export async function signup(prevState, formData) {
  const email = formData.get("email")
  const password = formData.get("password")
  const confirmPassword = formData.get("confirm-password")

  const passwordTooShortMessage =
    "Password too short. Password needs to be at least 8 characters long."
  const confirmPasswordMismatchMessage =
    "Confirm password did not match the password."

  const emailValue = typeof email === "string" ? email : prevState?.email ?? ""

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return {
      status: "error",
      message: "Password and confirmation are required.",
      email: emailValue,
      passwordStatus: "error",
      confirmPasswordStatus: "error",
      shouldResetPasswords: true,
    }
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: passwordTooShortMessage,
      email: emailValue,
      passwordStatus: "error",
      confirmPasswordStatus: "idle",
      shouldResetPasswords: true,
    }
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message: confirmPasswordMismatchMessage,
      email: emailValue,
      passwordStatus: "success",
      confirmPasswordStatus: "error",
      shouldResetPasswords: true,
    }
  }

  const supabase = await createClient()

  const data = {
    email: emailValue,
    password,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    console.error("Supabase signup error:", error)

    return {
      status: "error",
      message: error.message ?? "Unable to sign up right now.",
      email: emailValue,
      passwordStatus: "success",
      confirmPasswordStatus: "success",
      shouldResetPasswords: false,
    }
  }

  await revalidateRootLayout()

  const { redirect } = await import("next/navigation")
  redirect(`/otp?email=${encodeURIComponent(emailValue)}`)

  return {
    status: "success",
    message: null,
    email: "",
    passwordStatus: "success",
    confirmPasswordStatus: "success",
    shouldResetPasswords: false,
  }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  await revalidateRootLayout()
  const { redirect } = await import("next/navigation")
  redirect("/login")
}

export async function verifyOtp(formData) {
  const supabase = await createClient()

  const rawEmail = formData.get("email")
  const rawToken = formData.get("otp")

  const email = typeof rawEmail === "string" ? rawEmail.trim() : ""
  const token = typeof rawToken === "string" ? rawToken.replace(/\D/g, "") : ""

  const { redirect } = await import("next/navigation")

  if (!email || token.length !== 6) {
    const params = new URLSearchParams()
    params.set("status", "error")

    if (!email) {
      params.set("message", "Missing email for verification.")
    } else {
      params.set("message", "Invalid verification code provided.")
      params.set("email", email)
    }

    redirect(`/otp?${params.toString()}`)
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  })

  if (error) {
    console.error("Supabase verify OTP error:", error)

    const params = new URLSearchParams({
      message: error.message ?? "Unable to verify the provided code.",
      email,
      status: "error",
    })

    redirect(`/otp?${params.toString()}`)
  }

  await revalidateRootLayout()
  redirect("/dashboard")
}

export async function resendOtp(formData) {
  const supabase = await createClient()

  const rawEmail = formData.get("email")
  const email = typeof rawEmail === "string" ? rawEmail.trim() : ""

  const { redirect } = await import("next/navigation")

  if (!email) {
    const params = new URLSearchParams({
      status: "error",
      message: "Missing email for resending verification code.",
    })

    redirect(`/otp?${params.toString()}`)
  }

  const { error } = await supabase.auth.resend({
    email,
    type: "signup",
  })

  if (error) {
    console.error("Supabase resend OTP error:", error)

    const params = new URLSearchParams({
      status: "error",
      message: error.message ?? "Unable to resend the verification code.",
      email,
    })

    redirect(`/otp?${params.toString()}`)
  }

  const params = new URLSearchParams({
    status: "success",
    message: "A new verification code was sent to your email.",
    email,
  })

  redirect(`/otp?${params.toString()}`)
}
