/**
 * Authentication utilities: JWT session tokens, password hashing, and session resolution.
 * Used by API routes (getSessionFromRequest) and client (getSessionClient via /api/auth/session).
 */
import { cache } from "react";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User as PrismaUser } from "@prisma/client";
import Cookies from "js-cookie"; // Import js-cookie
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/prisma/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCache, setCache, cacheKeys } from "@/lib/cache";

/** Secret for signing/verifying JWT; must match across server and be set in production. */
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

type User = PrismaUser;

// Check if we're on the server side
const isServer = typeof window === "undefined";

/** Creates a signed JWT containing userId; used after login to set session cookie. */
export const generateToken = (userId: string): string => {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
  return token;
};

/** Verifies JWT and returns decoded payload (userId); returns null if invalid or on client. */
export const verifyToken = (token: string): { userId: string } | null => {
  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  // Only verify tokens on the server side
  if (!isServer) {
    // On client side, we'll just return null to avoid JWT library issues
    return null;
  }

  try {
    // Check if jwt is properly imported
    if (typeof jwt === "undefined" || !jwt.verify) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Resolve the current user from the Supabase session.
 *
 * Reads the sb-* auth cookies (via the Supabase server client), validates them
 * with Supabase, then loads the matching public."User" profile row. Returns a
 * User-shaped object so existing callers (which read id/email/name/role/image)
 * keep working unchanged.
 *
 * NOTE: during the Mongo -> Supabase migration this resolves identity against
 * Supabase Auth while many data routes still query Mongo via Prisma. Those data
 * reads are part of a later migration slice.
 */
/** Profile row shape cached for resolveSupabaseUser (public."User" columns we read). */
type CachedProfile = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  username?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  emailPreferences?: unknown;
};

/** Short TTL (seconds) for the cached profile row. Busted by invalidateAllCaches() on mutations. */
const SESSION_PROFILE_TTL = 60;

export const resolveSupabaseUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();

  // Verify the access token locally from its claims instead of a network
  // round-trip to the Supabase auth server. This project uses asymmetric
  // (ES256) JWT signing keys, so getClaims() verifies the signature locally via
  // WebCrypto against the JWKS, which auth-js caches process-globally for 10
  // minutes — so only the first resolution per process touches the network.
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) {
    return null;
  }

  const userId = claims.sub;
  const authEmail = typeof claims.email === "string" ? claims.email : "";

  // The app-level profile (name/role/image/...) lives in public."User". Cache it
  // briefly so the many auth resolutions per page load (SSR + every API call)
  // don't each hit the database. The sessions:* namespace is already cleared by
  // invalidateAllCaches() after mutations, so role/profile edits propagate fast.
  // NOTE: when Redis is not configured (getCache returns null) this query runs
  // on every resolution, so it's the dominant per-request cost — the React
  // cache() wrapper above still collapses repeat calls within a single request.
  const profileCacheKey = cacheKeys.sessions.user(userId);
  let profile = await getCache<CachedProfile>(profileCacheKey);
  if (!profile) {
    const { data } = await supabase
      .from("User")
      // Only the columns shaped into the User object below; avoids select("*").
      .select(
        "email, name, image, role, username, createdAt, updatedAt, emailPreferences",
      )
      .eq("id", userId)
      .single();
    profile = (data as CachedProfile | null) ?? null;
    if (profile) {
      await setCache(profileCacheKey, profile, SESSION_PROFILE_TTL);
    }
  }

  // Shape a User-compatible object from the profile (+ auth email fallback).
  // Cast through unknown because the Postgres profile omits Mongo-only fields
  // (password, googleId) that the Prisma User type still declares.
  return {
    id: userId,
    email: authEmail || profile?.email || "",
    name: profile?.name ?? "",
    image: profile?.image ?? null,
    role: profile?.role ?? "user",
    username: profile?.username ?? null,
    createdAt: profile?.createdAt ?? null,
    updatedAt: profile?.updatedAt ?? null,
    emailPreferences: profile?.emailPreferences ?? null,
  } as unknown as User;
});

/**
 * Get session from Pages API request
 * @deprecated Use getSessionFromRequest for App Router compatibility
 */
export const getSessionServer = async (
  _req: NextApiRequest,
  _res: NextApiResponse
): Promise<User | null> => {
  return resolveSupabaseUser();
};

/**
 * Get session from App Router NextRequest.
 * The `request` argument is kept for signature compatibility; the session is
 * read from the Supabase auth cookies via next/headers, not from `request`.
 */
export const getSessionFromRequest = async (_request: {
  cookies: { get: (name: string) => { value: string } | undefined };
}): Promise<User | null> => {
  return resolveSupabaseUser();
};

/** Client-side: fetches /api/auth/session with cookies to get current user (avoids using JWT on client). */
export const getSessionClient = async (): Promise<User | null> => {
  try {
    const token = Cookies.get("session_id");
    if (!token) {
      return null;
    }

    // On client side, we'll make an API call to verify the token
    // This avoids using the JWT library on the client side
    const response = await fetch("/api/auth/session", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies
    });

    if (response.ok) {
      const user = await response.json();
      return user;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/** Hashes a plain password with bcrypt for safe storage (used on registration). */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/** Compares plain password with stored hash (used on login). */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
