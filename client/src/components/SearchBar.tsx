import { useState, type SubmitEvent } from "react";
import { FilterPanel, type FilterState } from "./FilterPanel";
import type { SearchFilters } from "../types/search";

interface SearchBarProps {
  onSearch: (term: string, filters: SearchFilters) => void;
  onError?: (message: string | null) => void;
}

const initialFilters: FilterState = {
  categories: "",
  authors: "",
  startDate: "",
  endDate: "",
};

export function SearchBar({ onSearch, onError }: SearchBarProps) {
  const [term, setTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const hasActiveFilters = Boolean(
    filters.categories.trim() ||
    filters.authors.trim() ||
    filters.startDate ||
    filters.endDate,
  );

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    const categoriesList = filters.categories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const authorsList = filters.authors
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const datesList: string[] = [];
    if (filters.startDate && filters.endDate) {
      datesList.push(filters.startDate, filters.endDate);
    }

    const parsedFilters: SearchFilters = {};
    if (categoriesList.length > 0) parsedFilters.categories = categoriesList;
    if (authorsList.length > 0) parsedFilters.authors = authorsList;
    if (datesList.length > 0) parsedFilters.createdDates = datesList;

    const hasAnyFilters = Boolean(
      (parsedFilters.categories && parsedFilters.categories.length > 0) ||
      (parsedFilters.authors && parsedFilters.authors.length > 0) ||
      (parsedFilters.createdDates && parsedFilters.createdDates.length > 0),
    );

    if (term.trim() || hasAnyFilters) {
      onError?.(null);
      onSearch(term.trim(), parsedFilters);
    } else {
      onError?.("Please enter a search term or specify at least one filter.");
    }
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="search-bar-row">
        <input
          type="text"
          className="search-input"
          placeholder="Enter your search term"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button
          type="button"
          className="filter-toggle-button"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          Filters{hasActiveFilters ? " (active)" : ""}
        </button>
        <button type="submit" className="search-button">
          Search
        </button>
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(initialFilters)}
        />
      )}
    </form>
  );
}
