/**
 * Product Review Filters
 * Search and filter controls for product reviews list
 */

"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { IoClose } from "react-icons/io5";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Star } from "lucide-react";

const STATUS_OPTIONS = [
  { id: "pending", name: "Pending" },
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Rejected" },
];

const RATING_OPTIONS = [
  { id: "1", name: "1 star" },
  { id: "2", name: "2 stars" },
  { id: "3", name: "3 stars" },
  { id: "4", name: "4 stars" },
  { id: "5", name: "5 stars" },
];

interface ProductReviewFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedRatings: string[];
  setSelectedRatings: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function ProductReviewFilters({
  searchTerm,
  setSearchTerm,
  selectedStatuses,
  setSelectedStatuses,
  selectedRatings,
  setSelectedRatings,
}: ProductReviewFiltersProps) {
  const statusTriggerClass =
    "h-10 rounded-[28px] border border-rose-400/30 dark:border-rose-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-rose-300/40 dark:hover:border-rose-300/40 ";
  const ratingTriggerClass =
    "h-10 rounded-[28px] border border-amber-400/30 dark:border-amber-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-amber-300/40 dark:hover:border-amber-300/40 ";

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
      <div className="relative flex-1 sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-white/60 z-10" />
        <Input
          placeholder="Search by product, SKU, or comment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 pl-9 pr-10 w-full rounded-[28px] bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-sky-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-sky-400 focus-visible:ring-sky-500/50 shadow-sm"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-white/10"
          >
            <IoClose className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <FilterDropdown
          selectedValues={selectedStatuses}
          setSelectedValues={setSelectedStatuses}
          options={STATUS_OPTIONS}
          placeholder="Filter by status..."
          label="Status"
          triggerClassName={statusTriggerClass}
        />
        <FilterDropdown
          selectedValues={selectedRatings}
          setSelectedValues={setSelectedRatings}
          options={RATING_OPTIONS}
          placeholder="Filter by rating..."
          label="Rating"
          icon={Star}
          triggerClassName={ratingTriggerClass}
        />
      </div>
    </div>
  );
}
