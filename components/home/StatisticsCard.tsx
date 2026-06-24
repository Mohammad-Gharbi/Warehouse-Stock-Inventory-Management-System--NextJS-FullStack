/**
 * Statistics Card Component
 * Glassmorphism card component for displaying warehouse statistics
 * Supports light/dark mode with colored variants (sky, emerald, amber, rose)
 */

import React from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Color variant types for statistics cards
 */
type CardVariant =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "blue"
  | "orange"
  | "teal";

/**
 * Badge data structure
 */
interface BadgeData {
  label: string;
  value: string | number;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Props for StatisticsCard component
 */
interface StatisticsCardProps {
  /**
   * Card title
   */
  title: string;
  /**
   * Main value to display
   */
  value: string | number;
  /**
   * Optional description text
   */
  description?: string;
  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon;
  /**
   * Color variant for the card
   */
  variant?: CardVariant;
  /**
   * Array of badges to display below the value
   */
  badges?: BadgeData[];
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * Color configuration for each variant
 */
const variantConfig: Record<
  CardVariant,
  {
    border: string;
    gradient: string;
    shadow: string;
    hoverBorder: string;
  }
> = {
  sky: {
    border: "border-sky-400/30",
    gradient: "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-sky-300/50",
  },
  emerald: {
    border: "border-emerald-400/30",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-emerald-300/50",
  },
  amber: {
    border: "border-amber-400/30",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-amber-300/60",
  },
  rose: {
    border: "border-rose-400/30",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-rose-300/50",
  },
  violet: {
    border: "border-violet-400/30",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-violet-300/50",
  },
  blue: {
    border: "border-blue-400/30",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-blue-300/50",
  },
  orange: {
    border: "border-orange-400/30",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-orange-300/50",
  },
  teal: {
    border: "border-teal-400/30",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-teal-300/50",
  },
};

/**
 * StatisticsCard component
 * Displays a glassmorphism card with statistics, icon, and badges
 */
export function StatisticsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "sky",
  badges = [],
  className,
}: StatisticsCardProps) {
  const config = variantConfig[variant];

  return (
    <article
      className={cn(
        "group rounded-[28px] border min-h-[210px] h-full flex flex-col p-4 sm:p-6 backdrop-blur-sm transition min-w-0 overflow-visible",
        config.border,
        config.gradient,
        config.shadow,
        config.hoverBorder,
        className,
      )}
    >
      <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full overflow-visible">
        {/* Title and icon inline so badges get full width below */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <p className="text-xs uppercase tracking-[0.45em] text-gray-700 dark:text-white/60 min-w-0">
            {title}
          </p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300/30 bg-gray-100/50 shadow-inner shadow-primary/30 backdrop-blur dark:border-white/15 dark:bg-white/10">
            <Icon className="h-5 w-5 text-gray-900 dark:text-white" />
          </div>
        </div>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
        {description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-white/70">
            {description}
          </p>
        )}
        {badges.length > 0 && (
          <div className="mt-3 flex w-full min-w-0 flex-wrap gap-2 overflow-visible">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || "outline"}
                className="text-xs border-gray-300/50 bg-gray-100/80 text-gray-800 backdrop-blur-sm shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/80"
              >
                <span className="font-medium">{badge.label}:</span>{" "}
                <span className="ml-1">{badge.value}</span>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
