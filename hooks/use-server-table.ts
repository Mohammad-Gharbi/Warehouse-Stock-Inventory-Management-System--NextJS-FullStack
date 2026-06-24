"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type PaginationParams,
  type SortOrder,
} from "@/lib/api/pagination";

export interface UseServerTableOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialSort?: string;
  initialOrder?: SortOrder;
  /** Debounce (ms) before a search term is committed to `params`. */
  searchDebounceMs?: number;
}

export interface UseServerTableResult {
  /**
   * Stable params object to feed both a query key and a fetch query string,
   * e.g. `useQuery({ queryKey: queryKeys.products.list(params), ... })`.
   */
  params: PaginationParams;
  page: number;
  pageSize: number;
  /** Raw, undebounced search input — bind to the search box `value`. */
  searchInput: string;
  sort?: string;
  order?: SortOrder;
  filters: Record<string, string | undefined>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSort: (sort: string | undefined, order?: SortOrder) => void;
  /** Cycle a column's sort: asc → desc on repeat clicks; switches column otherwise. */
  toggleSort: (key: string) => void;
  setFilter: (key: string, value: string | undefined) => void;
  reset: () => void;
}

/**
 * Client state for a server-paginated table: page / pageSize / debounced search /
 * sort / arbitrary filters. Returns a `params` object designed to drop straight
 * into a `queryKeys.<entity>.list(params)` factory and `buildPaginationQuery`.
 *
 * Foundation only (Milestone 1) — wired into products/orders/invoices in Milestone 3.
 */
export function useServerTable(
  options: UseServerTableOptions = {},
): UseServerTableResult {
  const {
    initialPage = DEFAULT_PAGE,
    initialPageSize = DEFAULT_PAGE_SIZE,
    initialSort,
    initialOrder,
    searchDebounceMs = 300,
  } = options;

  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearchCommitted] = useState("");
  const [sort, setSortKey] = useState<string | undefined>(initialSort);
  const [order, setOrder] = useState<SortOrder | undefined>(initialOrder);
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );

  // Debounce committing the search term, and snap back to page 1 when it changes.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearchCommitted(searchInput.trim());
      setPageState(1);
    }, searchDebounceMs);
    return () => clearTimeout(id);
  }, [searchInput, searchDebounceMs]);

  const setPage = useCallback((p: number) => setPageState(Math.max(1, p)), []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const setSearch = useCallback((value: string) => setSearchInput(value), []);

  const setSort = useCallback((key: string | undefined, ord?: SortOrder) => {
    setSortKey(key);
    setOrder(ord);
    setPageState(1);
  }, []);

  const toggleSort = useCallback(
    (key: string) => {
      if (sort !== key) {
        setSortKey(key);
        setOrder("asc");
      } else {
        setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      }
      setPageState(1);
    },
    [sort],
  );

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageState(1);
  }, []);

  const reset = useCallback(() => {
    setPageState(initialPage);
    setPageSizeState(initialPageSize);
    setSearchInput("");
    setSearchCommitted("");
    setSortKey(initialSort);
    setOrder(initialOrder);
    setFilters({});
  }, [initialPage, initialPageSize, initialSort, initialOrder]);

  const params = useMemo<PaginationParams>(
    () => ({
      page,
      pageSize,
      search: search || undefined,
      sort,
      order,
      filters,
    }),
    [page, pageSize, search, sort, order, filters],
  );

  return {
    params,
    page,
    pageSize,
    searchInput,
    sort,
    order,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    toggleSort,
    setFilter,
    reset,
  };
}
