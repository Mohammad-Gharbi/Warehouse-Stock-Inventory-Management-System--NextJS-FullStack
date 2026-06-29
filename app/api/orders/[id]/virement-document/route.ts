/**
 * Virement Document Upload API Route Handler
 * POST /api/orders/:id/virement-document — the client (buyer) uploads the "ordre de virement"
 * (bank-transfer order) as proof of payment for a virement order. The admin / product owner(s)
 * are notified in-app + by email so they can validate the payment. Replaces any existing document.
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
import { createVirementProofUploadedNotification } from "@/lib/notifications/in-app";
import { sendPaymentProofEmail } from "@/lib/email/notifications";
import { createAuditLog } from "@/prisma/audit-log";

/** Allowed proof file types: PDF + images + Office docs */
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

    // Fetch the order (with items + product owners for the proof notification)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { userId: true } } } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only the order's client (buyer) or an admin may upload the ordre de virement.
    const isBuyer =
      order.clientId === session.id || order.userId === session.id;
    if (!isAdmin && !isBuyer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only applies to virement orders that are not already paid.
    if (order.paymentMethod !== "virement") {
      return NextResponse.json(
        { error: "This order is not paid by bank transfer (virement)." },
        { status: 400 },
      );
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid." },
        { status: 400 },
      );
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
    if (order.virementDocumentFileId) {
      await deleteOrderDocumentFromImageKit(order.virementDocumentFileId).catch(
        (error) => {
          logger.error(
            "Failed to delete previous virement document from ImageKit:",
            error,
          );
        },
      );
    }

    const fileName = `virement-${order.orderNumber}-${Date.now()}-${file.name}`;
    const result = await uploadOrderDocumentToImageKit(
      buffer,
      fileName,
      "/techmaster-store/virement/",
    );

    await prisma.order.update({
      where: { id: order.id },
      data: {
        virementDocumentUrl: result.url,
        virementDocumentFileId: result.fileId,
        virementDocumentFileName: file.name,
        virementDocumentUploadedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: session.id,
      },
    });

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "order",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        summary: "Ordre de virement uploaded",
      },
    }).catch(() => {});

    const { invalidateOnOrderChange } = await import("@/lib/cache");
    await invalidateOnOrderChange();

    // Notify product owners / admin (sellers) that proof of payment was submitted.
    const ownerIds = [
      ...new Set(order.items.map((item) => item.product?.userId)),
    ].filter(
      (ownerId): ownerId is string => !!ownerId && ownerId !== order.userId,
    );
    if (ownerIds.length > 0) {
      const buyer = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { name: true, email: true },
      });
      const buyerDisplay = buyer
        ? `${buyer.name ?? "Customer"} (${buyer.email})`
        : "The client";
      const owners = await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, email: true },
      });
      const orderUrl = `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/admin/client-orders/${order.id}`;
      for (const owner of owners) {
        createVirementProofUploadedNotification(
          owner.id,
          order.id,
          order.orderNumber,
          buyerDisplay,
        ).catch((error) => {
          logger.error(
            "Failed to create virement proof uploaded notification:",
            error,
          );
        });
        if (owner.email) {
          sendPaymentProofEmail(
            {
              orderNumber: order.orderNumber,
              recipientName: owner.name ?? undefined,
              buyerDisplay,
              method: "virement",
              documentFileName: file.name,
              orderUrl,
            },
            owner.email,
            owner.name ?? undefined,
          ).catch((error) => {
            logger.error("Failed to send payment proof email:", error);
          });
        }
      }
    }

    logger.info("Virement document uploaded successfully", {
      userId: session.id,
      orderId: order.id,
      fileId: result.fileId,
    });

    return NextResponse.json({
      success: true,
      virementDocumentUrl: result.url,
      virementDocumentFileId: result.fileId,
      virementDocumentFileName: file.name,
    });
  } catch (error) {
    logger.error("Error uploading virement document:", error);
    return NextResponse.json(
      {
        error: "Failed to upload virement document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
