/**
 * Login API Route Handler
 * POST /api/auth/login: validates email/password with Zod, then signs in via
 * Supabase Auth. The Supabase server client writes the session cookies (sb-*)
 * onto the response automatically; we return the same JSON shape the client
 * auth context already expects (userId, userName, userEmail, userRole, sessionId).
 */

import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import { createCorsHeaders, handleCorsPreflight } from "@/lib/api/cors";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
export async function POST(request: NextRequest) {
  try {
    const responseHeaders = createCorsHeaders(request);

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: responseHeaders },
      );
    }

    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn("Invalid login data", {
        errors: validationResult.error.errors,
      });
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400, headers: responseHeaders },
      );
    }

    const { email, password } = validationResult.data;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      // Supabase returns 400 with "Invalid login credentials" for both bad
      // password and unknown email — keep the message generic.
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401, headers: responseHeaders },
      );
    }

    // Pull display fields from the profile table (role drives access control).
    const { data: profile } = await supabase
      .from("User")
      .select("name, role")
      .eq("id", data.user.id)
      .single();

    const userRole = profile?.role ?? "user";
    const userName =
      profile?.name ?? (data.user.user_metadata?.name as string) ?? "";

    return NextResponse.json(
      {
        userId: data.user.id,
        userName,
        userEmail: data.user.email,
        userRole,
        // Returned for backward-compat with the client auth context's
        // localStorage "token"; the authoritative session is the sb-* cookies.
        sessionId: data.session.access_token,
      },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    logger.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/auth/login
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}
