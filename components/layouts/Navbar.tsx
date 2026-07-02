"use client";

/**
 * Main app navbar: logo, nav links (role-based: admin vs client), theme toggle, notifications, profile menu.
 * Role is inferred from user.role or pathname so correct links show before auth finishes (e.g. on refresh).
 */
import React, { useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Settings,
  Bell,
  MessageSquare,
  FileCode,
  Activity,
} from "lucide-react";
import { AiFillProduct } from "react-icons/ai";

import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { useTheme } from "next-themes";
import ScrollControl from "../shared/ScrollControl";
import Footer from "./Footer";
import { NotificationBell } from "../shared";
import { cn } from "@/lib/utils";

/**
 * RoboHash fallback avatar URL when user has no custom/Google image.
 * Same user (by name or id) always gets the same robot.
 */
const getRoboHashAvatarUrl = (nameOrId: string): string => {
  return `https://robohash.org/${encodeURIComponent(nameOrId)}.png?size=80x80`;
};

type NavItem = { label: string; path: string };

/** Static role-based nav definitions (module scope so they aren't rebuilt each render). */
const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/" },
  { label: "Products", path: "/products" },
  { label: "Orders", path: "/orders" },
  { label: "Invoices", path: "/invoices" },
  { label: "Categories", path: "/categories" },
  { label: "Admin Panel", path: "/admin" },
];

const CLIENT_NAV_ITEMS: NavItem[] = [
  { label: "Client Portal", path: "/client" },
  { label: "Browse Products", path: "/products" },
  { label: "My Orders", path: "/orders" },
  { label: "My Invoices", path: "/invoices" },
];

/** Whether a nav item is the active route (exact for "/", prefix match otherwise). */
function isActivePath(pathname: string | null, path: string): boolean {
  if (!pathname) return false;
  if (path === "/" || path === "/client") {
    return pathname === path;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Theme toggle component (inline ModeToggle)
 */
function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <Sun className="h-4 w-4 sm:h-[1.2rem] sm:w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 sm:h-[1.2rem] sm:w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="cursor-pointer"
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="cursor-pointer"
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="cursor-pointer"
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Desktop (xl+) horizontal nav. Memoized so it only re-renders on route/role change. */
const DesktopNav = React.memo(function DesktopNav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string | null;
  onNavigate: (path: string) => void;
}) {
  return (
    <nav className="hidden xl:flex items-center gap-1">
      {items.map((item) => {
        const active = isActivePath(pathname, item.path);
        return (
          <Button
            key={item.path}
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(item.path)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
});

interface NavbarProps {
  children?: ReactNode;
}

/**
 * Main Navigation Bar Component with Layout Wrapper
 * Handles navigation, user menu, theme toggle, mobile responsive menu
 * Also provides the layout structure with background and scrolling
 */
export default function Navbar({ children }: NavbarProps) {
  const { user, isCheckingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setIsMobileMenuOpen(false);

    try {
      // Get user name before logout (will be cleared after)
      const userName = user?.name || user?.email?.split("@")[0] || "User";

      // Show success toast immediately so the user sees feedback
      toast({
        title: `Goodbye, ${userName}! 👋`,
        description: "You have been logged out successfully. See you soon!",
      });

      // Clear localStorage keys synchronously (no React re-renders).
      localStorage.removeItem("isAuth");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("token");
      localStorage.removeItem("getSession");
      localStorage.removeItem("prevUserId");
      localStorage.removeItem("techmaster-store-query-cache");

      // Await the server-side logout so the httpOnly session_id cookie is
      // cleared via Set-Cookie BEFORE the browser navigates to /login.
      // (Cookies.remove can't clear httpOnly cookies; only a server
      // response can.)  This is fast — no DB calls, just clears a cookie.
      // We do NOT call logout() from auth context because that would
      // setIsLoggedIn(false) → React re-renders the current page with
      // empty data → "Failed to load" flash.
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      window.location.href = "/login";
      return;
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  }, [user?.name, user?.email, toast]);

  /**
   * Handle navigation to a path
   */
  const handleNavigation = useCallback(
    (path: string) => {
      router.push(path);
      setIsMobileMenuOpen(false);
    },
    [router],
  );

  // Role from auth when available; else infer from pathname so client sees correct nav on refresh (no admin flash).
  const role =
    user?.role ?? (pathname?.startsWith("/client") ? "client" : "user");
  const navItems: NavItem[] =
    role === "client" ? CLIENT_NAV_ITEMS : ADMIN_NAV_ITEMS;

  /** Home link for logo/brand: admin → /, client → /client */
  const homePath = role === "client" ? "/client" : "/";

  // Avatar: use custom/Google image if present, else RoboHash (same user → same robot)
  const preferredImage =
    user?.image && typeof user.image === "string" && user.image.trim() !== ""
      ? user.image
      : null;
  const avatarUrl =
    preferredImage ||
    (user
      ? getRoboHashAvatarUrl(user?.name || String(user?.id ?? "user"))
      : "");

  // If children prop is provided, wrap with full layout, otherwise just return navbar
  const navbarContent = (
    <header className="sticky top-0 z-50 w-full h-[72px] min-h-[72px] border-b bg-background">
      {/* Skip to main content - visible on focus for keyboard/screen reader users (WCAG 2.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to main content
      </a>
      {/* min-w-0 on flex children instead of overflow-x-hidden — hidden overflow-y would clip notification portal ancestors */}
      <div className="mx-auto flex w-full h-full max-w-9xl min-w-0 items-center justify-between gap-2 sm:gap-4 px-2 sm:px-4 lg:px-6">
        {/* Left Section - Logo and Brand */}
        <div className="flex items-center gap-3">
          <div
            role="button"
            tabIndex={0}
            aria-label="Go to home"
            className="group flex aspect-square size-10 items-center justify-center rounded-xl border bg-background shadow-sm cursor-pointer transition-colors hover:border-foreground/20"
            onClick={() => handleNavigation(homePath)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNavigation(homePath);
              }
            }}
          >
            <AiFillProduct className="text-2xl text-primary transition-transform group-hover:scale-110" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground lg:text-xl cursor-pointer">
            Techmaster Store
          </h1>
        </div>

        {/* Desktop Navigation (XL screens) */}
        <DesktopNav
          items={navItems}
          pathname={pathname}
          onNavigate={handleNavigation}
        />

        {/* Right Section - Actions */}
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          {/* Notification Bell - Always render to prevent flickering during auth check */}
          {/* Show skeleton during auth check, then show bell when user is available */}
          {isCheckingAuth ? (
            // Skeleton placeholder during auth check to maintain layout - matches NotificationBell styling
            <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full border bg-background shadow-sm animate-pulse flex items-center justify-center">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
          ) : user ? (
            <NotificationBell />
          ) : null}

          {/* Mode Toggle */}
          <ModeToggle />

          {/* Avatar Dropdown (Desktop - LG and above) */}
          <div className="hidden lg:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Open account menu"
                  className="relative h-10 w-10 min-h-10 min-w-10 rounded-full border bg-background hover:border-foreground/20 transition-colors shadow-sm p-0 overflow-hidden"
                >
                  {isCheckingAuth ? (
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  ) : avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={user?.name || "User"}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      unoptimized
                      priority
                    />
                  ) : (
                    <span className="text-sm font-semibold text-foreground">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal px-3 py-2">
                  <div className="flex flex-col space-y-1">
                    {user?.name && (
                      <p className="text-sm leading-none text-foreground">
                        {user.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    router.push("/support-tickets");
                    setIsMobileMenuOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Support Tickets</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    router.push("/settings/email-preferences");
                    setIsMobileMenuOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Email Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    router.push("/api-docs");
                    setIsMobileMenuOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <FileCode className="mr-2 h-4 w-4" />
                  <span>API Documentation</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    router.push("/api-status");
                    setIsMobileMenuOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  <span>API Status</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? "Logging Out..." : "Logout"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile: Burger Menu Only (LG and below) */}
          <div className="flex items-center lg:hidden">
            {/* Burger Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu-panel"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-8 w-8 sm:h-10 sm:w-10 text-foreground hover:bg-accent transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown (LG and below) */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu-panel"
          role="navigation"
          aria-label="Mobile navigation"
          className="xl:hidden border-t bg-background max-h-[calc(100vh-3.5rem)] overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-9xl px-2 sm:px-4 lg:px-6 sm:py-6 space-y-3">
            {/* User Email with Avatar */}
            <div className="flex items-center gap-3 px-2 py-2">
              {isCheckingAuth ? (
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              ) : (
                avatarUrl && (
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full border bg-background overflow-hidden shadow-sm">
                    <Image
                      src={avatarUrl}
                      alt={user?.name || "User"}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  </div>
                )
              )}
              <div className="flex flex-col">
                {!isCheckingAuth && user?.name && (
                  <p className="text-sm text-foreground">{user.name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {isCheckingAuth ? "Loading..." : user?.email}
                </p>
              </div>
            </div>

            <Separator />

            {/* Navigation Items */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.path);
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "w-full justify-start transition-colors px-3 py-3.5 h-auto min-h-[44px]",
                      active
                        ? "bg-accent text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    onClick={() => handleNavigation(item.path)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <Separator />

            {/* Support Tickets */}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-foreground transition-colors px-3 py-3.5 h-auto min-h-[44px]"
              onClick={() => {
                router.push("/support-tickets");
                setIsMobileMenuOpen(false);
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Support Tickets
            </Button>

            {/* Email Preferences */}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-foreground transition-colors px-3 py-3.5 h-auto min-h-[44px]"
              onClick={() => {
                router.push("/settings/email-preferences");
                setIsMobileMenuOpen(false);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Email Preferences
            </Button>

            {/* API Documentation */}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-foreground transition-colors px-3 py-3.5 h-auto min-h-[44px]"
              onClick={() => {
                router.push("/api-docs");
                setIsMobileMenuOpen(false);
              }}
            >
              <FileCode className="mr-2 h-4 w-4" />
              API Documentation
            </Button>

            {/* API Status */}
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-foreground transition-colors px-3 py-3.5 h-auto min-h-[44px]"
              onClick={() => {
                router.push("/api-status");
                setIsMobileMenuOpen(false);
              }}
            >
              <Activity className="mr-2 h-4 w-4" />
              API Status
            </Button>

            <Separator />

            {/* Logout */}
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-accent hover:text-destructive transition-colors px-3 py-3.5 h-auto min-h-[44px]"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Logging Out..." : "Logout"}
            </Button>
          </div>
        </div>
      )}
    </header>
  );

  // If children provided, wrap with full layout structure
  if (children) {
    return (
      <div className="flex h-screen overflow-hidden relative min-h-screen bg-background">
        <ScrollControl />
        <div className="relative z-10 flex h-screen w-full overflow-hidden flex-col">
          {navbarContent}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
            tabIndex={-1}
          >
            <div className="flex-1 flex flex-col">
              <div
                className={
                  pathname?.startsWith("/admin") ||
                  pathname?.startsWith("/business-insights")
                    ? "mx-auto w-full max-w-9xl flex-1 sm:pr-4"
                    : "mx-auto w-full max-w-9xl p-1 sm:p-0 sm:px-4 lg:px-6 sm:py-6 flex-1"
                }
              >
                {children}
              </div>
            </div>
            {!pathname?.startsWith("/admin") && <Footer />}
          </main>
        </div>
      </div>
    );
  }

  // Otherwise just return the navbar (for backward compatibility)
  return navbarContent;
}
