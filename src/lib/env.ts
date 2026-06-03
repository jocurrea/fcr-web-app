type AppEnv = "staging" | "production";

const requiredPublicEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const optionalProjectRef = (key: string) => {
  const value = process.env[key];
  return value && !value.startsWith("your-") ? value : undefined;
};

const appEnvValue = process.env.NEXT_PUBLIC_APP_ENV;

if (appEnvValue !== "staging" && appEnvValue !== "production") {
  throw new Error(
    "Missing or invalid NEXT_PUBLIC_APP_ENV. Expected 'staging' or 'production'."
  );
}

export const appEnv = appEnvValue satisfies AppEnv;
export const isStaging = appEnv === "staging";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export const supabaseUrl = requiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = requiredPublicEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
);

const stagingSupabaseProjectRef = optionalProjectRef(
  "NEXT_PUBLIC_STAGING_SUPABASE_PROJECT_REF"
);
const productionSupabaseProjectRef = optionalProjectRef(
  "NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF"
);

if (
  isStaging &&
  productionSupabaseProjectRef &&
  supabaseUrl.includes(productionSupabaseProjectRef)
) {
  throw new Error("Staging build is using the production Supabase URL.");
}

if (
  !isStaging &&
  stagingSupabaseProjectRef &&
  supabaseUrl.includes(stagingSupabaseProjectRef)
) {
  throw new Error("Production build is using the staging Supabase URL.");
}
