"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  History,
  MessageSquare,
  Star,
  Store,
  Truck,
  Users,
  Handshake,
  Mail,
  LogOut,
  User,
  FileText,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts";
import { Button } from "@/components/ui/button";
import { useAdminCounts } from "@/hooks/queries";

/**
 * Admin sidebar: section headlines + links.
 * Structure per PROJECT_PLAN § 9.16.1: My Store, Product & System Management, Personal Dashboard, System Settings.
 * Dynamic counts beside Client Orders, Client Invoices, Support Tickets, Product Reviews.
 */

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Key in admin counts for badge (optional) */
  countKey?:
    | "clientOrders"
    | "clientInvoices"
    | "supportTickets"
    | "products"
    | "clients"
    | "users";
};

const MY_STORE_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard-overall-insights",
    label: "Store Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingCart,
    countKey: "clientOrders",
  },
  {
    href: "/admin/invoices",
    label: "Invoices",
    icon: FileText,
    countKey: "clientInvoices",
  },
  {
    href: "/admin/support-tickets",
    label: "Support Tickets",
    icon: MessageSquare,
    countKey: "supportTickets",
  },
];

const MANAGEMENT_ITEMS: NavItem[] = [
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
    countKey: "products",
  },
  {
    href: "/admin/client-portal",
    label: "Client Portal",
    icon: Store,
    countKey: "clients",
  },
  {
    href: "/admin/user-management",
    label: "User Management",
    icon: Users,
    countKey: "users",
  },
  {
    href: "/admin/partner-requests",
    label: "Partner Requests",
    icon: Handshake,
  },
  {
    href: "/admin/activity-history",
    label: "Activity History",
    icon: History,
  },
];

const MY_ACTIVITY_ITEMS: NavItem[] = [
  {
    href: "/admin/my-activity",
    label: "My activity",
    icon: UserCircle,
  },
];

export default function AdminSidebar({
  collapsed = false,
}: { collapsed?: boolean } = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: counts } = useAdminCounts();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const linkClass = (href: string, isSub = false) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isSub && !collapsed ? "pl-8" : "",
      collapsed ? "justify-center px-0 w-9 h-9 mx-auto" : "",
      pathname === href || (href !== "/admin" && pathname.startsWith(href))
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  const getCount = (key: NavItem["countKey"]): number | undefined => {
    if (!counts || !key) return undefined;
    return counts[key];
  };

  const renderNavItems = (items: NavItem[], isSub = true) =>
    items.map((item) => {
      const Icon = item.icon;
      const count = getCount(item.countKey);
      const showBadge = count !== undefined && count > 0;
      return (
        <Link
          key={item.href}
          href={item.href}
          className={linkClass(item.href, isSub)}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          )}
          {!collapsed && showBadge && (
            <span
              className={cn(
                "flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium",
                "bg-muted text-muted-foreground",
              )}
              aria-label={`${count} items`}
            >
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
      );
    });

  if (collapsed) {
    return (
      <nav
        className="flex min-h-0 flex-col items-center py-3 gap-1"
        aria-label="Admin navigation"
      >
        {renderNavItems(MY_STORE_ITEMS)}
        <div className="w-6 border-t my-1" />
        {renderNavItems(MANAGEMENT_ITEMS)}
        <div className="w-6 border-t my-1" />
        {renderNavItems(MY_ACTIVITY_ITEMS)}
        <div className="w-6 border-t my-1" />
        <Link
          href="/admin/settings/email-preferences"
          className={linkClass("/admin/settings/email-preferences", true)}
          title="Email Preferences"
        >
          <Mail className="h-4 w-4 flex-shrink-0" />
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex min-h-0 flex-col p-2 gap-1">
      {/* My Store */}
      <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        My Store
      </p>
      {renderNavItems(MY_STORE_ITEMS)}

      {/* Product & System Management */}
      <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Product & System Management
      </p>
      {renderNavItems(MANAGEMENT_ITEMS)}

      {/* My Activity */}
      <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Personal activity
      </p>
      {renderNavItems(MY_ACTIVITY_ITEMS)}

      {/* System Settings */}
      <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        System Settings
      </p>
      <Link
        href="/admin/settings/email-preferences"
        className={linkClass("/admin/settings/email-preferences", true)}
      >
        <Mail className="h-4 w-4 flex-shrink-0" />
        Email Preferences
      </Link>

      {/* Spacer to push user + logout to bottom */}
      {/* <div className="flex-1 min-h-4" /> */}

      {/* User login info */}
      {/* {user && (
        <div className="rounded-lg px-3 py-2 border border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 truncate">
              <p className="font-medium text-foreground truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )} */}

      {/* Logout */}
      {/* <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 flex-shrink-0" />
        Logout
      </Button> */}
    </nav>
  );
}
