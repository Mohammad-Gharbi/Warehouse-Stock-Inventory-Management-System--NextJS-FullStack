/**
 * Bon de commande Upload API Route Handler
 * POST /api/orders/:id/bon-de-commande — client uploads the purchase-order document
 * for an order (within the 48h deadline). Replaces any existing document.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import {
  uploadOrderDocumentToImageKit,
  deleteOrderDocumentFromImageKit,
} from "@/lib/imagekit";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createBonDeCommandeUploadedNotification } from "@/lib/notifications/in-app";
import { createAuditLog } from "@/prisma/audit-log";

/** Allowed Bon de commande file types: PDF + images + Office docs */
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/** Max upload size: 10MB */
const MAX_SIZE = 10 * 1024 * 1024;

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

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = session.role === "admin";

    // Fetch the order (with items + product owners for the upload notification)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { userId: true } } } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only the order's client (buyer) or an admin may upload the Bon de commande.
    const isBuyer = order.clientId === session.id || order.userId === session.id;
    if (!isAdmin && !isBuyer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed: PDF, JPEG, PNG, WebP, Word, Excel.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Replace existing document if present (best-effort delete of old file)
    if (order.bonDeCommandeFileId) {
      await deleteOrderDocumentFromImageKit(order.bonDeCommandeFileId).catch(
        (error) => {
          logger.error(
            "Failed to delete previous Bon de commande from ImageKit:",
            error,
          );
        },
      );
    }

    const fileName = `bon-de-commande-${order.orderNumber}-${Date.now()}-${file.name}`;
    const result = await uploadOrderDocumentToImageKit(buffer, fileName);

    // Persist on the order: clear any overdue flag, record upload time
    await prisma.order.update({
      where: { id: order.id },
      data: {
        bonDeCommandeUrl: result.url,
        bonDeCommandeFileId: result.fileId,
        bonDeCommandeFileName: file.name,
        bonDeCommandeUploadedAt: new Date(),
        bonDeCommandeFlaggedAt: null,
        updatedAt: new Date(),
      },
    });

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "order",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        summary: "Bon de commande uploaded",
      },
    }).catch(() => {});

    const { invalidateOnOrderChange } = await import("@/lib/cache");
    await invalidateOnOrderChange();

    // Notify product owners / admin that the document was uploaded (async, non-blocking)
    const ownerIds = [
      ...new Set(order.items.map((item) => item.product?.userId)),
    ].filter((ownerId): ownerId is string => !!ownerId && ownerId !== order.userId);
    if (ownerIds.length > 0) {
      const buyer = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { name: true, email: true },
      });
      const buyerDisplay = buyer
        ? `${buyer.name ?? "Customer"} (${buyer.email})`
        : "The client";
      Promise.all(
        ownerIds.map((ownerId) =>
          createBonDeCommandeUploadedNotification(
            ownerId,
            order.id,
            order.orderNumber,
            buyerDisplay,
          ),
        ),
      ).catch((error) => {
        logger.error(
          "Failed to create Bon de commande uploaded notifications:",
          error,
        );
      });
    }

    logger.info("Bon de commande uploaded successfully", {
      userId: session.id,
      orderId: order.id,
      fileId: result.fileId,
    });

    return NextResponse.json({
      success: true,
      bonDeCommandeUrl: result.url,
      bonDeCommandeFileId: result.fileId,
      bonDeCommandeFileName: file.name,
    });
  } catch (error) {
    logger.error("Error uploading Bon de commande:", error);
    return NextResponse.json(
      {
        error: "Failed to upload Bon de commande",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
