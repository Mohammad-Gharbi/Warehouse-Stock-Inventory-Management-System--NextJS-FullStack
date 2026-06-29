/**
 * Cheque Ready Signal API Route Handler
 * POST /api/orders/:id/cheque-ready — the client (buyer) signals that their cheque is ready
 * for a cheque order. Records the timestamp and notifies the admin / product owner(s) in-app +
 * by email so they can validate the payment.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createChequeReadyNotification } from "@/lib/notifications/in-app";
import { sendPaymentProofEmail } from "@/lib/email/notifications";
import { createAuditLog } from "@/prisma/audit-log";

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

    // Only the order's client (buyer) or an admin may signal the cheque.
    const isBuyer =
      order.clientId === session.id || order.userId === session.id;
    if (!isAdmin && !isBuyer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only applies to cheque orders that are not already paid.
    if (order.paymentMethod !== "cheque") {
      return NextResponse.json(
        { error: "This order is not paid by cheque." },
        { status: 400 },
      );
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid." },
        { status: 400 },
      );
    }

    if (order.chequeReadySignalledAt) {
      return NextResponse.json(
        { error: "The cheque has already been signalled as ready." },
        { status: 400 },
      );
    }

    const now = new Date();
    await prisma.order.update({
      where: { id: order.id },
      data: {
        chequeReadySignalledAt: now,
        updatedAt: now,
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
        summary: "Client signalled cheque ready",
      },
    }).catch(() => {});

    const { invalidateOnOrderChange } = await import("@/lib/cache");
    await invalidateOnOrderChange();

    // Notify product owners / admin (sellers) that the cheque is ready.
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
        createChequeReadyNotification(
          owner.id,
          order.id,
          order.orderNumber,
          buyerDisplay,
        ).catch((error) => {
          logger.error("Failed to create cheque ready notification:", error);
        });
        if (owner.email) {
          sendPaymentProofEmail(
            {
              orderNumber: order.orderNumber,
              recipientName: owner.name ?? undefined,
              buyerDisplay,
              method: "cheque",
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

    logger.info("Cheque ready signalled", {
      userId: session.id,
      orderId: order.id,
    });

    return NextResponse.json({
      success: true,
      chequeReadySignalledAt: now.toISOString(),
    });
  } catch (error) {
    logger.error("Error signalling cheque ready:", error);
    return NextResponse.json(
      {
        error: "Failed to signal cheque ready",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
