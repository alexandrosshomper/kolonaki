export function getSupabaseCredentials() {
  // IMPORTANT: Use explicit process.env.NEXT_PUBLIC_* references here, NOT dynamic
  // key access (process.env[key]). Turbopack and webpack only inline NEXT_PUBLIC_*
  // vars into client bundles when they appear as static member expressions.
  // Dynamic lookup (process.env["KEY"] via a variable) returns undefined in the browser.
  const supabaseAnonKey =
    normalizeEmptyString(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    normalizeEmptyString(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    normalizeEmptyString(process.env.SUPABASE_ANON_KEY);

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env.local (Supabase dashboard → Project Settings → API Keys)."
    );
  }

  const supabaseUrl =
    normalizeEmptyString(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    normalizeEmptyString(process.env.SUPABASE_URL) ??
    normalizeEmptyString(process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL) ??
    normalizeEmptyString(process.env.SUPABASE_PROJECT_URL) ??
    deriveSupabaseUrlFromKey(supabaseAnonKey);

  if (!supabaseUrl) {
    throw new Error(
      "Unable to determine Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL in your .env.local."
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

function deriveSupabaseUrlFromKey(key) {
  // Legacy: old anon keys were JWTs with an `iss` or `project_id` claim.
  // New publishable keys (sb_publishable_...) are not JWTs — this returns undefined for them.
  // Always set NEXT_PUBLIC_SUPABASE_URL explicitly.
  try {
    const [, payloadPart] = (key ?? "").split(".");
    if (!payloadPart) return undefined;

    const payload = parseBase64UrlJson(payloadPart);
    const issuer = typeof payload?.iss === "string" ? payload.iss : null;

    if (issuer && (issuer.startsWith("http://") || issuer.startsWith("https://"))) {
      try {
        const url = new URL(issuer);
        url.pathname = "/";
        url.search = "";
        url.hash = "";
        return url.origin;
      } catch {
        // fall through to project_id
      }
    }

    const projectId =
      typeof payload?.project_id === "string" ? payload.project_id :
      typeof payload?.projectId === "string" ? payload.projectId :
      undefined;

    return projectId ? `https://${projectId}.supabase.co` : undefined;
  } catch {
    return undefined;
  }
}

function parseBase64UrlJson(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  const decoded =
    typeof atob === "function"
      ? atob(padded)
      : typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf-8")
        : (() => { throw new Error("No base64 decoder available."); })();

  return JSON.parse(decoded);
}

function normalizeEmptyString(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
