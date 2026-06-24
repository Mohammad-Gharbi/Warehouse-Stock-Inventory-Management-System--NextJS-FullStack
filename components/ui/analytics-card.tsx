import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

/**
 * Color variant types for analytics cards (matching StatisticsCard)
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

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconColor?: string;
  variant?: CardVariant;
}

/**
 * Subtle per-variant icon tint. The card itself is a flat, token-driven
 * shadcn card; only the icon keeps a hint of color for at-a-glance scanning.
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

export function AnalyticsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconColor,
  variant = "blue",
}: AnalyticsCardProps) {
  return (
    <article
      className={cn(
        "group flex h-full min-h-[140px] flex-col rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-foreground/20 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-medium shrink-0">
            {title}
          </p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
            <Icon
              className={cn("h-5 w-5", iconColor ?? iconColorByVariant[variant])}
            />
          </div>
        </div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive",
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              from last month
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
