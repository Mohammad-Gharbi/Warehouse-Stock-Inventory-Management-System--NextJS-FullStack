/**
 * Root layout: fonts, metadata (SEO), and providers (Query, Auth, Theme, Toaster).
 * Wraps all pages; force-dynamic so useSearchParams and server session work correctly.
 */
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyboardShortcutsProvider } from "@/components/providers/KeyboardShortcutsProvider";
import localFont from "next/font/local";
import React from "react";
import { AuthProvider } from "@/contexts";
import { QueryProvider } from "@/lib/react-query";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SuppressApiErrorOverlay } from "@/components/shared/SuppressApiErrorOverlay";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: {
    default: "Techmaster Store — Stock Inventory Management System",
    template: "%s | Techmaster Store",
  },
  description:
    "Techmaster Store is a full-stack stock inventory management system built with Next.js. Manage products, categories, orders, and invoices. Role-based access for admin and client. Analytics dashboard, QR codes, export, and secure JWT authentication.",
  authors: [
    {
      name: "Arnob Mahmud",
      url: "https://www.arnobmahmud.com",
      email: "contact@arnobmahmud.com",
    },
  ],
  creator: "Arnob Mahmud",
  publisher: "Arnob Mahmud",
  applicationName: "Techmaster Store",
  keywords: [
    "stock inventory",
    "inventory management",
    "stock management system",
    "Next.js",
    "React",
    "Prisma",
    "product catalog",
    "orders",
    "invoices",
    "categories",
    "JWT authentication",
    "responsive web app",
    "business dashboard",
    "Arnob Mahmud",
  ],
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
    other: [{ rel: "icon", url: "/favicon.ico" }],
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://techmaster-store.vercel.app",
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Techmaster Store — Stock Inventory Management System",
    description:
      "Efficiently manage products, orders, and invoices with Techmaster Store. Secure, responsive, role-based inventory system.",
    url: "https://techmaster-store.vercel.app",
    siteName: "Techmaster Store",
    images: [
      {
        url: "/favicon.ico",
        width: 32,
        height: 32,
        alt: "Techmaster Store — Stock Inventory Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Techmaster Store — Stock Inventory Management System",
    description:
      "Efficiently manage products, orders, and invoices. Secure, responsive inventory system.",
    images: ["/favicon.ico"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

/** Optional: set NEXT_PUBLIC_DISABLE_BROWSER_TRANSLATE=true on Vercel prod only (blocks Chrome Translate). */
const disableBrowserTranslate =
  process.env.NEXT_PUBLIC_DISABLE_BROWSER_TRANSLATE === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      {...(disableBrowserTranslate ? { translate: "no" as const } : {})}
      suppressHydrationWarning
      style={{ overscrollBehavior: "none" }}
      data-scroll-behavior="smooth"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
        style={{ overscrollBehavior: "none" }}
      >
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <SuppressApiErrorOverlay />
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <TooltipProvider delayDuration={200}>
                  <KeyboardShortcutsProvider>
                    {children}
                  </KeyboardShortcutsProvider>
                </TooltipProvider>
              </ThemeProvider>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
