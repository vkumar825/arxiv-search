import { useState, type SubmitEvent } from "react";

interface SearchBarProps {
  onSearch: (term: string) => void;
  loading: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [term, setTerm] = useState("");

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (term.trim()) {
      onSearch(term);
    }
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="search-input"
        placeholder="Enter your search term"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <button type="submit" className="search-button" disabled={loading}>
        {loading ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
