import { useState } from "react";
import type { Paper } from "../types/search";

export function ResultCard({ paper }: { paper: Paper }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="result-card">
      <h3 className="result-title">
        <a
          href={`https://arxiv.org/abs/${paper.arxivId}`}
          target="_blank"
          rel="noreferrer"
        >
          {paper.title}
        </a>
      </h3>
      {paper.authors.length < 10 ? (
        <p className="result-meta">
          <strong>Authors:</strong> {paper.authors?.join(", ")}
        </p>
      ) : (
        <details
          className="result-meta"
          onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
        >
          <summary>
            <strong>Authors</strong>{" "}
            {!isExpanded ? "(click to expand)" : "(click to collapse)"}
          </summary>
          <p className="result-meta">{paper.authors?.join(", ")}</p>
        </details>
      )}
      <p className="result-meta">
        <strong>Categories:</strong> {paper.categories?.join(", ")}
      </p>
      <p className="result-abstract">{paper.abstract}</p>
    </div>
  );
}
