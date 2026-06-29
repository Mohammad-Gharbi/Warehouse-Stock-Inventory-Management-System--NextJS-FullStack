/**
 * Order Messages API Route Handler
 * The per-order conversation thread shared between the buyer, the product owner(s)/seller and
 * admins.
 *   GET  /api/orders/:id/messages — list the thread (participants + admins only).
 *   POST /api/orders/:id/messages — post a message (text and/or a single file attachment).
 *     Each other participant is notified in-app AND emailed a copy with a link back to reply.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/prisma/client";
import { uploadOrderDocumentToImageKit } from "@/lib/imagekit";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import {
  createOrderMessage,
  getOrderMessagesByOrder,
  type OrderMessageWithSender,
} from "@/prisma/order-message";
import { createOrderMessageNotification } from "@/lib/notifications/in-app";
import { sendOrderMessageEmail } from "@/lib/email/notifications";
import { createAuditLog } from "@/prisma/audit-log";

/** Allowed attachment types: PDF + images + Office docs (same as order documents). */
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

/** Max attachment size: 10MB */
const MAX_SIZE = 10 * 1024 * 1024;

/** Max message body length */
const MAX_BODY = 5000;

/** Serialize a stored message (sender flattened, dates as ISO strings) for the client. */
function serializeMessage(message: OrderMessageWithSender) {
  return {
    id: message.id,
    orderId: message.orderId,
    senderId: message.senderId,
    senderName: message.sender?.name ?? null,
    senderEmail: message.sender?.email ?? "",
    senderRole: message.sender?.role ?? "user",
    body: message.body,
    attachmentUrl: message.attachmentUrl,
    attachmentFileId: message.attachmentFileId,
    attachmentFileName: message.attachmentFileName,
    createdAt: message.createdAt.toISOString(),
  };
}

/**
 * Load the order with its product owners and resolve the participant sets.
 * Returns null (with a NextResponse) when the request can't proceed.
 */
async function loadOrderForParticipant(orderId: string, sessionId: string, isAdmin: boolean) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { userId: true } } } },
    },
  });

  if (!order) {
    return {
      error: NextResponse.json({ error: "Order not found" }, { status: 404 }),
    } as const;
  }

  // Buyer side = the order placer + the client; sellers = product owners other than the placer.
  const buyerIds = new Set<string>([order.userId]);
  if (order.clientId) buyerIds.add(order.clientId);
  const sellerIds = new Set(
    order.items
      .map((item) => item.product?.userId)
      .filter((uid): uid is string => !!uid && !buyerIds.has(uid)),
  );

  const isParticipant = buyerIds.has(sessionId) || sellerIds.has(sessionId);
  if (!isAdmin && !isParticipant) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { order, buyerIds, sellerIds } as const;
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

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const loaded = await loadOrderForParticipant(
      id,
      session.id,
      session.role === "admin",
    );
    if ("error" in loaded) return loaded.error;

    const messages = await getOrderMessagesByOrder(id);
    return NextResponse.json(messages.map(serializeMessage));
  } catch (error) {
    logger.error("Error fetching order messages:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        message: error instanceof Error ? error.message : "Unknown error",
      },
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

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const isAdmin = session.role === "admin";
    const loaded = await loadOrderForParticipant(id, session.id, isAdmin);
    if ("error" in loaded) return loaded.error;
    const { order, sellerIds } = loaded;

    // Accept either multipart/form-data (text + optional file) or JSON (text only).
    const contentType = request.headers.get("content-type") || "";
    let body = "";
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = ((formData.get("body") as string | null) ?? "").trim();
      file = formData.get("file") as File | null;
    } else {
      const json = (await request.json().catch(() => ({}))) as { body?: string };
      body = (json.body ?? "").trim();
    }

    if (!body && !file) {
      return NextResponse.json(
        { error: "A message body or an attachment is required." },
        { status: 400 },
      );
    }

    if (body.length > MAX_BODY) {
      return NextResponse.json(
        { error: `Message is too long (max ${MAX_BODY} characters).` },
        { status: 400 },
      );
    }

    // Upload the attachment, if any.
    let attachmentUrl: string | null = null;
    let attachmentFileId: string | null = null;
    let attachmentFileName: string | null = null;

    if (file) {
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

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = `order-message-${order.orderNumber}-${Date.now()}-${file.name}`;
      const result = await uploadOrderDocumentToImageKit(
        buffer,
        fileName,
        "/techmaster-store/order-messages/",
      );
      attachmentUrl = result.url;
      attachmentFileId = result.fileId;
      attachmentFileName = file.name;
    }

    const message = await createOrderMessage({
      orderId: order.id,
      senderId: session.id,
      body,
      attachmentUrl,
      attachmentFileId,
      attachmentFileName,
    });

    createAuditLog({
      userId: session.id,
      action: "create",
      entityType: "order",
      entityId: order.id,
      details: {
        orderNumber: order.orderNumber,
        summary: "Posted an order message",
      },
    }).catch(() => {});

    // Notify + email every other participant (async, non-blocking).
    const recipientIds = [...new Set([...loaded.buyerIds, ...sellerIds])].filter(
      (uid) => uid !== session.id,
    );

    if (recipientIds.length > 0) {
      const senderName = message.sender?.name?.trim();
      const senderDisplay = senderName
        ? `${senderName} (${message.sender?.email})`
        : message.sender?.email ?? "Someone";

      const preview = body
        ? body.length > 140
          ? `${body.slice(0, 140)}…`
          : body
        : attachmentFileName
          ? `📎 ${attachmentFileName}`
          : "";

      const shippingAddr =
        order.shippingAddress && typeof order.shippingAddress === "object"
          ? (order.shippingAddress as { name?: string; email?: string })
          : null;
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

      prisma.user
        .findMany({
          where: { id: { in: recipientIds } },
          select: { id: true, name: true, email: true },
        })
        .then((recipients) => {
          for (const recipient of recipients) {
            const isSeller = sellerIds.has(recipient.id);
            const isBuyerClient = recipient.id === order.clientId;
            // Sellers review on the admin order page; the buyer side on the order page.
            const path = isSeller
              ? `/admin/client-orders/${order.id}`
              : `/orders/${order.id}`;

            createOrderMessageNotification(
              recipient.id,
              order.id,
              order.orderNumber,
              senderDisplay,
              preview,
              path,
            ).catch((error) =>
              logger.error("Failed to create order message notification:", error),
            );

            const recipientEmail = isBuyerClient
              ? shippingAddr?.email || recipient.email
              : recipient.email;
            const recipientName = isBuyerClient
              ? shippingAddr?.name || recipient.name || undefined
              : recipient.name || undefined;

            if (recipientEmail) {
              sendOrderMessageEmail(
                {
                  orderNumber: order.orderNumber,
                  recipientName,
                  senderName: senderDisplay,
                  messageBody:
                    body ||
                    (attachmentFileName
                      ? `Sent an attachment: ${attachmentFileName}`
                      : ""),
                  orderUrl: `${baseUrl}${path}`,
                  attachmentName: attachmentFileName ?? undefined,
                },
                recipientEmail,
                recipientName,
              ).catch((error) =>
                logger.error("Failed to send order message email:", error),
              );
            }
          }
        })
        .catch((error) =>
          logger.error("Failed to resolve order message recipients:", error),
        );
    }

    logger.info("Order message posted", {
      userId: session.id,
      orderId: order.id,
      messageId: message.id,
      hasAttachment: !!attachmentUrl,
    });

    return NextResponse.json(serializeMessage(message), { status: 201 });
  } catch (error) {
    logger.error("Error posting order message:", error);
    return NextResponse.json(
      {
        error: "Failed to post message",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
