/**
 * Shared Prisma where clauses for Product queries.
 * Catalog/list UIs must exclude soft-deleted products (deletedAt set).
 *
 * Postgres: a missing value is simply NULL, so `deletedAt: null` matches every
 * active product (the Mongo-only `isSet` filter is no longer needed).
 */

import type { Prisma } from "@prisma/client";

/** Active catalog products: not archived (deletedAt is null). */
export const productNotDeletedWhere = {
  deletedAt: null,
} satisfies Prisma.ProductWhereInput;

/**
 * Merge catalog filter with additional where fields (userId, supplierId, id, etc.).
 */
export function mergeProductListWhere(
  where: Prisma.ProductWhereInput,
): Prisma.ProductWhereInput {
  return {
    AND: [productNotDeletedWhere, where],
  };
}

/** True when product row is archived (soft-deleted). */
export function isProductArchived(
  product: { deletedAt?: Date | null },
): boolean {
  return product.deletedAt != null;
}
