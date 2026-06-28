/**
 * Partner Request Detail API Route Handler
 * GET /api/partner-requests/:id — admin fetch one (with applicant info).
 * PUT /api/partner-requests/:id — admin approve / reject.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import {
  getPartnerRequestById,
  updatePartnerRequest,
} from "@/prisma/partner-request";
import { updatePartnerRequestSchema } from "@/lib/validations";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createAuditLog } from "@/prisma/audit-log";
import { createPartnerRequestDecisionNotification } from "@/lib/notifications/in-app";
import { sendPartnerStatusUpdate } from "@/lib/email";

type PartnerRequestRecord = NonNullable<
  Awaited<ReturnType<typeof getPartnerRequestById>>
>;

function transform(
  r: PartnerRequestRecord,
  applicant?: { name: string | null; email: string } | null,
) {
  return {
    id: r.id,
    userId: r.userId,
    companyName: r.companyName,
    rc: r.rc,
    nif: r.nif,
    nis: r.nis,
    contact: r.contact,
    status: r.status,
    reviewNotes: r.reviewNotes,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt?.toISOString() ?? null,
    applicantName: applicant?.name ?? null,
    applicantEmail: applicant?.email,
  };
}

/**
 * GET /api/partner-requests/:id (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const record = await getPartnerRequestById(id);
    if (!record) {
      return NextResponse.json(
        { error: "Partner request not found" },
        { status: 404 },
      );
    }

    const applicant = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { name: true, email: true },
    });

    return NextResponse.json(transform(record, applicant));
  } catch (error) {
    logger.error("Error fetching partner request:", error);
    return NextResponse.json(
      { error: "Failed to fetch partner request" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/partner-requests/:id (admin only)
 * Approve or reject. On approval the applicant's role is set to "client".
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const existing = await getPartnerRequestById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Partner request not found" },
        { status: 404 },
      );
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been reviewed." },
        { status: 409 },
      );
    }

    const body = await request.json();
    const parsed = updatePartnerRequestSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn("Invalid partner request update data", {
        errors: parsed.error.errors,
      });
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.errors },
        { status: 400 },
      );
    }

    const { status, reviewNotes } = parsed.data;

    const updated = await updatePartnerRequest(id, {
      status,
      reviewNotes: reviewNotes ?? null,
      reviewedBy: session.id,
      reviewedAt: new Date(),
    });

    // On approval, promote the applicant to the "client" role.
    if (status === "approved") {
      const admin = createSupabaseAdminClient();
      const { error: roleError } = await admin
        .from("User")
        .update({ role: "client" })
        .eq("id", existing.userId);
      if (roleError) {
        logger.error("Failed to set approved partner role to client", roleError);
      }
    }

    const applicant = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: { name: true, email: true },
    });

    // Notify applicant in-app + email (non-blocking).
    createPartnerRequestDecisionNotification(
      existing.userId,
      id,
      existing.companyName,
      status,
    ).catch(() => {});

    if (applicant?.email) {
      const origin = new URL(request.url).origin;
      sendPartnerStatusUpdate(
        {
          companyName: existing.companyName,
          contactName: applicant.name || existing.companyName,
          status,
          reviewNotes: reviewNotes ?? null,
          actionUrl: `${origin}/login`,
        },
        applicant.email,
        applicant.name ?? undefined,
      ).catch(() => {});
    }

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "partner",
      entityId: id,
      details: { status, companyName: existing.companyName },
    }).catch(() => {});

    const { invalidateAllServerCaches } = await import("@/lib/cache");
    await invalidateAllServerCaches().catch(() => {});

    return NextResponse.json(transform(updated, applicant));
  } catch (error) {
    logger.error("Error updating partner request:", error);
    return NextResponse.json(
      { error: "Failed to update partner request" },
      { status: 500 },
    );
  }
}
