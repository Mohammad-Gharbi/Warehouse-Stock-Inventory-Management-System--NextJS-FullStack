/**
 * Statistics Card Component
 * Flat, token-driven shadcn card for displaying warehouse statistics.
 * The `variant` prop is kept for API compatibility and now only tints the icon.
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
   * Color variant for the card (tints the icon only)
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
 * Subtle per-variant icon tint. The card itself stays flat and neutral.
 */
const iconColorByVariant: Record<CardVariant, string> = {
  sky: "text-sky-600 dark:text-sky-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  violet: "text-violet-600 dark:text-violet-400",
  blue: "text-blue-600 dark:text-blue-400",
  orange: "text-orange-600 dark:text-orange-400",
  teal: "text-teal-600 dark:text-teal-400",
};

/**
 * StatisticsCard component
 * Displays a flat card with statistics, icon, and badges
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
  return (
    <article
      className={cn(
        "group flex h-full min-h-[210px] min-w-0 flex-col rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-foreground/20 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full">
        {/* Title and icon inline so badges get full width below */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <p className="text-xs uppercase tracking-[0.45em] text-muted-foreground min-w-0">
            {title}
          </p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
            <Icon className={cn("h-5 w-5", iconColorByVariant[variant])} />
          </div>
        </div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
        {badges.length > 0 && (
          <div className="mt-3 flex w-full min-w-0 flex-wrap gap-2">
            {badges.map((badge, index) => (
              <Badge
                key={index}
                variant={badge.variant || "secondary"}
                className="text-xs font-normal"
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
