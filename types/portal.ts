/**
 * Portal Types for the Client portal
 */

/**
 * Order status counts for portal dashboards
 */
export interface PortalOrderStatusCounts {
  /** Order status = pending (unpaid, awaiting) */
  pending: number;
  /** Order status = confirmed or processing (paid, not yet shipped) */
  inProgress: number;
  shipped: number;
  delivered: number;
  /** Paid/partial orders (not cancelled) */
  completed: number;
  cancelled: number;
  /** Orders with paymentStatus === 'refunded' */
  refunded?: number;
}

/**
 * Payment breakdown for client Total Spent card (order amounts by payment status)
 */
export interface ClientPaymentBreakdown {
  paid: number;
  due: number;
  refund: number;
  pending: number;
  cancelled: number;
}

/**
 * Invoice counts for client Outstanding / Invoices card
 */
export interface ClientInvoiceBreakdown {
  paid: number;
  pending: number;
  overdue: number;
  cancelled: number;
  /** Count of orders with paymentStatus === 'refunded' (for Refunded badge) */
  refunded?: number;
  total: number;
}

/**
 * Client Portal Dashboard Stats
 */
export interface ClientPortalDashboard {
  clientId: string;
  clientName: string;
  totalOrders: number;
  /** Orders by fulfillment (pending, shipped, delivered) */
  orderStatusCounts: PortalOrderStatusCounts;
  /** Count of orders with paymentStatus === 'refunded' */
  refundedOrdersCount: number;
  /** Orders awaiting payment (unpaid, not cancelled) */
  ordersAwaitingPayment: number;
  /** Orders paid and not cancelled */
  ordersCompleted: number;
  /** @deprecated use ordersAwaitingPayment + orderStatusCounts for clarity */
  pendingOrders?: number;
  totalSpent: number;
  outstandingAmount: number;
  /** Sum of all invoice totals for this client (for cards) */
  totalInvoiceAmount: number;
  /** Order amounts by payment status for Total Spent card badges */
  paymentBreakdown: ClientPaymentBreakdown;
  /** Invoice counts by status for Outstanding card badges */
  invoiceBreakdown: ClientInvoiceBreakdown;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    itemCount: number;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    amountDue: number;
    dueDate: string | null;
  }>;
  monthlySpending: Array<{
    month: string;
    spent: number;
    orders: number;
  }>;
}

/**
 * Client catalog overview (read-only: categories, products)
 */
export interface ClientCatalogOverview {
  categories: Array<{
    id: string;
    name: string;
    status: string;
    productCount: number;
    categoryCreatorId: string;
    categoryCreatorName: string | null;
  }>;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    categoryId: string;
    categoryName: string;
    price: number;
    status: string;
    productOwnerId: string;
    productOwnerName: string | null;
  }>;
}

/**
 * Client browse meta (product owners + global stats for client browse page)
 */
export interface ClientBrowseMeta {
  admins: Array<{ id: string; name: string; email: string }>;
  stats: {
    admins: number;
    clients: number;
    categories: { total: number; active: number; inactive: number };
  };
}

/**
 * Client browse products response
 */
export interface ClientBrowseProductsResponse {
  products: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    reservedQuantity: number;
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
    orderFormFields: import("./product").OrderFormFieldDef[] | null;
  }>;
  categories: Array<{ id: string; name: string }>;
  /** Product owner info (when client browses by ownerId); used for empty-state messaging */
  owner?: { id: string; name: string; email: string };
}

/**
 * Portal User Info
 */
export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: "client";
  linkedEntityId?: string; // Client (User) ID
}
