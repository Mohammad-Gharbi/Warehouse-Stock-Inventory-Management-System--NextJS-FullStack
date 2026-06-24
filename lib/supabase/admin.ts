/**
 * Supabase admin client (service-role). SERVER-ONLY.
 *
 * Uses the service-role key, which BYPASSES Row Level Security — never import
 * this into a Client Component or expose the key to the browser. Use only for
 * privileged operations: creating users, setting roles, admin maintenance.
 */
import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
