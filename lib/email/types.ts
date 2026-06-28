/**
 * Email Service Types
 * TypeScript type definitions for email functionality
 */

/**
 * Email recipient information
 */
export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Email sender information
 */
export interface EmailSender {
  email: string;
  name: string;
}

/**
 * Email content
 */
export interface EmailContent {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Email request payload
 */
export interface SendEmailRequest {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: EmailSender;
  tags?: string[];
}

/**
 * Brevo API response
 */
export interface BrevoApiResponse {
  messageId: string;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string;
}

/**
 * Email notification types
 */
export type EmailNotificationType =
  | "low_stock_alert"
  | "stock_out_notification"
  | "inventory_report"
  | "product_expiration_warning"
  | "order_confirmation"
  | "invoice_email"
  | "shipping_notification"
  | "digital_delivery"
  | "order_status_update";

/**
 * Low stock alert data
 */
export interface LowStockAlertData {
  productName: string;
  currentQuantity: number;
  threshold: number;
  sku?: string;
  category?: string;
}

/**
 * Stock out notification data
 */
export interface StockOutNotificationData {
  productName: string;
  sku?: string;
  category?: string;
}

/**
 * Inventory report data
 */
export interface InventoryReportData {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  reportDate: string;
  reportType: "daily" | "weekly" | "monthly";
}

/**
 * Order confirmation email data
 */
export interface OrderConfirmationData {
  orderNumber: string;
  orderDate: string;
  clientName: string;
  clientEmail: string;
  items: Array<{
    productName: string;
    sku?: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax?: number;
  shipping?: number;
  total: number;
  shippingAddress?: {
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
  };
  orderStatus: string;
  estimatedDelivery?: string;
}

/**
 * Bon de commande (purchase order) request email data
 * Sent to the client when an order is placed, asking them to upload the document within 48h.
 */
export interface BonDeCommandeRequestData {
  orderNumber: string;
  clientName: string;
  /** Human-readable deadline (createdAt + 48h) */
  deadline: string;
  /** Link to the order detail page where the document is uploaded */
  orderUrl: string;
}

/**
 * Invoice email data
 */
export interface InvoiceEmailData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  orderNumber?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  amountDue: number;
  paymentLink?: string; // Stripe payment link
  invoiceUrl?: string; // Link to view/download invoice PDF
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
}

/**
 * Shipping notification email data
 */
export interface ShippingNotificationData {
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  trackingNumber: string;
  carrier: string; // e.g., "USPS", "FedEx", "UPS"
  shippingDate: string;
  estimatedDelivery: string;
  shippingAddress: {
    street: string;
    city: string;
    state?: string;
    zipCode: string;
    country: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  trackingUrl?: string; // Shippo tracking URL
}

/**
 * Digital delivery email data
 * Sent to the client when an order's digital products are delivered, carrying the
 * activation/license key(s) for each digital item.
 */
export interface DigitalDeliveryData {
  orderNumber: string;
  clientName: string;
  /** Link to the order detail page where keys are also shown in-app */
  orderUrl: string;
  /** One entry per digital order item, each with its assigned activation key(s) */
  items: Array<{
    productName: string;
    keys: string[];
  }>;
}

/**
 * Order status update email data
 */
export interface OrderStatusUpdateData {
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  previousStatus: string;
  newStatus: string;
  statusMessage?: string;
  orderUrl?: string; // Link to view order details
  estimatedDelivery?: string;
}

/**
 * Partner request status update email data
 */
export interface PartnerStatusEmailData {
  companyName: string;
  contactName: string;
  status: "approved" | "rejected";
  reviewNotes?: string | null;
  /** Link the recipient can follow (e.g. login) */
  actionUrl?: string;
}

/**
 * Email notification options
 */
export interface EmailNotificationOptions {
  type: EmailNotificationType;
  recipientEmail: string;
  recipientName?: string;
  data:
    | LowStockAlertData
    | StockOutNotificationData
    | InventoryReportData
    | OrderConfirmationData
    | InvoiceEmailData
    | ShippingNotificationData
    | OrderStatusUpdateData
    | Record<string, unknown>;
  adminEmail?: string;
}
