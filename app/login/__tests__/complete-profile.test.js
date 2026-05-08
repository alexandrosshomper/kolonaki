import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

const supabaseState = {
  user: null,
  upsertError: null,
  upsertCalls: [],
};

mock.module("../../../utils/supabase/server.js", {
  namedExports: {
    createClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user: supabaseState.user } }),
      },
      from: () => ({
        upsert: async (row) => {
          supabaseState.upsertCalls.push(row);
          return { error: supabaseState.upsertError };
        },
      }),
    }),
  },
});

const { completeProfile } = await import("../actions.js");

const initialProfileState = {
  status: "idle",
  message: null,
  fullNameStatus: "idle",
};

function setupAuthenticatedUser() {
  supabaseState.user = { id: "user-1", email: "user@example.com" };
  supabaseState.upsertError = null;
  supabaseState.upsertCalls.length = 0;
}

describe("completeProfile validation", () => {
  it("returns an error when full name is empty", async () => {
    setupAuthenticatedUser();

    const formData = new FormData();
    formData.set("full_name", "   ");

    const result = await completeProfile(initialProfileState, formData);

    assert.deepStrictEqual(result, {
      status: "error",
      message: "Please enter your full name.",
      fullNameStatus: "error",
    });
    assert.equal(supabaseState.upsertCalls.length, 0);
  });

  it("returns an error when full name is too long", async () => {
    setupAuthenticatedUser();

    const formData = new FormData();
    formData.set("full_name", "A".repeat(81));

    const result = await completeProfile(initialProfileState, formData);

    assert.deepStrictEqual(result, {
      status: "error",
      message: "Full name must be 80 characters or fewer.",
      fullNameStatus: "error",
    });
    assert.equal(supabaseState.upsertCalls.length, 0);
  });

  it("returns an error when name is shorter than 2 characters", async () => {
    setupAuthenticatedUser();

    const formData = new FormData();
    formData.set("full_name", "A");

    const result = await completeProfile(initialProfileState, formData);

    assert.equal(result.status, "error");
    assert.equal(result.fullNameStatus, "error");
    assert.equal(supabaseState.upsertCalls.length, 0);
  });
});

describe("completeProfile persistence", () => {
  it("returns an error when the upsert fails and surfaces the message", async () => {
    setupAuthenticatedUser();
    supabaseState.upsertError = { message: "boom" };

    const formData = new FormData();
    formData.set("full_name", "Ada Lovelace");
    formData.set("avatar_url", "user-1-abc.png");

    const result = await completeProfile(initialProfileState, formData);

    assert.deepStrictEqual(result, {
      status: "error",
      message: "boom",
      fullNameStatus: "idle",
    });
    assert.equal(supabaseState.upsertCalls.length, 1);
    const row = supabaseState.upsertCalls[0];
    assert.equal(row.id, "user-1");
    assert.equal(row.full_name, "Ada Lovelace");
    assert.equal(row.avatar_url, "user-1-abc.png");
    assert.equal(typeof row.updated_at, "string");
  });

  it("trims whitespace from full name and treats empty avatar as null", async () => {
    setupAuthenticatedUser();
    supabaseState.upsertError = { message: "halt" };

    const formData = new FormData();
    formData.set("full_name", "  Ada Lovelace  ");
    formData.set("avatar_url", "");

    const result = await completeProfile(initialProfileState, formData);

    assert.equal(result.status, "error");
    assert.equal(supabaseState.upsertCalls.length, 1);
    const row = supabaseState.upsertCalls[0];
    assert.equal(row.full_name, "Ada Lovelace");
    assert.equal(row.avatar_url, null);
  });
});
