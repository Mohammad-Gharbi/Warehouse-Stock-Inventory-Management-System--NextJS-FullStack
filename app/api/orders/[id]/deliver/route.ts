/**
 * Order Delivery API Route Handler
 * POST /api/orders/:id/deliver — admin / product owner validates the order (Bon de commande
 * must be uploaded) and delivers it:
 *   - digital items are fulfilled from the product's license-key pool (keys assigned to the
 *     order item and sent to the client in-app + by email)
 *   - physical items get the package tracking number (shipping notification in-app + email)
 *
 * Digital + physical may be mixed in one order; each item is handled by its product type.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { Prisma } from "@prisma/client";
import {
  getOrderByIdForAdmin,
  getOrderByIdForProductOwner,
} from "@/prisma/order";
import {
  assignKeys,
  InsufficientLicenseKeysError,
} from "@/prisma/product-license-key";
import { deliverOrderSchema } from "@/lib/validations/order";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import {
  createDigitalDeliveryNotification,
  createOrderNotification,
} from "@/lib/notifications/in-app";
import {
  sendDigitalDeliveryEmail,
  sendShippingNotification,
} from "@/lib/email/notifications";
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
    const body = await request.json().catch(() => ({}));

    const validationResult = deliverOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }
    const { trackingNumber, trackingCarrier, trackingUrl } =
      validationResult.data;

    // Authorize: admin can deliver any order; otherwise the caller must own a product in it.
    const isAdmin = session.role === "admin";
    const order = isAdmin
      ? await getOrderByIdForAdmin(id)
      : await getOrderByIdForProductOwner(id, session.id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validation gate: the Bon de commande must be uploaded before delivery.
    if (!order.bonDeCommandeUploadedAt) {
      return NextResponse.json(
        {
          error:
            "The Bon de commande must be uploaded before the order can be delivered.",
        },
        { status: 400 },
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "Cancelled orders cannot be delivered." },
        { status: 400 },
      );
    }
    if (order.status === "delivered") {
      return NextResponse.json(
        { error: "This order has already been delivered." },
        { status: 400 },
      );
    }

    // Split items by product type.
    const digitalItems = order.items.filter(
      (item) => item.product?.productType === "digital",
    );
    const physicalItems = order.items.filter(
      (item) => item.product?.productType !== "digital",
    );

    // Physical items require a tracking number so the client gets a way to track the package.
    if (physicalItems.length > 0 && !trackingNumber) {
      return NextResponse.json(
        {
          error:
            "A tracking number is required to deliver the physical product(s) in this order.",
        },
        { status: 400 },
      );
    }

    // Stock transition mirrors updateOrder(): only deduct when an order that has not yet been
    // confirmed/paid becomes delivered (otherwise stock was already deducted at confirm/pay).
    const wasConfirmedOrPaid =
      order.status === "confirmed" ||
      order.status === "processing" ||
      order.status === "shipped" ||
      order.status === "delivered" ||
      order.paymentStatus === "paid";
    const shouldDeductStock = order.status === "pending" && !wasConfirmedOrPaid;

    const now = new Date();

    // Assign keys + update order atomically so a key shortage rolls everything back.
    const deliveredKeysByItem = new Map<string, string[]>();
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of digitalItems) {
          const keys = await assignKeys(
            tx,
            item.productId,
            item.productName,
            item.quantity,
            order.id,
            item.id,
          );
          deliveredKeysByItem.set(item.id, keys);
          await tx.orderItem.update({
            where: { id: item.id },
            data: { activationKeys: keys as Prisma.InputJsonValue },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "delivered",
            deliveredAt: now,
            ...(physicalItems.length > 0 && {
              ...(trackingNumber && { trackingNumber }),
              ...(trackingCarrier && { trackingCarrier }),
              ...(trackingUrl && trackingUrl !== "" && { trackingUrl }),
              shippedAt: order.shippedAt ?? now,
            }),
            updatedAt: now,
            updatedBy: session.id,
          },
        });

        if (shouldDeductStock) {
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                quantity: { decrement: item.quantity },
                reservedQuantity: { decrement: item.quantity },
              },
            });
          }
        }
      });
    } catch (error) {
      if (error instanceof InsufficientLicenseKeysError) {
        return NextResponse.json(
          {
            error: error.message,
            productId: error.productId,
            productName: error.productName,
            requested: error.requested,
            available: error.available,
          },
          { status: 400 },
        );
      }
      throw error;
    }

    createAuditLog({
      userId: session.id,
      action: "update",
      entityType: "order",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        summary: "Order validated & delivered",
        ...(digitalItems.length > 0 && { digitalItems: digitalItems.length }),
        ...(physicalItems.length > 0 && { trackingNumber }),
      },
    }).catch(() => {});

    const { invalidateOnOrderChange } = await import("@/lib/cache");
    await invalidateOnOrderChange().catch(() => {});
    if (shouldDeductStock) {
      const { invalidateCache, cacheKeys } = await import("@/lib/cache");
      await invalidateCache(cacheKeys.products.pattern).catch(() => {});
    }

    // Resolve the client recipient (clientId is the buyer when set, else the order's user).
    const recipientUserId = order.clientId ?? order.userId;
    const shippingAddr =
      order.shippingAddress && typeof order.shippingAddress === "object"
        ? (order.shippingAddress as {
            name?: string;
            email?: string;
            street?: string;
            city?: string;
            state?: string;
            zipCode?: string;
            country?: string;
          })
        : null;
    const recipientUser = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { name: true, email: true },
    });
    const clientName =
      shippingAddr?.name || recipientUser?.name || "Customer";
    const clientEmail = shippingAddr?.email || recipientUser?.email || null;
    const orderUrl = `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    }/orders/${order.id}`;

    // --- Digital delivery notifications (in-app + email) ---
    if (digitalItems.length > 0) {
      const allKeys = digitalItems.flatMap(
        (item) => deliveredKeysByItem.get(item.id) ?? [],
      );

      createDigitalDeliveryNotification(
        recipientUserId,
        order.id,
        order.orderNumber,
        allKeys,
      ).catch((error) => {
        logger.error(
          "Failed to create digital delivery in-app notification:",
          error,
        );
      });

      if (clientEmail) {
        sendDigitalDeliveryEmail(
          {
            orderNumber: order.orderNumber,
            clientName,
            orderUrl,
            items: digitalItems.map((item) => ({
              productName: item.productName,
              keys: deliveredKeysByItem.get(item.id) ?? [],
            })),
          },
          clientEmail,
          clientName,
        ).catch((error) => {
          logger.error("Failed to send digital delivery email:", error);
        });
      }
    }

    // --- Physical delivery notifications (in-app + shipping email) ---
    if (physicalItems.length > 0 && trackingNumber) {
      createOrderNotification(
        "shipping_notification",
        order.orderNumber,
        `Order ${order.orderNumber} has been delivered. Tracking: ${trackingNumber}`,
        recipientUserId,
        order.id,
      ).catch((error) => {
        logger.error(
          "Failed to create shipping in-app notification on delivery:",
          error,
        );
      });

      if (clientEmail) {
        sendShippingNotification(
          {
            orderNumber: order.orderNumber,
            clientName,
            clientEmail,
            trackingNumber,
            carrier: (trackingCarrier || "—").toUpperCase(),
            shippingDate: now.toLocaleDateString(),
            estimatedDelivery: order.estimatedDelivery
              ? new Date(order.estimatedDelivery).toLocaleDateString()
              : "—",
            shippingAddress: {
              street: shippingAddr?.street || "",
              city: shippingAddr?.city || "",
              state: shippingAddr?.state,
              zipCode: shippingAddr?.zipCode || "",
              country: shippingAddr?.country || "",
            },
            items: physicalItems.map((item) => ({
              productName: item.productName,
              quantity: item.quantity,
            })),
            ...(trackingUrl && trackingUrl !== "" && { trackingUrl }),
          },
          clientEmail,
          clientName,
        ).catch((error) => {
          logger.error(
            "Failed to send shipping notification email on delivery:",
            error,
          );
        });
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: "delivered",
      deliveredAt: now.toISOString(),
      digitalItems: digitalItems.length,
      physicalItems: physicalItems.length,
    });
  } catch (error) {
    logger.error("Error delivering order:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to deliver order",
      },
      { status: 500 },
    );
  }
}
