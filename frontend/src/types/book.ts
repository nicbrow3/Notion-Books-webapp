export interface BookSearchResult {
  id: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher?: string | null;
  publishedDate?: string | null;
  description?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  pageCount?: number | null;
  categories: string[];
  averageRating?: number | null;
  ratingsCount?: number | null;
  language?: string | null;
  thumbnail?: string | null;
  previewLink?: string | null;
  infoLink?: string | null;
  buyLink?: string | null;
  source: string;
  rawData?: any; // Keep original data for debugging
}

export interface BookSearchResponse {
  books: BookSearchResult[];
  totalItems: number;
  query: string;
  searchType: string;
}

export type SearchType = 'general' | 'title' | 'author' | 'isbn';

export interface SearchParams {
  query: string;
  type: SearchType;
  limit?: number;
} 