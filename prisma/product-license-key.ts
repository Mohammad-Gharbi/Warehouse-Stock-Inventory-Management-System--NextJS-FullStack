/**
 * Product License Key repository.
 * Manages the pre-loaded pool of activation/license keys for digital products:
 * adding keys, reading availability, and atomically assigning keys to an order item
 * at delivery time.
 */
import { prisma } from "@/prisma/client";
import { Prisma } from "@prisma/client";
import type { ProductLicenseKeySummary } from "@/types/product";

/**
 * Error thrown when a digital product does not have enough available keys to fulfil
 * the requested quantity at delivery time. Carries context for a helpful API response.
 */
export class InsufficientLicenseKeysError extends Error {
  readonly productId: string;
  readonly productName: string;
  readonly requested: number;
  readonly available: number;

  constructor(
    productId: string,
    productName: string,
    requested: number,
    available: number,
  ) {
    super(
      `Insufficient license keys for "${productName}". Requested ${requested}, available ${available}.`,
    );
    this.name = "InsufficientLicenseKeysError";
    this.productId = productId;
    this.productName = productName;
    this.requested = requested;
    this.available = available;
  }
}

/**
 * Add license keys to a product's pool.
 * Dedupes within the request and skips keys that already exist for the product
 * (enforced by the @@unique([productId, key]) constraint via skipDuplicates).
 *
 * @returns the number of keys actually inserted
 */
export async function addLicenseKeys(
  productId: string,
  keys: string[],
  createdBy: string,
): Promise<number> {
  const cleaned = [
    ...new Set(keys.map((k) => k.trim()).filter((k) => k.length > 0)),
  ];
  if (cleaned.length === 0) return 0;

  const result = await prisma.productLicenseKey.createMany({
    data: cleaned.map((key) => ({ productId, key, createdBy })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * Get the available/total key counts for a product.
 */
export async function getKeySummary(
  productId: string,
): Promise<ProductLicenseKeySummary> {
  const [available, total] = await Promise.all([
    prisma.productLicenseKey.count({
      where: { productId, status: "available" },
    }),
    prisma.productLicenseKey.count({ where: { productId } }),
  ]);
  return { available, total };
}

/**
 * Count available keys for a product.
 */
export async function countAvailableKeys(productId: string): Promise<number> {
  return prisma.productLicenseKey.count({
    where: { productId, status: "available" },
  });
}

/**
 * Atomically assign `count` available keys of a product to an order item.
 * MUST be called inside a transaction (`tx`) so assignment + order update commit together.
 * Throws InsufficientLicenseKeysError (rolling back the transaction) if the pool is short.
 *
 * @returns the assigned key strings
 */
export async function assignKeys(
  tx: Prisma.TransactionClient,
  productId: string,
  productName: string,
  count: number,
  orderId: string,
  orderItemId: string,
): Promise<string[]> {
  // Take the oldest available keys first (FIFO).
  const candidates = await tx.productLicenseKey.findMany({
    where: { productId, status: "available" },
    orderBy: { createdAt: "asc" },
    take: count,
    select: { id: true, key: true },
  });

  if (candidates.length < count) {
    throw new InsufficientLicenseKeysError(
      productId,
      productName,
      count,
      candidates.length,
    );
  }

  const ids = candidates.map((c) => c.id);
  // Guard against a concurrent delivery grabbing the same rows: only flip rows
  // that are still "available"; require the full count to have been updated.
  const updated = await tx.productLicenseKey.updateMany({
    where: { id: { in: ids }, status: "available" },
    data: {
      status: "assigned",
      orderId,
      orderItemId,
      assignedAt: new Date(),
    },
  });

  if (updated.count < count) {
    // Lost a race for some keys — abort so the transaction rolls back.
    throw new InsufficientLicenseKeysError(
      productId,
      productName,
      count,
      updated.count,
    );
  }

  return candidates.map((c) => c.key);
}
