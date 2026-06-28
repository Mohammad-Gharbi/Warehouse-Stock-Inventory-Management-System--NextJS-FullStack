/**
 * Partner Requests API Route Handler
 * POST /api/partner-requests — submit a partner account application (public:
 *   logged-in users reuse their account; anonymous visitors create one).
 * GET  /api/partner-requests — admin-only list (optional ?status= filter).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { partnerSignupBodySchema } from "@/lib/validations";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAuditLog } from "@/prisma/audit-log";
import {
  createPartnerRequest,
  getPartnerRequests,
  getPendingRequestForUser,
} from "@/prisma/partner-request";
import { createPartnerRequestSubmittedNotification } from "@/lib/notifications/in-app";
import type { PartnerRequestStatus } from "@/types";

const PARTNER_STATUSES: PartnerRequestStatus[] = [
  "pending",
  "approved",
  "rejected",
];

/**
 * POST /api/partner-requests
 * Submit a partner account application.
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = partnerSignupBodySchema.safeParse(body);
    if (!parsed.success) {
      logger.warn("Invalid partner signup data", {
        errors: parsed.error.errors,
      });
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { companyName, rc, nif, nis, contact, name, email, password } =
      parsed.data;

    // Resolve the applicant user. Logged-in users reuse their account; anonymous
    // visitors must supply account fields and get a new auth user (role "user").
    const session = await getSessionFromRequest(request);
    let userId: string;

    if (session) {
      userId = session.id;
      // Already a partner (client) — nothing to apply for.
      if (session.role === "client") {
        return NextResponse.json(
          { error: "You already have a partner account." },
          { status: 409 },
        );
      }
    } else {
      if (!name || !email || !password) {
        return NextResponse.json(
          {
            error:
              "Account details (name, email, password) are required to apply.",
          },
          { status: 400 },
        );
      }

      const admin = createSupabaseAdminClient();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (error) {
        const isDuplicate =
          error.status === 422 || /already.*registered/i.test(error.message);
        return NextResponse.json(
          {
            error: isDuplicate
              ? "A user with this email already exists. Please sign in and apply again."
              : error.message,
          },
          { status: isDuplicate ? 409 : (error.status ?? 500) },
        );
      }

      if (!data.user) {
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 },
        );
      }
      userId = data.user.id;
    }

    // Guard against duplicate pending applications for the same user.
    const existingPending = await getPendingRequestForUser(userId);
    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending partner request." },
        { status: 409 },
      );
    }

    const partnerRequest = await createPartnerRequest({
      userId,
      companyName,
      rc,
      nif,
      nis,
      contact,
    });

    // Notify all admins in-app (non-blocking).
    const applicantDisplay = session
      ? session.name || session.email
      : (name ?? email ?? "A user");
    prisma.user
      .findMany({ where: { role: "admin" }, select: { id: true } })
      .then((admins) =>
        Promise.all(
          admins.map((a) =>
            createPartnerRequestSubmittedNotification(
              a.id,
              partnerRequest.id,
              companyName,
              applicantDisplay,
            ),
          ),
        ),
      )
      .catch(() => {});

    createAuditLog({
      userId,
      action: "create",
      entityType: "partner",
      entityId: partnerRequest.id,
      details: { companyName },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(
      {
        id: partnerRequest.id,
        status: partnerRequest.status,
        // True when we created a fresh account during this request.
        accountCreated: !session,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error submitting partner request:", error);
    return NextResponse.json(
      { error: "Failed to submit partner request" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/partner-requests
 * Admin-only paginated list with optional ?status= filter.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status =
      statusParam && PARTNER_STATUSES.includes(statusParam as PartnerRequestStatus)
        ? (statusParam as PartnerRequestStatus)
        : undefined;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 50;

    const { requests, pagination } = await getPartnerRequests({
      status,
      page,
      limit,
    });

    // Attach applicant name/email for display.
    const userIds = [...new Set(requests.map((r) => r.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = requests.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? null,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      applicantName: userMap.get(r.userId)?.name ?? null,
      applicantEmail: userMap.get(r.userId)?.email,
    }));

    return NextResponse.json({ requests: data, pagination });
  } catch (error) {
    logger.error("Error fetching partner requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner requests" },
      { status: 500 },
    );
  }
}
