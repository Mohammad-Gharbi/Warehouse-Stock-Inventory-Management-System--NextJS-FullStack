/**
 * Server-side data fetching for homepage SSR
 * Fetches products and categories using the same logic and cache as API routes.
 * Only import this from server code (e.g. app/page.tsx).
 */

import { getCache, setCache, cacheKeys } from "@/lib/cache";
import { mergeProductListWhere } from "@/lib/products/product-query";
import { prisma } from "@/prisma/client";
import type { OrderFormFieldDef } from "@/types/product";

/** Product shape returned by products API GET (dates as ISO strings) */
export type ProductForHome = {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  status: string;
  categoryId: string;
  category: string;
  userId: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  qrCodeUrl: string | null;
  imageUrl: string | null;
  imageFileId: string | null;
  expirationDate: string | null;
  paymentTerms: string | null;
  orderFormFields: OrderFormFieldDef[] | null;
};

/** Category shape returned by categories API GET (dates as ISO strings) */
export type CategoryForHome = {
  id: string;
  name: string;
  userId: string;
  status: boolean;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string;
  updatedBy?: string | null;
};

/**
 * Fetch products for the given user.
 * Uses the same cache key and transform as GET /api/products so Redis is shared.
 */
export async function getProductsForUser(userId: string): Promise<ProductForHome[]> {
  const cacheKey = cacheKeys.products.list({ userId });
  const cached = await getCache<ProductForHome[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const products = await prisma.product.findMany({
    where: mergeProductListWhere({ userId }),
    orderBy: { createdAt: "desc" },
  });

  const categoryIds = [...new Set(products.map((p) => p.categoryId))];

  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const transformed: ProductForHome[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: Number(product.price),
    quantity: Number(product.quantity),
    status: product.status,
    categoryId: product.categoryId,
    category: categoryMap.get(product.categoryId) || "Unknown",
    userId: product.userId,
    createdBy: product.createdBy,
    updatedBy: product.updatedBy || null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt?.toISOString() ?? null,
    qrCodeUrl: product.qrCodeUrl ?? null,
    imageUrl: product.imageUrl ?? null,
    imageFileId: product.imageFileId ?? null,
    expirationDate: product.expirationDate?.toISOString() ?? null,
    paymentTerms: product.paymentTerms ?? null,
    orderFormFields:
      (product.orderFormFields as OrderFormFieldDef[] | null) ?? null,
  }));

  await setCache(cacheKey, transformed, 300);
  return transformed;
}

/**
 * Fetch categories for the given user.
 * Same query as GET /api/categories; returns serializable objects (dates as ISO strings).
 */
export async function getCategoriesForUser(userId: string): Promise<CategoryForHome[]> {
  const categories = await prisma.category.findMany({
    where: { userId },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    userId: c.userId,
    status: c.status,
    description: c.description ?? null,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() ?? null,
    createdBy: c.createdBy,
    updatedBy: c.updatedBy ?? null,
  }));
}
