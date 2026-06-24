/**
 * Server-side pagination contract.
 *
 * Milestone 1 foundation — the shared shape every list endpoint and table will
 * adopt in Milestone 3 (products / orders / invoices), replacing today's
 * "fetch the entire dataset and paginate on the client" pattern.
 *
 * List endpoints accept:
 *   ?page=1&pageSize=20&search=foo&sort=name&order=asc&<filterKey>=<value>
 * and return a `PaginatedResponse<T>`.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type SortOrder = "asc" | "desc";

export interface PaginationParams {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  search?: string;
  /** Column/key to sort by (validated against an allow-list server-side). */
  sort?: string;
  order?: SortOrder;
  /** Arbitrary additional filters, e.g. { status: "available", categoryId: "abc" }. */
  filters?: Record<string, string | undefined>;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Clamp a possibly-NaN number into [min, max], falling back when not finite. */
function clampInt(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

/**
 * Parse pagination params from a request's URLSearchParams (API routes).
 * Invalid/unknown values fall back to safe defaults; `sort` is only honored
 * when it appears in `allowedSortKeys` (guards against arbitrary ORDER BY).
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  options?: { defaultPageSize?: number; allowedSortKeys?: readonly string[] },
): Required<Pick<PaginationParams, "page" | "pageSize">> &
  Pick<PaginationParams, "search" | "sort" | "order"> {
  const defaultPageSize = options?.defaultPageSize ?? DEFAULT_PAGE_SIZE;

  const page = clampInt(
    Number(searchParams.get("page")),
    1,
    Number.MAX_SAFE_INTEGER,
    DEFAULT_PAGE,
  );
  const pageSize = clampInt(
    Number(searchParams.get("pageSize")),
    1,
    MAX_PAGE_SIZE,
    defaultPageSize,
  );

  const search = searchParams.get("search")?.trim() || undefined;

  const sortRaw = searchParams.get("sort")?.trim() || undefined;
  const sort =
    sortRaw &&
    (!options?.allowedSortKeys || options.allowedSortKeys.includes(sortRaw))
      ? sortRaw
      : undefined;

  const orderRaw = searchParams.get("order");
  const order: SortOrder | undefined =
    orderRaw === "asc" || orderRaw === "desc" ? orderRaw : undefined;

  return { page, pageSize, search, sort, order };
}

/**
 * Build a query string from pagination params for client fetches.
 * Omits empty values so query keys / URLs stay stable and cache-friendly.
 */
export function buildPaginationQuery(params: PaginationParams): string {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));
  if (params.search) sp.set("search", params.search);
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value !== undefined && value !== "") sp.set(key, value);
    }
  }
  return sp.toString();
}

/** Compute response meta from a total row count. */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
