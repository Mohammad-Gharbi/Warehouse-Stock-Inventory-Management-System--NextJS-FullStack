/**
 * Product validation schemas
 * Zod schemas used by product forms and API; productSchema for form, createProductBodySchema/updateProductBodySchema for API routes.
 * calculateProductStatus() derives "available" | "stock_low" | "stock_out" from quantity and reservedQuantity.
 */

import { z } from "zod";
import type { ProductStatus } from "@/types";

const productSkuSchema = z
  .string()
  .min(1, "SKU is required")
  .regex(/^[a-zA-Z0-9-_]+$/, "SKU must be alphanumeric");

const productApiNameSchema = z
  .string()
  .min(1, "Product name is required")
  .max(100, "Product name must be 100 characters or less");

const productStatusSchema = z.enum(["Available", "Stock Low", "Stock Out"]);

const optionalImageUrlSchema = z
  .string()
  .url("Invalid image URL")
  .optional()
  .or(z.literal(""));

const optionalExpirationDateSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .or(z.null());

const optionalPaymentTermsSchema = z
  .string()
  .max(2000, "Les modalités de paiement doivent faire 2000 caractères ou moins")
  .optional()
  .or(z.literal(""));

/**
 * Definition of a single custom order-form field attached to a product.
 * `options` is required (non-empty) only when type is "select".
 */
export const orderFormFieldSchema = z
  .object({
    key: z.string().min(1, "Field key is required"),
    label: z
      .string()
      .min(1, "Field label is required")
      .max(100, "Label must be 100 characters or less"),
    type: z.enum(["text", "textarea", "number", "select"]),
    required: z.boolean(),
    options: z.array(z.string().min(1)).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === "select") {
      if (!field.options || field.options.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A select field needs at least one option",
          path: ["options"],
        });
      }
    }
  });

export const orderFormFieldsSchema = z.array(orderFormFieldSchema);

/**
 * Lenient field schema used by the RHF form resolver so an in-progress row
 * (empty label, select without options yet) never silently blocks submit.
 * Final shape is enforced by `orderFormFieldsSchema` in the API body schemas
 * and cleaned in the dialog's submit handler.
 */
const orderFormFieldFormSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "textarea", "number", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

/**
 * Product form validation schema
 * Used for creating and updating products
 */
export const productSchema = z.object({
  productName: productApiNameSchema,
  sku: productSkuSchema,
  quantity: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = typeof val === "string" ? Number(val) : val;
      return isNaN(num as number) ? 0 : num;
    },
    z
      .number()
      .int("Quantity must be an integer")
      .nonnegative("Quantity cannot be negative"),
  ),
  price: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = typeof val === "string" ? Number(val) : val;
      return isNaN(num as number) ? 0 : num;
    },
    z.number().nonnegative("Price cannot be negative"),
  ),
  imageUrl: optionalImageUrlSchema,
  imageFileId: z.string().optional(),
  expirationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD format")
    .optional()
    .or(z.literal("")),
  paymentTerms: optionalPaymentTermsSchema,
  orderFormFields: z.array(orderFormFieldFormSchema).optional(),
});

/**
 * Product form data type inferred from schema
 */
export type ProductFormData = z.infer<typeof productSchema>;

/**
 * Form submit schema — RHF fields plus category from separate state
 */
export const productFormSubmitSchema = productSchema.extend({
  categoryId: z.string().min(1, "Category is required"),
});

/**
 * API request body for POST /api/products (userId from session only)
 */
export const createProductBodySchema = z.object({
  name: productApiNameSchema,
  sku: productSkuSchema,
  price: z.number().nonnegative("Price cannot be negative"),
  quantity: z.number().int().nonnegative("Quantity cannot be negative"),
  status: productStatusSchema,
  categoryId: z.string().min(1, "Category is required"),
  imageUrl: optionalImageUrlSchema.optional(),
  imageFileId: z.string().optional(),
  expirationDate: optionalExpirationDateSchema.optional(),
  paymentTerms: optionalPaymentTermsSchema.optional(),
  orderFormFields: orderFormFieldsSchema.optional(),
});

/**
 * Product creation input validation schema (includes userId for import/bulk flows)
 */
export const createProductSchema = createProductBodySchema.extend({
  userId: z.string().min(1),
});

/**
 * API request body for PUT /api/products
 */
export const updateProductBodySchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  name: productApiNameSchema.optional(),
  sku: productSkuSchema.optional(),
  price: z.number().nonnegative("Price cannot be negative").optional(),
  quantity: z.number().int().nonnegative("Quantity cannot be negative").optional(),
  status: productStatusSchema.optional(),
  categoryId: z.string().min(1, "Category is required").optional(),
  imageUrl: optionalImageUrlSchema.optional(),
  imageFileId: z.string().optional(),
  expirationDate: optionalExpirationDateSchema.optional(),
  paymentTerms: optionalPaymentTermsSchema.optional().or(z.null()),
  orderFormFields: orderFormFieldsSchema.optional(),
});

/**
 * Product update input validation schema (alias for API/import compatibility)
 */
export const updateProductSchema = updateProductBodySchema;

/** POST /api/products/qr-code */
export const generateProductQrCodeBodySchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

/**
 * Calculate product status based on quantity
 * @param quantity - Product quantity
 * @returns ProductStatus
 */
export const calculateProductStatus = (quantity: number): ProductStatus => {
  if (quantity > 20) return "Available";
  if (quantity > 0 && quantity <= 20) return "Stock Low";
  return "Stock Out";
};
