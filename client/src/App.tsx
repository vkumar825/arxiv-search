import { useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { ResultCard } from "./components/ResultCard";
import { Pagination } from "./components/Pagination";
import { retrievePapers } from "./services/api";
import type { Paper, SearchFilters } from "./types/search";
import "./App.css";

export function App() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (term: string, filters: SearchFilters = {}) => {
    setErrorMessage(null);
    setCurrentPage(1);
    try {
      const data = await retrievePapers(term, filters);

      // In scalar queries (no search term), sort chronologically by createdDate ascending
      if (!term.trim()) {
        data.sort(
          (a, b) =>
            new Date(a.createdDate).getTime() -
            new Date(b.createdDate).getTime(),
        );
      }

      setPapers(data);
      setHasSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    }
  };

  const handleClear = () => {
    setPapers([]);
    setCurrentPage(1);
    setErrorMessage(null);
    setHasSearched(false);
    setSearchKey((prev) => prev + 1);
  };

  const pageSize = 10;
  const totalPages = Math.ceil(papers.length / pageSize);
  const start = (Number(currentPage) - 1) * pageSize;
  const end = start + pageSize;
  const paginatedPapers = papers.slice(start, end);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          ar<span className="arxiv-x">X</span>iv Search
        </h1>
        <p className="app-subtitle">
          Hybrid semantic & lexical search across 100,000+ research papers.
        </p>
      </header>
      <SearchBar
        key={searchKey}
        onSearch={handleSearch}
        onError={setErrorMessage}
      />

      {errorMessage && <div className="error-banner">{errorMessage}</div>}

      {hasSearched && papers.length === 0 && !errorMessage && (
        <div className="no-results-banner">
          No papers found matching your search. Try broadening your terms or adjusting filters.
        </div>
      )}

      {papers.length > 0 && (
        <div className="clear-search-container">
          <button
            type="button"
            className="clear-search-button"
            onClick={handleClear}
          >
            Clear search
          </button>
        </div>
      )}

      <div className="results-container">
        {paginatedPapers.map((paper) => (
          <ResultCard key={paper.arxivId} paper={paper} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export default App;
