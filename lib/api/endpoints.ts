/**
 * API Endpoint definitions
 * Centralized endpoint paths for type safety and consistency
 */

/**
 * API endpoint paths
 * All API routes are defined here for consistency
 */
export const API_ENDPOINTS = {
  // Authentication endpoints
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    register: "/auth/register",
    session: "/auth/session",
  },

  // Product endpoints
  products: {
    base: "/products",
  },

  // Category endpoints
  categories: {
    base: "/categories",
  },

  // User endpoints
  user: {
    emailPreferences: "/user/email-preferences",
  },

  // Users (admin User Management) endpoints
  users: {
    base: "/users",
  },

  // Order endpoints
  orders: {
    base: "/orders",
  },

  // Admin: client orders/invoices and sidebar counts
  admin: {
    clientOrders: "/admin/client-orders",
    clientInvoices: "/admin/client-invoices",
    counts: "/admin/counts",
  },

  // Notification endpoints
  notifications: {
    inApp: "/notifications/in-app",
    unreadCount: "/notifications/in-app/unread-count",
  },

  // Invoice endpoints
  invoices: {
    base: "/invoices",
  },

  // Import History (Admin History) endpoints
  importHistory: {
    base: "/import-history",
  },

  // Support Tickets endpoints
  supportTickets: {
    base: "/support-tickets",
  },

  // Product Reviews endpoints
  productReviews: {
    base: "/product-reviews",
  },

  // Dashboard (admin overview) — safe path; avoid blocked keywords
  dashboard: {
    base: "/dashboard",
  },

  // Admin Client Portal
  clientPortal: {
    base: "/client-portal",
  },

  // Forecasting
  forecasting: {
    base: "/forecasting",
  },

  // External Portals
  portal: {
    client: "/portal/client",
    clientCatalog: "/portal/client/catalog",
    clientBrowseMeta: "/portal/client/browse-meta",
    clientBrowseProducts: "/portal/client/browse-products",
  },

  // Payments
  payments: {
    checkout: "/payments/checkout",
    webhook: "/payments/webhook",
  },

  // Shipping
  shipping: {
    rates: "/shipping/rates",
    labels: "/shipping/labels",
    tracking: "/shipping/tracking",
    webhook: "/shipping/webhook",
  },
  systemConfig: {
    base: "/system-config",
  },
  auditLogs: {
    base: "/audit-logs",
  },
} as const;

/**
 * API endpoint type
 * For type-safe endpoint references
 */
export type ApiEndpoint = typeof API_ENDPOINTS;
