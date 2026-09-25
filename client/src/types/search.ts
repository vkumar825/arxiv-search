export interface Paper {
  arxivId: string;
  title: string;
  authors: string[];
  categories: string[];
  abstract: string;
  journalRef?: string | null;
  doi?: string[] | null;
  createdDate: string;
  updatedDate: string;
}

export interface SearchFilters {
  arxivId?: string;
  categories?: string[];
  authors?: string[];
  createdDates?: string[];
}
