"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Package,
  Tag,
  Truck,
  ShoppingCart,
  FileText,
  Warehouse,
} from "lucide-react";
import AddProductDialog from "@/components/products/ProductFormDialog";
import AddCategoryDialog from "@/components/category/CategoryDialog";
import AddSupplierDialog from "@/components/supplier/SupplierDialog";
import OrderDialog from "@/components/orders/OrderDialog";
import InvoiceDialog from "@/components/invoices/InvoiceDialog";
import WarehouseDialog from "@/components/warehouses/WarehouseDialog";
import { Product } from "@/types";

export type FloatingActionButtonsVariant =
  | "home"
  | "orders"
  | "invoices"
  | "suppliers"
  | "warehouses"
  | "categories"
  | "products"
  | "products-client";

interface FloatingActionButtonsProps {
  /** "home" = all FABs (Product, Category, Supplier, Order); "orders" = Create Order only; "products-client" = Create Order only (client, tied to product owner select) */
  variant?: FloatingActionButtonsVariant;
  allProducts?: Product[];
  userId?: string;
  /** For variant "products-client": product owner ID - button disabled when empty */
  selectedOwnerId?: string;
}

export default function FloatingActionButtons({
  variant = "home",
  allProducts = [],
  userId = "",
  selectedOwnerId = "",
}: FloatingActionButtonsProps) {
  const [isAnyHovered, setIsAnyHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsAnyHovered(true);
  };

  const handleMouseLeave = () => {
    setIsAnyHovered(false);
  };

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-3"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Add Product Button - home only */}
      {variant === "home" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <AddProductDialog allProducts={allProducts} userId={userId}>
            <Button
              className={`h-14 rounded-full border border-rose-400/30 dark:border-rose-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-rose-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <Package className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Add Product
              </span>
            </Button>
          </AddProductDialog>
        </div>
      )}

      {/* Add Product Button - products page only */}
      {variant === "products" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <AddProductDialog allProducts={allProducts} userId={userId}>
            <Button
              className={`h-14 rounded-full border border-rose-400/30 dark:border-rose-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-rose-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <Package className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Add Product
              </span>
            </Button>
          </AddProductDialog>
        </div>
      )}

      {/* Add Category Button - home only */}
      {variant === "home" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <AddCategoryDialog>
            <Button
              className={`h-14 rounded-full border border-sky-400/30 dark:border-sky-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-sky-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <Tag className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Add Category
              </span>
            </Button>
          </AddCategoryDialog>
        </div>
      )}

      {/* Add Category Button - categories page only */}
      {variant === "categories" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <AddCategoryDialog>
            <Button
              className={`h-14 rounded-full border border-sky-400/30 dark:border-sky-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-sky-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <Tag className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Add Category
              </span>
            </Button>
          </AddCategoryDialog>
        </div>
      )}

      {/* Add Supplier Button - home only */}
      {variant === "home" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <AddSupplierDialog>
            <Button
              className={`h-14 rounded-full border border-emerald-400/30 dark:border-emerald-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-emerald-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <Truck className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Add Supplier
              </span>
            </Button>
          </AddSupplierDialog>
        </div>
      )}

      {/* Create Order Button - home and orders */}
      {(variant === "home" || variant === "orders") && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <OrderDialog>
            <Button
              className={`h-14 rounded-full border border-violet-400/30 dark:border-violet-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-violet-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <ShoppingCart className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Create Order
              </span>
            </Button>
          </OrderDialog>
        </div>
      )}

      {/* Create Order Button - products page for client (depends on product owner select) */}
      {variant === "products-client" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <OrderDialog defaultOwnerId={selectedOwnerId || undefined}>
            <Button
              disabled={!selectedOwnerId}
              className={`h-14 rounded-full border border-violet-400/30 dark:border-violet-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-violet-300/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <ShoppingCart className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Create Order
              </span>
            </Button>
          </OrderDialog>
        </div>
      )}

      {/* Add Supplier Button - suppliers only */}
      {variant === "suppliers" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <AddSupplierDialog>
            <Button
              className={`h-14 rounded-full border border-emerald-400/30 dark:border-emerald-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-emerald-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <Truck className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Add Supplier
              </span>
            </Button>
          </AddSupplierDialog>
        </div>
      )}

      {/* Add Warehouse Button - warehouses only */}
      {variant === "warehouses" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <WarehouseDialog>
            <Button
              className={`h-14 rounded-full border border-amber-400/30 dark:border-amber-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-amber-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <Warehouse className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Add Warehouse
              </span>
            </Button>
          </WarehouseDialog>
        </div>
      )}

      {/* Generate Invoice Button - invoices only */}
      {variant === "invoices" && (
        <div
          className={`relative flex justify-end transition-all duration-300 ${
            isAnyHovered ? "w-[160px]" : "w-14"
          }`}
        >
          <InvoiceDialog>
            <Button
              className={`h-14 rounded-full border border-indigo-400/30 dark:border-indigo-400/30 bg-card text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-indigo-300/40 flex items-center justify-center gap-2 ${
                isAnyHovered ? "w-auto px-4" : "w-14 px-0"
              }`}
            >
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  isAnyHovered
                    ? "max-w-[120px] opacity-100"
                    : "max-w-0 opacity-0"
                }`}
              >
                Generate Invoice
              </span>
            </Button>
          </InvoiceDialog>
        </div>
      )}
    </div>
  );
}
