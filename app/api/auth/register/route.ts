/**
 * Register API Route Handler
 * POST /api/auth/register: validates input with Zod, then creates the user in
 * Supabase Auth (auth.users). The on_auth_user_created trigger inserts the
 * matching public."User" profile row; we then promote the role.
 *
 * Uses the service-role admin client with email_confirm: true so accounts are
 * usable immediately (matching the old flow, which had no email confirmation).
 */

import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn("Invalid registration data", {
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { name, email, password } = validationResult.data;

    const admin = createSupabaseAdminClient();

    // Create the auth user (auto-confirmed). The on_auth_user_created trigger
    // creates the public."User" profile from email + raw_user_meta_data.name.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error) {
      // Supabase returns 422 "email address has already been registered" on dupes.
      const isDuplicate =
        error.status === 422 || /already.*registered/i.test(error.message);
      return NextResponse.json(
        {
          error: isDuplicate
            ? "A user with this email already exists. Please sign in instead."
            : error.message,
        },
        { status: isDuplicate ? 409 : (error.status ?? 500) },
      );
    }

    const user = data.user;
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    // Bootstrap the first account as admin; everyone after is a regular user.
    // The signup trigger already inserted this profile with role "user", so a
    // total count of exactly 1 means this is the very first user.
    const { count, error: countError } = await admin
      .from("User")
      .select("id", { count: "exact", head: true });

    if (countError) {
      logger.error("Failed to count users for admin bootstrap", countError);
    } else if ((count ?? 0) <= 1) {
      const { error: roleError } = await admin
        .from("User")
        .update({ role: "admin" })
        .eq("id", user.id);

      if (roleError) {
        logger.error("Failed to promote first user to admin", roleError);
        // The account exists; surface a soft error rather than failing signup.
      }
    }

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(
      {
        id: user.id,
        name,
        email: user.email,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Registration error:", error);

    const message =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      { error: `Registration failed: ${message}` },
      { status: 500 },
    );
  }
}
