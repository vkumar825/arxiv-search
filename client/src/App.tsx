import { useState } from "react";
import { SearchBar } from "./components/SearchBar";
import { ResultCard } from "./components/ResultCard";
import { retrievePapers } from "./services/api";
import type { Paper } from "./types/search";
import "./App.css";

export function App() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (term: string) => {
    setLoading(true);
    try {
      const data = await retrievePapers(term);
      setPapers(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>arXiv Search</h1>
      <SearchBar onSearch={handleSearch} loading={loading} />

      <div className="results-container">
        {papers.map((paper) => (
          <ResultCard key={paper.arxivId} paper={paper} />
        ))}
      </div>
    </div>
  );
}

export default App;
