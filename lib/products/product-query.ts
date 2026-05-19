/**
 * Shared Prisma where clauses for Product queries.
 * Catalog/list UIs must exclude soft-deleted products (deletedAt set).
 */

import type { Prisma } from "@prisma/client";

/** Only non-archived products (default for lists, portal, orders). */
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
    ...productNotDeletedWhere,
    ...where,
  };
}
