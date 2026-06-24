"use client";

import React from "react";
import Link from "next/link";

/**
 * Footer Component
 * Displays footer with copyright year and navigation links
 * Responsive design with mobile stacking
 * Matches navbar glassmorphic styling
 */
export default function Footer() {
  // Get current year dynamically
  const currentYear = new Date().getFullYear();

  // Footer navigation links (showcase only, no actual pages)
  const footerLinks = [
    { label: "About", href: "#" },
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ];

  return (
    <footer className="w-full border-t bg-background">
      <div className="mx-auto w-full max-w-9xl px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left Section - Copyright and Brand */}
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground text-center sm:text-left">
              Techmaster Store
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="text-center sm:text-left">© {currentYear}</span>
          </div>

          {/* Right Section - Navigation Links */}
          <nav className="flex items-center gap-4 sm:gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  // Prevent navigation for showcase links
                  e.preventDefault();
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
