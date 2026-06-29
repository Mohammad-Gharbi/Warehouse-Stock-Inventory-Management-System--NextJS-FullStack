/**
 * Invoice Document Upload API Route Handler
 * POST /api/orders/:id/invoice-document — the admin / product owner uploads the invoice
 * document for a delivered order. The client is notified in-app + by email and can download it.
 * Replaces any existing document.
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
import { createInvoiceDocumentReadyNotification } from "@/lib/notifications/in-app";
import { sendInvoiceReadyEmail } from "@/lib/email/notifications";
import { createAuditLog } from "@/prisma/audit-log";

/** Allowed invoice file types: PDF + images + Office docs */
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

    // Fetch the order (with items + product owners to authorize the uploader)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { userId: true } } } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only an admin or a product owner on this order (the seller) may upload the invoice.
    const ownerIds = new Set(
      order.items
        .map((item) => item.product?.userId)
        .filter((ownerId): ownerId is string => !!ownerId),
    );
    const isProductOwner = ownerIds.has(session.id) || order.userId === session.id;
    if (!isAdmin && !isProductOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The invoice can only be uploaded once the order is delivered.
    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "The order must be delivered before uploading the invoice." },
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
    if (order.invoiceDocumentFileId) {
      await deleteOrderDocumentFromImageKit(order.invoiceDocumentFileId).catch(
        (error) => {
          logger.error(
            "Failed to delete previous invoice document from ImageKit:",
            error,
          );
        },
      );
    }

    const fileName = `invoice-${order.orderNumber}-${Date.now()}-${file.name}`;
    const result = await uploadOrderDocumentToImageKit(
      buffer,
      fileName,
      "/techmaster-store/invoices/",
    );

    await prisma.order.update({
      where: { id: order.id },
      data: {
        invoiceDocumentUrl: result.url,
        invoiceDocumentFileId: result.fileId,
        invoiceDocumentFileName: file.name,
        invoiceDocumentUploadedAt: new Date(),
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
        summary: "Invoice document uploaded",
      },
    }).catch(() => {});

    const { invalidateOnOrderChange } = await import("@/lib/cache");
    await invalidateOnOrderChange();

    // Notify the client (buyer): in-app + email (async, non-blocking)
    const recipientUserId = order.clientId ?? order.userId;
    createInvoiceDocumentReadyNotification(
      recipientUserId,
      order.id,
      order.orderNumber,
    ).catch((error) => {
      logger.error(
        "Failed to create invoice document ready notification:",
        error,
      );
    });

    const shippingAddr =
      order.shippingAddress && typeof order.shippingAddress === "object"
        ? (order.shippingAddress as { name?: string; email?: string })
        : null;
    const recipientUser = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { name: true, email: true },
    });
    const clientName = shippingAddr?.name || recipientUser?.name || "Customer";
    const clientEmail = shippingAddr?.email || recipientUser?.email || null;
    if (clientEmail) {
      const orderUrl = `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/orders/${order.id}`;
      sendInvoiceReadyEmail(
        {
          orderNumber: order.orderNumber,
          clientName,
          orderUrl,
          invoiceFileName: file.name,
        },
        clientEmail,
        clientName,
      ).catch((error) => {
        logger.error("Failed to send invoice ready email:", error);
      });
    }

    logger.info("Invoice document uploaded successfully", {
      userId: session.id,
      orderId: order.id,
      fileId: result.fileId,
    });

    return NextResponse.json({
      success: true,
      invoiceDocumentUrl: result.url,
      invoiceDocumentFileId: result.fileId,
      invoiceDocumentFileName: file.name,
    });
  } catch (error) {
    logger.error("Error uploading invoice document:", error);
    return NextResponse.json(
      {
        error: "Failed to upload invoice document",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
