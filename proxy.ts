/**
 * Next.js 16 Proxy — lightweight cookie-existence check.
 * Runs as a network boundary handler so unauthenticated visitors are
 * redirected to /login instantly without starting a serverless function.
 *
 * NO fetch / API call / JWT verification here; server components and
 * API routes handle full session validation.
 */

import { NextRequest, NextResponse } from "next/server";

const PUBLIC = new Set(["/login", "/register"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.has(pathname)) {
    return NextResponse.next();
  }

  // Supabase (@supabase/ssr) is the source of truth for the session and stores
  // it in cookie(s) named `sb-<project-ref>-auth-token` (chunked .0/.1 when
  // large). Gate on that so the proxy agrees with server-side session checks
  // (resolveSupabaseUser); gating on the legacy `session_id` cookie caused a
  // /login <-> / redirect loop whenever `session_id` was absent but the
  // Supabase cookies were present (e.g. after a browser restart, since
  // `session_id` is set without an expiry and dies on close).
  const hasSupabaseSession = request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") &&
        c.name.includes("-auth-token") &&
        !!c.value,
    );

  // Still honor the legacy JWT cookie so any old sessions keep working.
  const legacy = request.cookies.get("session_id")?.value;
  const hasLegacy = !!legacy && legacy !== "null" && legacy !== "undefined";

  if (!hasSupabaseSession && !hasLegacy) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.woff|.*\\.woff2).*)",
  ],
};
