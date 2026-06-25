/**
 * User Management Filters
 */

"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { IoClose } from "react-icons/io5";
import { FilterDropdown } from "@/components/ui/filter-dropdown";
import { Users } from "lucide-react";

const ROLE_OPTIONS = [
  { id: "user", name: "User" },
  { id: "admin", name: "Admin" },
  { id: "client", name: "Client" },
  { id: "retailer", name: "Retailer" },
];

interface UserManagementFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedRoles: string[];
  setSelectedRoles: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function UserManagementFilters({
  searchTerm,
  setSearchTerm,
  selectedRoles,
  setSelectedRoles,
}: UserManagementFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
      <div className="relative flex-1 sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 dark:text-white/60 z-10" />
        <Input
          placeholder="Search by name, email, or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 pl-9 pr-10 w-full rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-sky-400/30 dark:border-white/20 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 focus-visible:border-sky-400 focus-visible:ring-sky-500/50 shadow-sm"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-white/10 backdrop-blur-sm"
          >
            <IoClose className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
        <FilterDropdown
          selectedValues={selectedRoles}
          setSelectedValues={setSelectedRoles}
          options={ROLE_OPTIONS}
          placeholder="Filter by role..."
          label="Role"
          icon={Users}
          triggerClassName="h-10 rounded-lg border border-rose-400/30 dark:border-rose-400/30 bg-card text-gray-700 dark:text-white shadow-sm backdrop-blur-sm transition duration-200 hover:border-rose-300/40 dark:hover:border-rose-300/40 gap-2"
        />
      </div>
    </div>
  );
}
