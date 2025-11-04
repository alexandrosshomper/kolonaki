import test from "node:test";
import assert from "node:assert/strict";

// Fixture maintenance: if Supabase's required environment variables change,
// update the explicitEnv values and envKeysToManage collection below so this
// test reflects the latest expectations before re-running the suite.
const configModuleUrl = new URL("../utils/supabase/config.js", import.meta.url);

const envKeysToManage = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  "SUPABASE_PROJECT_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
];

async function withManagedEnv(overrides, callback) {
  const originalValues = new Map();

  for (const key of envKeysToManage) {
    originalValues.set(key, process.env[key]);
  }

  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    for (const key of envKeysToManage) {
      if (!(key in overrides)) {
        delete process.env[key];
      }
    }

    return await callback();
  } finally {
    for (const [key, value] of originalValues.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function importConfigFresh() {
  const freshUrl = new URL(configModuleUrl.href);
  freshUrl.searchParams.set("fresh", `${Date.now()}-${Math.random()}`);
  return import(freshUrl.href);
}

test("getSupabaseCredentials returns explicit credentials when variables are set", async () => {
  const explicitEnv = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example-project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  };

  await withManagedEnv(explicitEnv, async () => {
    const { getSupabaseCredentials } = await importConfigFresh();
    const credentials = getSupabaseCredentials();

    assert.deepEqual(credentials, {
      supabaseUrl: explicitEnv.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: explicitEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  });
});

test("getSupabaseCredentials throws when required variables are missing", async () => {
  await withManagedEnv({}, async () => {
    const { getSupabaseCredentials } = await importConfigFresh();
    assert.throws(() => getSupabaseCredentials(), /Missing Supabase anon key/);
  });
});
