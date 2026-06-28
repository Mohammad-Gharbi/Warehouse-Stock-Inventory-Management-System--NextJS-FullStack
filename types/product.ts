/**
 * Product-related type definitions
 */

/**
 * Product status types
 */
export type ProductStatus = "Available" | "Stock Low" | "Stock Out";

/**
 * Product fulfillment type
 * - physical: shipped with a tracking number
 * - digital: delivered via a pre-loaded activation/license key
 */
export type ProductType = "physical" | "digital";

/**
 * Summary of a digital product's license-key pool
 */
export interface ProductLicenseKeySummary {
  /** Keys still available for assignment */
  available: number;
  /** Total keys ever added to the pool */
  total: number;
}

/**
 * Field type for a custom per-product order-form field
 */
export type OrderFormFieldType = "text" | "textarea" | "number" | "select";

/**
 * Definition of a single custom field that appears in a product's order form.
 * Stored on Product.orderFormFields (JSON). Buyer answers are keyed by `key`.
 */
export interface OrderFormFieldDef {
  key: string; // stable identifier (generated when the field is added)
  label: string;
  type: OrderFormFieldType;
  required: boolean;
  options?: string[]; // only for type === "select"
}

/**
 * Product interface matching Prisma schema
 */
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  reservedQuantity?: number; // Stock reserved by pending orders (not yet confirmed)
  status?: ProductStatus;
  createdAt: Date;
  updatedAt?: Date | null;
  userId: string;
  createdBy: string; // User ID who created the product
  updatedBy?: string | null; // User ID who last updated the product
  categoryId: string;
  category?: string | { id: string; name: string } | null;
  qrCodeUrl?: string; // ImageKit URL for QR code image
  qrCodeFileId?: string; // ImageKit file ID for cleanup when regenerating
  imageUrl?: string; // ImageKit URL for product image
  imageFileId?: string; // ImageKit file ID for cleanup when updating/deleting
  expirationDate?: Date | null; // Product expiration date (optional, for perishable items)
  /** Free-text "Modalités de paiement" shown to buyers */
  paymentTerms?: string | null;
  /** Custom fields shown in this product's order form */
  orderFormFields?: OrderFormFieldDef[] | null;
  /** Fulfillment type — "physical" (tracking) or "digital" (activation key). Defaults to "physical". */
  productType?: ProductType;
  /** Set when product is archived (soft-deleted) due to order history */
  deletedAt?: Date | null;
  deletedBy?: string | null;
  /** Extended by API for detail page */
  creator?: { name: string; email: string } | null;
  updater?: { name: string; email: string } | null;
  statistics?: {
    totalQuantitySold: number;
    totalRevenue: number;
    uniqueOrders: number;
    totalValue?: number;
  } | null;
  recentOrders?: Array<{
    id: string;
    orderId: string;
    orderNumber: string;
    productName?: string;
    productSku?: string | null;
    quantity: number;
    price: number;
    orderDate: string;
    subtotal: number;
    /** Proportional share of order total (includes tax, shipping, discount) */
    proportionalAmount?: number;
    orderTotal?: number;
    orderStatus: string;
  }> | null;
}

/**
 * Product creation input (without generated fields)
 */
export interface CreateProductInput {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  status: ProductStatus;
  categoryId: string;
  userId: string;
  imageUrl?: string;
  imageFileId?: string;
  expirationDate?: string; // ISO date string
  paymentTerms?: string;
  orderFormFields?: OrderFormFieldDef[];
  productType?: ProductType;
}

/**
 * Product update input (all fields optional except id)
 */
export interface UpdateProductInput {
  id: string;
  name?: string;
  sku?: string;
  price?: number;
  quantity?: number;
  status?: ProductStatus;
  categoryId?: string;
  imageUrl?: string;
  imageFileId?: string;
  expirationDate?: string | null; // ISO date string or null to clear
  paymentTerms?: string | null;
  orderFormFields?: OrderFormFieldDef[] | null;
  productType?: ProductType;
}
