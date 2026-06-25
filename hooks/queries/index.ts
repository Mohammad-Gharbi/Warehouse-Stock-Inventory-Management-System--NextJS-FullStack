/**
 * Query hooks exports
 * Centralized export point for all TanStack Query hooks
 */

// Product hooks
export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "./use-products";

// Category hooks
export {
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "./use-categories";

// Email preferences hooks
export {
  useEmailPreferences,
  useUpdateEmailPreferences,
} from "./use-email-preferences";

// Order hooks
export {
  useOrders,
  useOrder,
  useClientOrders,
  useCreateOrder,
  useUpdateOrder,
  useDeleteOrder,
} from "./use-orders";

// Notification hooks
export {
  useNotifications,
  useUnreadNotificationCount,
  useNotification,
  useUpdateNotification,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from "./use-notifications";

// Invoice hooks
export {
  useInvoices,
  useInvoice,
  useClientInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useSendInvoice,
} from "./use-invoices";

// History (Import History) hooks
export { useHistory, useHistoryItem } from "./use-history";

// Support Tickets hooks
export {
  useSupportTickets,
  type SupportTicketViewFilter,
  useSupportTicket,
  useSupportTicketReplies,
  useCreateSupportTicket,
  useCreateSupportTicketReply,
  useUpdateSupportTicket,
  useDeleteSupportTicket,
} from "./use-support-tickets";

// Product Reviews hooks
export {
  useProductReviews,
  useProductReview,
  useReviewsByProduct,
  useReviewEligibility,
  useCreateProductReview,
  useUpdateProductReview,
  useDeleteProductReview,
} from "./use-product-reviews";

// Dashboard (admin overview) hooks
export { useDashboard } from "./use-dashboard";

// Admin sidebar counts hooks
export { useAdminCounts } from "./use-admin-counts";

// User Management (admin) hooks
export {
  useUsers,
  useUser,
  useUpdateUser,
  useCreateUser,
  useDeleteUser,
} from "./use-user-management";

// Admin Client Portal hooks
export { useClientPortal } from "./use-client-portal";

// System Configuration hooks
export { useSystemConfigs, useUpdateSystemConfigs } from "./use-system-config";

// Audit Logs hooks
export { useAuditLogs } from "./use-audit-logs";

// Forecasting hooks
export { useForecastingSummary } from "./use-forecasting";

// Portal hooks (external client portal)
export {
  useClientPortalDashboard,
  useClientCatalogOverview,
  useClientBrowseMeta,
  useClientBrowseProducts,
} from "./use-portal";

// Auth hooks
export { useSession, useLogin, useRegister, useLogout } from "./use-auth";

// Payment hooks
export { useCreateCheckout } from "./use-payments";

// Shipping hooks
export {
  useGetShippingRates,
  useGenerateShippingLabel,
  useAddTrackingNumber,
} from "./use-shipping";
