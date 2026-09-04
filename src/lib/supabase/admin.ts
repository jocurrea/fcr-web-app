import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

/**
 * Creates a Supabase client configured with the service role key.
 * This client bypasses Row Level Security (RLS) and should only be used in
 * server-side code (Server Actions, Route Handlers) for privileged operations.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable on the server."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
