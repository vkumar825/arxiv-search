import type { Paper, SearchFilters } from "../types/search";

const API_URL = import.meta.env.VITE_API_URL;

export async function retrievePapers(
  term: string,
  filters: SearchFilters = {},
): Promise<Paper[]> {
  const params = new URLSearchParams();

  if (term.trim()) {
    params.append("term", term.trim());
  }

  params.append("limit", "50");

  filters.categories?.forEach((category) =>
    params.append("category", category),
  );
  filters.authors?.forEach((author) => params.append("author", author));
  filters.createdDates?.forEach((date) => params.append("createdDate", date));

  const response = await fetch(`${API_URL}/search?${params.toString()}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error || `Search failed with status ${response.status}`,
    );
  }

  const data = await response.json();
  return data.results || [];
}
