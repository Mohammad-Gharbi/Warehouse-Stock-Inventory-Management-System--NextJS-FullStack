/**
 * Bon de commande Overdue Check API Route
 * POST /api/orders/bon-de-commande/check — flag orders whose 48h Bon de commande
 * deadline has passed with no document uploaded, and notify the product owner/admin.
 *
 * Designed to be called by a scheduled job (cron, QStash, etc.), like
 * /api/invoices/reminders. Can also be triggered manually by an admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { createBonDeCommandeOverdueNotification } from "@/lib/notifications/in-app";

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await withRateLimit(
      request,
      defaultRateLimits.standard,
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Authorize: admin session OR internal cron call
    const session = await getSessionFromRequest(request);
    const authHeader = request.headers.get("authorization");
    const isInternalCall =
      authHeader === `Bearer ${process.env.INTERNAL_API_KEY}`;

    if (!isInternalCall && (!session || session.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Orders past their deadline with no document, not yet flagged, not cancelled
    const orders = await prisma.order.findMany({
      where: {
        bonDeCommandeUploadedAt: null,
        bonDeCommandeFlaggedAt: null,
        bonDeCommandeDeadline: { lt: now },
        cancelledAt: null,
      },
      include: {
        items: { include: { product: { select: { userId: true } } } },
      },
    });

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orders require flagging",
        flagged: 0,
      });
    }

    let flaggedCount = 0;
    const errors: string[] = [];

    for (const order of orders) {
      try {
        // Mark as flagged so we don't re-notify on the next run
        await prisma.order.update({
          where: { id: order.id },
          data: { bonDeCommandeFlaggedAt: now },
        });

        const ownerIds = [
          ...new Set(order.items.map((item) => item.product?.userId)),
        ].filter(
          (ownerId): ownerId is string =>
            !!ownerId && ownerId !== order.userId,
        );

        const buyer = await prisma.user.findUnique({
          where: { id: order.userId },
          select: { name: true, email: true },
        });
        const buyerDisplay = buyer
          ? `${buyer.name ?? "Customer"} (${buyer.email})`
          : "the client";

        await Promise.all(
          ownerIds.map((ownerId) =>
            createBonDeCommandeOverdueNotification(
              ownerId,
              order.id,
              order.orderNumber,
              buyerDisplay,
            ),
          ),
        );

        flaggedCount++;
        logger.info("Order flagged for missing Bon de commande", {
          orderId: order.id,
          orderNumber: order.orderNumber,
          notifiedOwners: ownerIds.length,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Failed for ${order.orderNumber}: ${errorMessage}`);
        logger.error(
          `Failed to flag order ${order.id} for missing Bon de commande:`,
          error,
        );
      }
    }

    if (flaggedCount > 0) {
      const { invalidateOnOrderChange } = await import("@/lib/cache");
      await invalidateOnOrderChange().catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Flagged ${flaggedCount} orders for missing Bon de commande`,
      flagged: flaggedCount,
      total: orders.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error("Error checking Bon de commande deadlines:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check Bon de commande deadlines",
      },
      { status: 500 },
    );
  }
}
