import { useState } from "react";
import type { Paper } from "../types/search";

export function ResultCard({ paper }: { paper: Paper }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandAbstract, setExpandAbstract] = useState(false);

  const getDate = (isoStr: string) => {
    const formattedDate = new Date(isoStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return formattedDate;
  };

  const viewMoreAbstract = () => {
    setExpandAbstract((expandAbstract) => !expandAbstract);
  };

  const displayAbstractText = (paper: Paper) => {
    const isLongAbstract = paper.abstract.length > 1300;
    const displayText =
      isLongAbstract && !expandAbstract
        ? `${paper.abstract.slice(0, 500).trimEnd()}...`
        : paper.abstract;

    return (
      <div className="result-abstract">
        <p className="result-abstract-text">{displayText}</p>
        {isLongAbstract && (
          <button
            type="button"
            className="abstract-toggle-btn"
            onClick={viewMoreAbstract}
          >
            {!expandAbstract ? "Read more" : "Show less"}
          </button>
        )}
      </div>
    );
  };

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
      {paper.authors.length <= 10 ? (
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
      {paper.doi ? (
        <p className="result-meta">
          <strong>DOI:</strong>{" "}
          <a href={`https://doi.org/${paper.doi}`}>{paper.doi}</a>
        </p>
      ) : (
        ""
      )}
      <p className="result-meta"><strong>Journal Ref:</strong> {paper.journalRef ? `Published in ${paper.journalRef}` : 'Preprint'}</p>
      {getDate(paper.createdDate) === getDate(paper.updatedDate) ? (
        <p className="result-meta">
          <strong>Submitted on:</strong> {getDate(paper.createdDate)}
        </p>
      ) : (
        <>
          <p className="result-meta">
            <strong>Submitted on:</strong> {getDate(paper.createdDate)}
          </p>
          <p className="result-meta">
            <strong>Last updated:</strong> {getDate(paper.updatedDate)}
          </p>
        </>
      )}
      {displayAbstractText(paper)}
    </div>
  );
}
