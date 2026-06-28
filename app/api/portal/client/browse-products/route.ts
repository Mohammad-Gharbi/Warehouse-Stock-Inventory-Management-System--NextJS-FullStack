/**
 * Client Browse Products API
 * GET /api/portal/client/browse-products — products for selected owner/supplier/category
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/utils/auth";
import { logger } from "@/lib/logger";
import { withRateLimit, defaultRateLimits } from "@/lib/api/rate-limit";
import { prisma } from "@/prisma/client";
import { mergeProductListWhere } from "@/lib/products/product-query";

/**
 * GET /api/portal/client/browse-products
 * Query: ownerId (required), categoryId (optional)
 * Returns products owned by ownerId, optionally filtered by category
 * Also returns categories for that owner (for filter dropdowns)
 */
export async function GET(request: NextRequest) {
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
    if (session.role !== "client") {
      return NextResponse.json(
        { error: "Access denied. Client role required." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get("ownerId");
    const categoryId = searchParams.get("categoryId");

    if (!ownerId) {
      return NextResponse.json(
        { error: "ownerId is required" },
        { status: 400 },
      );
    }

    const productWhere: {
      userId: string;
      categoryId?: string;
    } = { userId: ownerId };
    if (categoryId && categoryId !== "all") productWhere.categoryId = categoryId;

    const [products, allOwnerProducts, ownerUser] = await Promise.all([
      prisma.product.findMany({
        where: mergeProductListWhere(productWhere),
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        where: mergeProductListWhere({ userId: ownerId }),
        select: { categoryId: true },
      }),
      prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const categoryIds = [...new Set(allOwnerProducts.map((p) => p.categoryId))];

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const transformed = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      quantity: Number(p.quantity),
      reservedQuantity: Number(p.reservedQuantity ?? 0),
      status: p.status,
      categoryId: p.categoryId,
      category: categoryMap.get(p.categoryId) || "Unknown",
      userId: p.userId,
      createdBy: p.createdBy,
      updatedBy: p.updatedBy || null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt?.toISOString() || null,
      qrCodeUrl: p.qrCodeUrl || null,
      imageUrl: p.imageUrl || null,
      imageFileId: p.imageFileId || null,
      expirationDate: p.expirationDate?.toISOString() || null,
      paymentTerms: p.paymentTerms || null,
      orderFormFields: p.orderFormFields ?? null,
    }));

    return NextResponse.json({
      products: transformed,
      categories,
      owner: ownerUser
        ? { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email }
        : undefined,
    });
  } catch (error) {
    logger.error("Error fetching client browse products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}
