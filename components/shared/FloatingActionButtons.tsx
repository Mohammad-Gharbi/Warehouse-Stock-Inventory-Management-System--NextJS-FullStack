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
import { cn } from "@/lib/utils";

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

/** Outer wrapper width (animates as the stack expands on hover). */
const fabWrapClass = (expanded: boolean) =>
  cn(
    "relative flex justify-end transition-all duration-300",
    expanded ? "w-[160px]" : "w-14",
  );

/** Round FAB → expands to a pill on hover. Solid primary, token-driven. */
const fabClass = (expanded: boolean) =>
  cn(
    "h-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
    expanded ? "w-auto px-4" : "w-14 px-0",
  );

/** Reveals the FAB label as the stack expands. */
const fabLabelClass = (expanded: boolean) =>
  cn(
    "overflow-hidden whitespace-nowrap transition-all duration-300",
    expanded ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0",
  );

export default function FloatingActionButtons({
  variant = "home",
  allProducts = [],
  userId = "",
  selectedOwnerId = "",
}: FloatingActionButtonsProps) {
  const [isAnyHovered, setIsAnyHovered] = useState(false);

  const showProduct = variant === "home" || variant === "products";
  const showCategory = variant === "home" || variant === "categories";
  const showSupplier = variant === "home" || variant === "suppliers";
  const showOrder = variant === "home" || variant === "orders";

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-3"
      onMouseEnter={() => setIsAnyHovered(true)}
      onMouseLeave={() => setIsAnyHovered(false)}
    >
      {/* Add Product - home + products */}
      {showProduct && (
        <div className={fabWrapClass(isAnyHovered)}>
          <AddProductDialog allProducts={allProducts} userId={userId}>
            <Button className={fabClass(isAnyHovered)}>
              <Package className="h-5 w-5 flex-shrink-0" />
              <span className={fabLabelClass(isAnyHovered)}>Add Product</span>
            </Button>
          </AddProductDialog>
        </div>
      )}

      {/* Add Category - home + categories */}
      {showCategory && (
        <div className={fabWrapClass(isAnyHovered)}>
          <AddCategoryDialog>
            <Button className={fabClass(isAnyHovered)}>
              <Tag className="h-5 w-5 flex-shrink-0" />
              <span className={fabLabelClass(isAnyHovered)}>Add Category</span>
            </Button>
          </AddCategoryDialog>
        </div>
      )}

      {/* Add Supplier - home + suppliers */}
      {showSupplier && (
        <div className={fabWrapClass(isAnyHovered)}>
          <AddSupplierDialog>
            <Button className={fabClass(isAnyHovered)}>
              <Truck className="h-5 w-5 flex-shrink-0" />
              <span className={fabLabelClass(isAnyHovered)}>Add Supplier</span>
            </Button>
          </AddSupplierDialog>
        </div>
      )}

      {/* Create Order - home + orders */}
      {showOrder && (
        <div className={fabWrapClass(isAnyHovered)}>
          <OrderDialog>
            <Button className={fabClass(isAnyHovered)}>
              <ShoppingCart className="h-5 w-5 flex-shrink-0" />
              <span className={fabLabelClass(isAnyHovered)}>Create Order</span>
            </Button>
          </OrderDialog>
        </div>
      )}

      {/* Create Order - products page for client (depends on product owner select) */}
      {variant === "products-client" && (
        <div className={fabWrapClass(isAnyHovered)}>
          <OrderDialog defaultOwnerId={selectedOwnerId || undefined}>
            <Button disabled={!selectedOwnerId} className={fabClass(isAnyHovered)}>
              <ShoppingCart className="h-5 w-5 flex-shrink-0" />
              <span className={fabLabelClass(isAnyHovered)}>Create Order</span>
            </Button>
          </OrderDialog>
        </div>
      )}

      {/* Add Warehouse - warehouses only */}
      {variant === "warehouses" && (
        <div className={fabWrapClass(isAnyHovered)}>
          <WarehouseDialog>
            <Button className={fabClass(isAnyHovered)}>
              <Warehouse className="h-5 w-5 flex-shrink-0" />
              <span className={fabLabelClass(isAnyHovered)}>Add Warehouse</span>
            </Button>
          </WarehouseDialog>
        </div>
      )}

      {/* Generate Invoice - invoices only */}
      {variant === "invoices" && (
        <div className={fabWrapClass(isAnyHovered)}>
          <InvoiceDialog>
            <Button className={fabClass(isAnyHovered)}>
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className={fabLabelClass(isAnyHovered)}>Generate Invoice</span>
            </Button>
          </InvoiceDialog>
        </div>
      )}
    </div>
  );
}
