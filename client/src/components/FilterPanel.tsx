export interface FilterState {
  categories: string;
  authors: string;
  startDate: string;
  endDate: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
}

export function FilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
  return (
    <div className="filter-panel">
      <div className="filter-group">
        <label className="filter-label">Categories</label>
        <input
          type="text"
          className="filter-input"
          placeholder="e.g. cs.AI, stat.ML"
          value={filters.categories}
          onChange={(e) => onChange({ ...filters, categories: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Authors</label>
        <input
          type="text"
          className="filter-input"
          placeholder="e.g. Yoshua Bengio, Yann LeCun"
          value={filters.authors}
          onChange={(e) => onChange({ ...filters, authors: e.target.value })}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Date Range</label>
        <div className="date-inputs">
          <input
            type="date"
            className="filter-date-input"
            value={filters.startDate}
            onChange={(e) =>
              onChange({ ...filters, startDate: e.target.value })
            }
          />
          <span className="date-separator">to</span>
          <input
            type="date"
            className="filter-date-input"
            value={filters.endDate}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="filter-actions">
        <button type="button" className="filter-clear-btn" onClick={onClear}>
          Clear Filters
        </button>
      </div>
    </div>
  );
}
