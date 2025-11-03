const envCandidates = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PROJECT_URL: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
  SUPABASE_PROJECT_URL: process.env.SUPABASE_PROJECT_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
};

const SUPABASE_URL_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_URL",
  "SUPABASE_PROJECT_URL",
];

const SUPABASE_ANON_KEY_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
];

export function getSupabaseCredentials() {
  const supabaseAnonKey = readFirstPresentEnv(SUPABASE_ANON_KEY_ENV_KEYS);

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const explicitSupabaseUrl = readFirstPresentEnv(SUPABASE_URL_ENV_KEYS);
  const derivedSupabaseUrl = deriveSupabaseUrlFromAnonKey(supabaseAnonKey);
  const supabaseUrl = explicitSupabaseUrl ?? derivedSupabaseUrl;

  if (!supabaseUrl) {
    throw new Error(
      "Unable to determine Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or supply an anon key that includes an issuer."
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function readFirstPresentEnv(keys) {
  for (const key of keys) {
    const value = normalizeEmptyString(envCandidates[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function deriveSupabaseUrlFromAnonKey(anonKey) {
  try {
    const [, payloadPart] = (anonKey ?? "").split(".");

    if (!payloadPart) {
      return undefined;
    }

    const payloadJson = parseBase64UrlJson(payloadPart);
    const issuer =
      typeof payloadJson?.iss === "string" ? payloadJson.iss : null;

    if (issuer) {
      try {
        const issuerUrl = new URL(issuer);
        issuerUrl.pathname = "/";
        issuerUrl.search = "";
        issuerUrl.hash = "";
        return issuerUrl.origin;
      } catch (error) {
        console.warn(
          "Unable to parse Supabase issuer from anon key; falling back to project id.",
          error
        );
      }
    }

    const projectId =
      typeof payloadJson?.project_id === "string"
        ? payloadJson.project_id
        : typeof payloadJson?.projectId === "string"
        ? payloadJson.projectId
        : undefined;

    if (!projectId) {
      return undefined;
    }

    return `https://${projectId}.supabase.co`;
  } catch (error) {
    console.warn("Unable to derive Supabase URL from anon key payload.", error);
    return undefined;
  }
}

function parseBase64UrlJson(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  let decoded;

  if (typeof atob === "function") {
    decoded = atob(padded);
  } else if (typeof Buffer !== "undefined") {
    decoded = Buffer.from(padded, "base64").toString("utf-8");
  } else {
    throw new Error("No base64 decoder available in this environment.");
  }

  return JSON.parse(decoded);
}

function normalizeEmptyString(value) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
