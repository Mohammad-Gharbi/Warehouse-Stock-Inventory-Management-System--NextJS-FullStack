/**
 * Invoice Table Component
 * Displays invoices in a table format with sorting, pagination, and filtering
 */

"use client";

import React, { useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Invoice } from "@/types";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import PaginationSelector, {
  type PaginationType,
} from "@/components/shared/PaginationSelector";
import { useClampPaginationIndex } from "@/hooks/use-clamp-pagination-index";
import { Button } from "@/components/ui/button";
import { GrFormPrevious, GrFormNext } from "react-icons/gr";
import { BiFirstPage, BiLastPage } from "react-icons/bi";

interface InvoiceTableProps {
  data: Invoice[];
  columns: ColumnDef<Invoice>[];
  isLoading: boolean;
  searchTerm: string;
  pagination: PaginationType;
  setPagination: (
    updater: PaginationType | ((old: PaginationType) => PaginationType)
  ) => void;
  selectedStatuses: string[];
}

export const InvoiceTable = React.memo(function InvoiceTable({
  data,
  columns,
  isLoading,
  searchTerm,
  pagination,
  setPagination,
  selectedStatuses,
}: InvoiceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredData = useMemo(() => {
    const filtered = data.filter((invoice) => {
      // Search term filtering (by invoice number)
      const searchMatch =
        !searchTerm ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filtering
      const statusMatch =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(invoice.status);

      return searchMatch && statusMatch;
    });

    return filtered;
  }, [data, searchTerm, selectedStatuses]);

  useClampPaginationIndex(filteredData.length, pagination, setPagination);

  const table = useReactTable({
    data: filteredData || [],
    columns,
    state: {
      pagination,
      sorting,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="poppins mt-0">
      {/* Show Table Skeleton while loading - matches exact table structure */}
      {isLoading ? (
        <TableSkeleton rows={pagination.pageSize} columns={columns.length} />
      ) : (
        <>
          <div className="rounded-[28px] border border-violet-400/20 dark:border-white/10 shadow-sm bg-card backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="bg-white/40 dark:bg-white/10"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={
                        index % 2 === 0
                          ? "bg-white/30 dark:bg-white/5"
                          : "bg-white/20 dark:bg-white/10"
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center text-gray-900 dark:text-white"
                    >
                      No invoices found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer: Rows per page (left) | Page controls (right) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mt-4">
            {/* Rows per page - Left */}
            <PaginationSelector
              pagination={pagination}
              setPagination={setPagination}
              variant="violet"
              layout="inline"
              enabled={!isLoading}
            />

            {/* Pagination Buttons - Right */}
            <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="h-10 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-violet-300/40 dark:hover:border-violet-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BiFirstPage />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-10 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-violet-300/40 dark:hover:border-violet-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GrFormPrevious />
              </Button>
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Page {pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-10 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-violet-300/40 dark:hover:border-violet-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GrFormNext />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="h-10 rounded-[28px] border border-violet-400/30 dark:border-violet-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-violet-300/40 dark:hover:border-violet-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BiLastPage />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
