/**
 * Supabase server client (App Router).
 * Reads/writes the auth session cookies (sb-*) via next/headers, so calling
 * supabase.auth.* in a Route Handler or Server Action persists the session
 * automatically. Use this anywhere you act AS the logged-in user (RLS applies).
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component (cookies are read-only there).
            // Safe to ignore when a middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
