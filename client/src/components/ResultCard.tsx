import type { Paper } from "../types/search";

export function ResultCard({ paper }: { paper: Paper }) {
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
      <p className="result-meta">
        <strong>Authors:</strong> {paper.authors?.join(", ")}
      </p>
      <p className="result-meta">
        <strong>Categories:</strong> {paper.categories?.join(", ")}
      </p>
      <p className="result-abstract">{paper.abstract}</p>
    </div>
  );
}
