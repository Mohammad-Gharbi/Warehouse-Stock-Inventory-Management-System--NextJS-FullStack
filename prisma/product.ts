/**
 * Product repository: create, get, update products with Prisma.
 * getProductById enforces userId so only the owner can access; used by API and server data.
 */
import { prisma } from "@/prisma/client";
import { Prisma } from "@prisma/client";
import { mergeProductListWhere } from "@/lib/products/product-query";
import type { OrderFormFieldDef } from "@/types/product";

/**
 * Serialize an order-form-fields array to a Prisma JSON value (DbNull when empty).
 */
const toOrderFormFieldsJson = (
  fields?: OrderFormFieldDef[] | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull =>
  fields && fields.length > 0
    ? (JSON.parse(JSON.stringify(fields)) as Prisma.InputJsonValue)
    : Prisma.DbNull;

/**
 * Create a new product with audit fields
 */
export const createProduct = async (data: {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  status: string;
  userId: string;
  categoryId: string;
  createdAt: Date;
  paymentTerms?: string | null;
  orderFormFields?: OrderFormFieldDef[] | null;
  productType?: string;
}) => {
  const { paymentTerms, orderFormFields, productType, ...rest } = data;
  return prisma.product.create({
    data: {
      ...rest,
      createdBy: data.userId, // Set createdBy same as userId
      paymentTerms: paymentTerms || null,
      orderFormFields: toOrderFormFieldsJson(orderFormFields),
      ...(productType && { productType }),
    },
  });
};

export const getProductsByUser = async (userId: string) => {
  return prisma.product.findMany({
    where: mergeProductListWhere({ userId }),
  });
};

/**
 * Get product by ID with all related data
 * Fetches a single product with category, creator user, and order items
 *
 * @param productId - Product ID
 * @param userId - User ID (for authorization check)
 * @returns Promise<Product | null> - Product or null if not found
 */
export const getProductById = async (productId: string, userId: string) => {
  return prisma.product.findFirst({
    where: mergeProductListWhere({
      id: productId,
      userId, // Ensure user can only access their own products
    }),
    include: {
      // Include order items to show which orders contain this product
      orderItems: {
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              subtotal: true,
              total: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
};

/**
 * Update a product with audit fields
 */
export const updateProduct = async (
  id: string,
  data: {
    name?: string;
    sku?: string;
    price?: number;
    quantity?: number;
    status?: string;
    categoryId?: string;
    updatedBy?: string;
    paymentTerms?: string | null;
    orderFormFields?: OrderFormFieldDef[] | null;
    productType?: string;
  }
) => {
  const { paymentTerms, orderFormFields, productType, ...rest } = data;
  return prisma.product.update({
    where: { id },
    data: {
      ...rest,
      ...(data.updatedBy && { updatedBy: data.updatedBy }),
      ...(paymentTerms !== undefined && { paymentTerms: paymentTerms || null }),
      ...(orderFormFields !== undefined && {
        orderFormFields: toOrderFormFieldsJson(orderFormFields),
      }),
      ...(productType && { productType }),
      updatedAt: new Date(), // Always update timestamp
    },
  });
};

export const deleteProduct = async (id: string) => {
  return prisma.product.delete({
    where: { id },
  });
};
