/**
 * Order Message Prisma Utilities
 * Helper functions for the per-order conversation thread.
 */

import { prisma } from "@/prisma/client";
import { Prisma } from "@prisma/client";

/** Sender fields needed to render a message + notify/email recipients. */
const messageInclude = {
  sender: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.OrderMessageInclude;

export type OrderMessageWithSender = Prisma.OrderMessageGetPayload<{
  include: typeof messageInclude;
}>;

export interface CreateOrderMessageData {
  orderId: string;
  senderId: string;
  body: string;
  attachmentUrl?: string | null;
  attachmentFileId?: string | null;
  attachmentFileName?: string | null;
}

/**
 * Insert one message into an order's thread, returning it with its sender.
 */
export async function createOrderMessage(
  data: CreateOrderMessageData,
): Promise<OrderMessageWithSender> {
  return prisma.orderMessage.create({
    data: {
      orderId: data.orderId,
      senderId: data.senderId,
      body: data.body,
      attachmentUrl: data.attachmentUrl ?? null,
      attachmentFileId: data.attachmentFileId ?? null,
      attachmentFileName: data.attachmentFileName ?? null,
    },
    include: messageInclude,
  });
}

/**
 * List an order's messages oldest-first, each with its sender.
 */
export async function getOrderMessagesByOrder(
  orderId: string,
): Promise<OrderMessageWithSender[]> {
  return prisma.orderMessage.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });
}
