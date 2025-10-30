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
      message: "Passwords do not match.",
      email: "user@example.com",
    });
  });
});
