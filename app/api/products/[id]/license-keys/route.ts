/**
 * Product License Keys API Route Handler
 * GET  /api/products/:id/license-keys  — summary (available/total) of the key pool
 * POST /api/products/:id/license-keys  — add keys to the pool (one per line in the UI)
 *
 * Access: admin or the product owner. Intended for digital products.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { addLicenseKeysSchema } from "@/lib/validations/product";
import { addLicenseKeys, getKeySummary } from "@/prisma/product-license-key";
import { createAuditLog } from "@/prisma/audit-log";

/**
 * Resolve the product and verify the caller (admin or owner) may manage its keys.
 * Returns the product or a NextResponse error to return early.
 */
async function authorizeProduct(request: NextRequest, productId: string) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, userId: true, productType: true },
  });
  if (!product) {
    return { error: NextResponse.json({ error: "Product not found" }, { status: 404 }) };
  }

  const isAdmin = session.role === "admin";
  const isOwner = product.userId === session.id;
  if (!isAdmin && !isOwner) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, product };
}

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

    const { id } = await params;
    const auth = await authorizeProduct(request, id);
    if ("error" in auth) return auth.error;

    const summary = await getKeySummary(id);
    return NextResponse.json(summary);
  } catch (error) {
    logger.error("Error fetching license key summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch license keys" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;
    const auth = await authorizeProduct(request, id);
    if ("error" in auth) return auth.error;
    const { session, product } = auth;

    const body = await request.json();
    const validationResult = addLicenseKeysSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const added = await addLicenseKeys(
      id,
      validationResult.data.keys,
      session.id,
    );

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "product",
      entityId: id,
      details: {
        productName: product.name,
        summary: `Added ${added} license key(s)`,
      },
    }).catch(() => {});

    const summary = await getKeySummary(id);
    return NextResponse.json({ added, ...summary });
  } catch (error) {
    logger.error("Error adding license keys:", error);
    return NextResponse.json(
      { error: "Failed to add license keys" },
      { status: 500 },
    );
  }
}
