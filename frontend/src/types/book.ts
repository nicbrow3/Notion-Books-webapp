export interface BookSearchResult {
  id: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher?: string | null;
  publishedDate?: string | null;
  originalPublishedDate?: string | null; // Original publication date from Open Library
  editionPublishedDate?: string | null; // Edition publication date
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
  openLibraryKey?: string; // Open Library work key
  openLibraryData?: {
    editionCount?: number;
    firstPublishYear?: number;
    subjects?: string[];
    rawSubjects?: string[];
  };
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

export interface BookEdition {
  id: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher?: string | null;
  publishedDate?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  pageCount?: number | null;
  language?: string | null;
  thumbnail?: string | null;
  format?: string | null; // Physical format (e.g., "Paperback", "Hardcover")
  dimensions?: string | null;
  weight?: string | null;
  description?: string | null;
  categories?: string[]; // Add categories from edition
  infoLink?: string | null;
  source: string;
  openLibraryKey?: string;
  rawData?: any;
}

export interface BookEditionsResponse {
  success: boolean;
  data?: {
    workKey: string;
    totalEditions: number;
    editions: BookEdition[];
    message?: string;
  };
  error?: string;
} 