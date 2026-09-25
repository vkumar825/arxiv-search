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

  const handleSearch = async (term: string, filters: SearchFilters = {}) => {
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
    } catch (err) {
      console.error("Search failed:", err);
    }
  };

  const pageSize = 10;
  const totalPages = Math.ceil(papers.length / pageSize);
  const start = (Number(currentPage) - 1) * pageSize;
  const end = start + pageSize;
  const paginatedPapers = papers.slice(start, end);

  return (
    <div className="app-container">
      <h1>arXiv Search</h1>
      <SearchBar onSearch={handleSearch} />

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
