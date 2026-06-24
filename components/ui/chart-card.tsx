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
    border: "border-sky-400/20",
    gradient: "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-sky-300/40",
  },
  emerald: {
    border: "border-emerald-400/20",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-emerald-300/40",
  },
  amber: {
    border: "border-amber-400/20",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-amber-300/40",
  },
  rose: {
    border: "border-rose-400/20",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-rose-300/40",
  },
  violet: {
    border: "border-violet-400/20",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-violet-300/40",
  },
  blue: {
    border: "border-blue-400/20",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-blue-300/40",
  },
  orange: {
    border: "border-orange-400/20",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-orange-300/40",
  },
  teal: {
    border: "border-teal-400/20",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-teal-300/40",
  },
  neutral: {
    border: "border-gray-300/30 dark:border-white/10",
    gradient:
      "bg-card ",
    shadow:
      "shadow-sm ",
    hoverBorder: "hover:border-gray-300/50 dark:hover:border-white/20",
  },
};

export function ChartCard({
  title,
  icon: Icon,
  children,
  className,
  description,
  variant = "neutral",
}: ChartCardProps) {
  const config = variantConfig[variant];

  return (
    <article
      className={cn(
        "group rounded-[20px] border backdrop-blur-sm transition overflow-hidden",
        config.border,
        config.gradient,
        config.shadow,
        config.hoverBorder,
        className,
      )}
    >
      <div className="flex flex-row items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-white/70 mt-1">
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300/30 bg-gray-100/50 backdrop-blur dark:border-white/15 dark:bg-white/10">
            <Icon className="h-4 w-4 text-gray-700 dark:text-white/80" />
          </div>
        )}
      </div>
      <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>
    </article>
  );
}
