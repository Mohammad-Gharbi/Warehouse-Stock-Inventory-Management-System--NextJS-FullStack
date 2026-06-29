/**
 * Order Reception Confirmation API Route Handler
 * POST /api/orders/:id/confirm-reception — the client (buyer) confirms they received the
 * delivered order. Records the timestamp and notifies the product owner(s)/admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createOrderReceptionConfirmedNotification } from "@/lib/notifications/in-app";
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

    // Fetch the order (with items + product owners for the confirmation notification)
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { userId: true } } } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only the order's client (buyer) or an admin may confirm reception.
    const isBuyer = order.clientId === session.id || order.userId === session.id;
    if (!isAdmin && !isBuyer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The order must be delivered before reception can be confirmed.
    if (order.status !== "delivered") {
      return NextResponse.json(
        { error: "Only delivered orders can have their reception confirmed." },
        { status: 400 },
      );
    }

    if (order.receptionConfirmedAt) {
      return NextResponse.json(
        { error: "Reception has already been confirmed for this order." },
        { status: 400 },
      );
    }

    const now = new Date();
    await prisma.order.update({
      where: { id: order.id },
      data: {
        receptionConfirmedAt: now,
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
        summary: "Client confirmed reception",
      },
    }).catch(() => {});

    const { invalidateOnOrderChange } = await import("@/lib/cache");
    await invalidateOnOrderChange();

    // Notify product owners / admin that the client confirmed reception (async, non-blocking)
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
      Promise.all(
        ownerIds.map((ownerId) =>
          createOrderReceptionConfirmedNotification(
            ownerId,
            order.id,
            order.orderNumber,
            buyerDisplay,
          ),
        ),
      ).catch((error) => {
        logger.error(
          "Failed to create reception confirmed notifications:",
          error,
        );
      });
    }

    logger.info("Order reception confirmed", {
      userId: session.id,
      orderId: order.id,
    });

    return NextResponse.json({
      success: true,
      receptionConfirmedAt: now.toISOString(),
    });
  } catch (error) {
    logger.error("Error confirming order reception:", error);
    return NextResponse.json(
      {
        error: "Failed to confirm reception",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
