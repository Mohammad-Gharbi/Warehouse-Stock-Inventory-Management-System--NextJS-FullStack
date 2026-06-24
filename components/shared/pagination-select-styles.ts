/**
 * Theme classes for table footer page-size Select (matches per-domain table accents).
 */

export type PaginationSelectVariant =
  | "sky"
  | "violet"
  | "rose"
  | "teal"
  | "amber"
  | "emerald";

export type PaginationSelectVariantStyles = {
  placeholder: string;
  trigger: string;
  content: string;
  item: string;
};

export const PAGINATION_SELECT_VARIANTS: Record<
  PaginationSelectVariant,
  PaginationSelectVariantStyles
> = {
  sky: {
    placeholder:
      "h-10 rounded-[28px] border border-sky-400/30 dark:border-sky-400/30 bg-card text-gray-700 dark:text-white px-2 w-16 sm:w-20 flex items-center justify-between font-medium",
    trigger:
      "h-10 rounded-[28px] border border-sky-400/30 dark:border-sky-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-sky-300/40 dark:hover:border-sky-300/40 font-medium px-2 w-16 sm:w-20",
    content:
      "rounded-[28px] border border-sky-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm shadow-sm",
    item: "text-gray-700 dark:text-white/80 focus:bg-sky-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white",
  },
  violet: {
    placeholder:
      "h-10 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-card text-gray-700 dark:text-white px-2 w-16 sm:w-20 flex items-center justify-between font-medium",
    trigger:
      "h-10 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-violet-300/40 dark:hover:border-violet-300/40 font-medium px-2 w-16 sm:w-20",
    content:
      "rounded-[28px] border border-violet-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm shadow-sm",
    item: "text-gray-700 dark:text-white/80 focus:bg-violet-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white",
  },
  rose: {
    placeholder:
      "h-10 rounded-[28px] border border-rose-400/30 dark:border-rose-400/30 bg-card text-gray-700 dark:text-white px-2 w-16 sm:w-20 flex items-center justify-between font-medium",
    trigger:
      "h-10 rounded-[28px] border border-rose-400/30 dark:border-rose-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-rose-300/40 dark:hover:border-rose-300/40 font-medium px-2 w-16 sm:w-20",
    content:
      "rounded-[28px] border border-rose-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm shadow-sm",
    item: "text-gray-700 dark:text-white/80 focus:bg-rose-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white",
  },
  teal: {
    placeholder:
      "h-10 rounded-[28px] border border-teal-400/30 dark:border-teal-400/30 bg-card text-gray-700 dark:text-white px-2 w-16 sm:w-20 flex items-center justify-between font-medium",
    trigger:
      "h-10 rounded-[28px] border border-teal-400/30 dark:border-teal-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-teal-300/40 font-medium px-2 w-16 sm:w-20",
    content:
      "rounded-[28px] border border-teal-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm shadow-sm",
    item: "text-gray-700 dark:text-white/80 focus:bg-teal-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white",
  },
  amber: {
    placeholder:
      "h-10 rounded-[28px] border border-amber-400/30 dark:border-amber-400/30 bg-card text-gray-700 dark:text-white px-2 w-16 sm:w-20 flex items-center justify-between font-medium",
    trigger:
      "h-10 rounded-[28px] border border-amber-400/30 dark:border-amber-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-amber-300/40 font-medium px-2 w-16 sm:w-20",
    content:
      "rounded-[28px] border border-amber-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm shadow-sm",
    item: "text-gray-700 dark:text-white/80 focus:bg-amber-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white",
  },
  emerald: {
    placeholder:
      "h-10 rounded-[28px] border border-emerald-400/30 dark:border-emerald-400/30 bg-card text-gray-700 dark:text-white px-2 w-16 sm:w-20 flex items-center justify-between font-medium",
    trigger:
      "h-10 rounded-[28px] border border-emerald-400/30 dark:border-emerald-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-emerald-300/40 dark:hover:border-emerald-300/40 font-medium px-2 w-16 sm:w-20",
    content:
      "rounded-[28px] border border-emerald-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm shadow-sm",
    item: "text-gray-700 dark:text-white/80 focus:bg-emerald-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white",
  },
};

export const PAGE_SIZE_OPTIONS = [4, 6, 8, 10, 15, 20, 30] as const;
