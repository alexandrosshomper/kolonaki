import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

mock.module(
  "next/cache",
  {
    exports: {
      revalidatePath: () => {},
    },
  },
  { parentURL: new URL("../actions.js", import.meta.url).href }
);

mock.module(
  "next/navigation",
  {
    exports: {
      redirect: () => {
        throw new Error("redirect should not be called during tests");
      },
    },
  },
  { parentURL: new URL("../actions.js", import.meta.url).href }
);

const { signup } = await import("../actions.js");

describe("signup", () => {
  it("returns an error message when passwords do not match", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "password123");
    formData.set("confirm-password", "different");

    const result = await signup(undefined, formData);

    assert.deepStrictEqual(result, {
      status: "error",
      message: "Confirm password did not match the password.",
      email: "user@example.com",
      passwordStatus: "success",
      confirmPasswordStatus: "error",
      shouldResetPasswords: true,
    });
  });

  it("returns an error message when password is too short", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "short");
    formData.set("confirm-password", "short");

    const result = await signup(undefined, formData);

    assert.deepStrictEqual(result, {
      status: "error",
      message:
        "Password too short. Password needs to be at least 8 characters long.",
      email: "user@example.com",
      passwordStatus: "error",
      confirmPasswordStatus: "idle",
      shouldResetPasswords: true,
    });
  });

  it("requires a password value", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("confirm-password", "password123");

    const result = await signup(undefined, formData);

    assert.deepStrictEqual(result, {
      status: "error",
      message: "Password and confirmation are required.",
      email: "user@example.com",
      passwordStatus: "error",
      confirmPasswordStatus: "error",
      shouldResetPasswords: true,
    });
  });

  it("requires a confirmation password value", async () => {
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "password123");

    const result = await signup(undefined, formData);

    assert.deepStrictEqual(result, {
      status: "error",
      message: "Password and confirmation are required.",
      email: "user@example.com",
      passwordStatus: "error",
      confirmPasswordStatus: "error",
      shouldResetPasswords: true,
    });
  });
});
