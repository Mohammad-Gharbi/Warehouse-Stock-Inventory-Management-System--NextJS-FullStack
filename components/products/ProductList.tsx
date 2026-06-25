"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { PaginationType } from "@/components/shared/PaginationSelector";
import { createProductColumns } from "./ProductTableColumns";
import { useAuth } from "@/contexts";
import {
  useProducts,
  useCategories,
  useOrders,
  useDashboard,
} from "@/hooks/queries";
import ProductFilters from "./ProductFilters";
import { StatisticsCard } from "@/components/home/StatisticsCard";
import { StatisticsCardSkeleton } from "@/components/home/StatisticsCardSkeleton";
import { AnalyticsCard } from "@/components/ui/analytics-card";
import { AnalyticsCardSkeleton } from "@/components/ui/analytics-card-skeleton";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";

const ProductTable = dynamic(
  () =>
    import("./ProductTable").then((mod) => ({
      default: mod.ProductTable,
    })),
  {
    ssr: true,
  },
);
//import { ColumnFiltersState } from "@tanstack/react-table";

const ProductList = React.memo(() => {
  // Track if component has mounted on client to prevent hydration mismatch
  const isMountedRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  const pathname = usePathname();
  const { user, isCheckingAuth } = useAuth();
  const isAdminProducts = pathname?.startsWith("/admin") ?? false;
  /** Show store-wide state cards only for admin/user on /products (not for client) */
  const isUserProductsPage =
    pathname === "/products" && user?.role !== "client";
  /** Show state cards on admin products page (/admin/products), same style as admin/orders */
  const isAdminProductsPage = pathname === "/admin/products";

  // Use TanStack Query for data fetching
  const productsQuery = useProducts();
  const categoriesQuery = useCategories();
  const ordersQuery = useOrders();
  const dashboardQuery = useDashboard();

  const allProducts = productsQuery.data ?? [];
  const allCategories = categoriesQuery.data ?? [];
  const allOrders = ordersQuery.data ?? [];
  const dashboard = isAdminProducts ? (dashboardQuery.data ?? null) : null;
  /** Dashboard stats for products-page cards (only when on /products) */
  const productsPageStats = isUserProductsPage
    ? (dashboardQuery.data ?? null)
    : null;

  const detailBase = isAdminProducts ? "/admin" : "";
  const columns = useMemo(
    () => createProductColumns(detailBase),
    [detailBase],
  );

  // Mark component as mounted after client-side hydration
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      queueMicrotask(() => setIsMounted(true));
    }
  }, []);

  // State for column filters, search term, and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState<PaginationType>({
    pageIndex: 0,
    pageSize: 8,
  });

  // State for selected filters
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Removed debug log - use React DevTools for debugging

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Determine loading state - FIXES HYDRATION & FLICKER
  const productsQueryPending = productsQuery.isPending;
  const ordersQueryPending = ordersQuery.isPending;
  const dashboardQueryPending = isAdminProducts && dashboardQuery.isPending;
  const showSkeleton = !isMounted || isCheckingAuth || productsQueryPending;
  const showCardsSkeleton =
    showSkeleton ||
    (isAdminProducts
      ? dashboardQueryPending || ordersQueryPending
      : ordersQueryPending);
  /** For /products page cards: show skeleton until mounted and dashboard loaded */
  const productsPageCardsLoading =
    isUserProductsPage && (!isMounted || dashboardQuery.isPending);
  /** For /admin/products page cards: show skeleton until mounted and dashboard loaded */
  const adminProductsCardsLoading =
    isAdminProductsPage && (!isMounted || dashboardQuery.isPending);

  // Summary stats from products and orders (updates on CRUD via query invalidation)
  const productStats = useMemo(() => {
    const total = allProducts.length;
    const available = allProducts.filter(
      (p) =>
        (p.status || "").toLowerCase().replace(/\s+/g, "_") === "available",
    ).length;
    const stockLow = allProducts.filter(
      (p) =>
        (p.status || "").toLowerCase().replace(/\s+/g, "_") === "stock_low",
    ).length;
    const stockOut = allProducts.filter(
      (p) =>
        (p.status || "").toLowerCase().replace(/\s+/g, "_") === "stock_out",
    ).length;
    const totalValue = allProducts.reduce(
      (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
      0,
    );
    return { total, available, stockLow, stockOut, totalValue };
  }, [allProducts]);

  const orderStats = useMemo(() => {
    const total = allOrders.length;
    const paidOrders = allOrders.filter(
      (o) => (o.paymentStatus || "").toLowerCase() === "paid",
    );
    const paid = paidOrders.length;
    const unpaid = allOrders.filter(
      (o) =>
        (o.paymentStatus || "").toLowerCase() === "unpaid" ||
        (o.paymentStatus || "").toLowerCase() === "partial",
    ).length;
    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + (Number(o.total) || 0),
      0,
    );
    const pending = allOrders.filter(
      (o) => (o.status || "").toLowerCase() === "pending",
    ).length;
    const confirmed = allOrders.filter(
      (o) => (o.status || "").toLowerCase() === "confirmed",
    ).length;
    const shipping = allOrders.filter(
      (o) =>
        (o.status || "").toLowerCase() === "shipped" ||
        (o.status || "").toLowerCase() === "processing",
    ).length;
    const refunded = allOrders.filter(
      (o) => (o.paymentStatus || "").toLowerCase() === "refunded",
    ).length;
    const cancelled = allOrders.filter(
      (o) => (o.status || "").toLowerCase() === "cancelled",
    ).length;
    return {
      total,
      paid,
      unpaid,
      totalRevenue,
      pending,
      confirmed,
      shipping,
      refunded,
      cancelled,
    };
  }, [allOrders]);

  const cardVariantClasses = {
    violet: "border-violet-400/30 bg-card shadow-sm ",
    emerald: "border-emerald-400/30 bg-card shadow-sm ",
    amber: "border-amber-400/30 bg-card shadow-sm ",
    blue: "border-blue-400/30 bg-card shadow-sm ",
  };

  return (
    <div className="flex flex-col poppins">
      {/* Product Inventory Section Header */}
      <div className="pb-6 flex flex-col items-start text-left">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white pb-2">
          Product Inventory Management
        </h2>
      </div>

      {/* Admin products page state cards — same layout as admin/orders (2x2) */}
      {isAdminProductsPage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 pb-6 items-stretch">
          {adminProductsCardsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StatisticsCardSkeleton key={i} />
              ))}
            </>
          ) : dashboard ? (
            <>
              <StatisticsCard
                title="Total Products"
                value={dashboard.counts.products}
                description="Products availability"
                icon={Package}
                variant="rose"
                badges={[
                  {
                    label: "Available",
                    value: dashboard.productStatusBreakdown?.available ?? 0,
                  },
                  {
                    label: "Stock low",
                    value: dashboard.productStatusBreakdown?.stockLow ?? 0,
                  },
                  {
                    label: "Stock out",
                    value: dashboard.productStatusBreakdown?.stockOut ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title="Total Value"
                value={formatCurrency(dashboard.totalInventoryValue ?? 0)}
                description="Total inventory value"
                icon={DollarSign}
                variant="violet"
                badges={[
                  {
                    label: "Orders",
                    value: formatCurrency(
                      dashboard.orderAnalytics
                        ?.totalRevenueExcludingCancelled ??
                        dashboard.revenue?.fromOrders ??
                        0,
                    ),
                  },
                  {
                    label: "Invoices",
                    value: formatCurrency(dashboard.revenue?.fromInvoices ?? 0),
                  },
                  {
                    label: "Due",
                    value: formatCurrency(
                      dashboard.invoiceAnalytics?.outstandingAmount ?? 0,
                    ),
                  },
                  {
                    label: "Cancelled",
                    value: formatCurrency(
                      dashboard.orderAnalytics?.cancelledOrderAmount ?? 0,
                    ),
                  },
                ]}
              />
              <StatisticsCard
                title="Categories"
                value={dashboard.counts.categories}
                description="Product categories"
                icon={FolderTree}
                variant="amber"
                badges={[
                  {
                    label: "Active",
                    value: dashboard.categoryStatusBreakdown?.active ?? 0,
                  },
                  {
                    label: "Inactive",
                    value: dashboard.categoryStatusBreakdown?.inactive ?? 0,
                  },
                ]}
              />
            </>
          ) : null}
        </div>
      )}

      {/* Store-wide state cards — only on /products page, same as homepage cards */}
      {isUserProductsPage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch pb-6">
          {productsPageCardsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StatisticsCardSkeleton key={i} />
              ))}
            </>
          ) : productsPageStats ? (
            <>
              <StatisticsCard
                title="Total Products"
                value={productsPageStats.counts.products}
                description="Products availability"
                icon={Package}
                variant="rose"
                badges={[
                  {
                    label: "Available",
                    value:
                      productsPageStats.productStatusBreakdown?.available ?? 0,
                  },
                  {
                    label: "Stock low",
                    value:
                      productsPageStats.productStatusBreakdown?.stockLow ?? 0,
                  },
                  {
                    label: "Stock out",
                    value:
                      productsPageStats.productStatusBreakdown?.stockOut ?? 0,
                  },
                ]}
              />
              <StatisticsCard
                title="Total Value"
                value={formatCurrency(
                  productsPageStats.totalInventoryValue ?? 0,
                )}
                description="Total inventory value"
                icon={DollarSign}
                variant="violet"
                badges={[
                  {
                    label: "Orders",
                    value: formatCurrency(
                      productsPageStats.orderAnalytics
                        ?.totalRevenueExcludingCancelled ??
                        productsPageStats.revenue?.fromOrders ??
                        0,
                    ),
                  },
                  {
                    label: "Invoices",
                    value: formatCurrency(
                      productsPageStats.revenue?.fromInvoices ?? 0,
                    ),
                  },
                  {
                    label: "Due",
                    value: formatCurrency(
                      productsPageStats.invoiceAnalytics?.outstandingAmount ??
                        0,
                    ),
                  },
                  {
                    label: "Cancelled",
                    value: formatCurrency(
                      productsPageStats.orderAnalytics?.cancelledOrderAmount ??
                        0,
                    ),
                  },
                ]}
              />
              <StatisticsCard
                title="Categories"
                value={productsPageStats.counts.categories}
                description="Product categories"
                icon={FolderTree}
                variant="amber"
                badges={[
                  {
                    label: "Active",
                    value:
                      productsPageStats.categoryStatusBreakdown?.active ?? 0,
                  },
                  {
                    label: "Inactive",
                    value:
                      productsPageStats.categoryStatusBreakdown?.inactive ?? 0,
                  },
                ]}
              />
            </>
          ) : null}
        </div>
      )}

      {/* Filters and Actions - Always visible, only disabled during auth check */}
      <div className="pb-6 flex justify-center">
        <div className="w-full max-w-9xl">
          <ProductFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pagination={pagination}
            setPagination={setPagination}
            allProducts={allProducts}
            allCategories={allCategories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
            userId={user?.id || ""}
          />
        </div>
      </div>
      {/* Product Table - Shows skeleton during auth check or data loading */}
      <ProductTable
        data={allProducts || []}
        columns={columns}
        userId={user?.id || ""}
        isLoading={showSkeleton}
        searchTerm={searchTerm}
        pagination={pagination}
        setPagination={setPagination}
        selectedCategory={selectedCategory}
        selectedStatuses={selectedStatuses}
      />
    </div>
  );
});

ProductList.displayName = "ProductList";

export default ProductList;
