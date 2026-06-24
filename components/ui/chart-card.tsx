import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import React from "react";

/**
 * Color variant types for chart cards
 */
type CardVariant =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "blue"
  | "orange"
  | "teal"
  | "neutral";

interface ChartCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  description?: string;
  variant?: CardVariant;
}

/**
 * Subtle per-variant icon tint. The card body is a flat, token-driven shadcn
 * card; only the icon keeps a hint of color (neutral = muted).
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
  neutral: "text-muted-foreground",
};

export function ChartCard({
  title,
  icon: Icon,
  children,
  className,
  description,
  variant = "neutral",
}: ChartCardProps) {
  return (
    <article
      className={cn(
        "group overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-colors hover:border-foreground/20",
        className,
      )}
    >
      <div className="flex flex-row items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted">
            <Icon className={cn("h-4 w-4", iconColorByVariant[variant])} />
          </div>
        )}
      </div>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>
    </article>
  );
}
