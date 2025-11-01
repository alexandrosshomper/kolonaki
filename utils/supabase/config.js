const requiredEnvVarNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

export function getSupabaseCredentials() {
  const credentials = {};

  for (const name of requiredEnvVarNames) {
    const value = process.env[name];

    if (!value) {
      throw new Error(`Missing environment variable: ${name}`);
    }

    credentials[name] = value;
  }

  return {
    supabaseUrl: credentials.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: credentials.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
