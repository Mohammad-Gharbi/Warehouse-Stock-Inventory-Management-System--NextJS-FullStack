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
 * Color configuration for each variant - glassmorphic style
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

export function AnalyticsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconColor = "text-gray-900 dark:text-white",
  variant = "blue",
}: AnalyticsCardProps) {
  const config = variantConfig[variant];

  return (
    <article
      className={cn(
        "group rounded-[20px] border min-h-[140px] h-full p-4 sm:p-5 backdrop-blur-sm transition",
        config.border,
        config.gradient,
        config.shadow,
        config.hoverBorder,
        className,
      )}
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-700 dark:text-white/60 font-medium shrink-0">
            {title}
          </p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300/30 bg-gray-100/50 shadow-inner shadow-primary/20 backdrop-blur dark:border-white/15 dark:bg-white/10">
            <Icon className={cn("h-5 w-5", iconColor)} />
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
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-gray-500 dark:text-white/60 ml-1">
              from last month
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
