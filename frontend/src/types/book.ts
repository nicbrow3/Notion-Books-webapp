export interface AudiobookData {
  hasAudiobook: boolean;
  source: string;
  title?: string;
  authors?: string[];
  narrators?: string[];
  duration?: string;
  chapters?: number;
  chapterCount?: number; // Alternative name for chapters
  totalDurationHours?: number; // Duration in hours
  totalDurationMinutes?: number; // Duration in minutes
  totalDurationMs?: number; // Duration in milliseconds
  publisher?: string;
  publishedDate?: string;
  description?: string;
  summary?: string; // "About this listen" or additional summary content
  copyright?: string; // Copyright information
  image?: string;
  rating?: number;
  ratingCount?: number;
  genres?: string[];
  series?: string;
  seriesPosition?: string;
  language?: string;
  asin?: string;
  audibleUrl?: string;
  isEarlierDate?: boolean; // Flag to indicate if audiobook date is earlier than book dates
  
  // User selection context
  selectionContext?: {
    originalTitle: string;
    originalAuthor: string;
    selectedTitle: string;
    selectedAuthors: string[];
    userSelected: boolean;
  };
  
  // Author information when book not found but author exists
  authorFound?: boolean;
  authorInfo?: {
    name: string;
    description?: string;
    image?: string;
    genres?: string[];
    similarAuthors?: string[];
  };
  
  // API limitation messaging
  searchLimitation?: string;
  suggestion?: string;
  apiLimitation?: string;
  error?: string;
  
  // Google Books audiobook hints
  googleHint?: {
    suggestsAudiobook: boolean;
    confidence: 'low' | 'medium' | 'high';
    reason: string;
    message: string;
  };
}

export interface GoogleAudiobookHints {
  textToSpeechAllowed: boolean;
  markedAsAudiobook: boolean;
  hasAudioLinks: boolean;
  confidence: 'low' | 'medium' | 'high';
  source: 'google_books_api';
}

export interface Book {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  thumbnail?: string;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  publisher?: string;
  copyright?: string;
  source?: string;
  rawData?: any;
  
  // Audiobook data
  audiobookData?: AudiobookData;
  
  // Google audiobook hints
  googleAudiobookHints?: GoogleAudiobookHints;
}

export interface EditionVariant {
  title: string;
  publisher?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  isbn13?: string | null;
  isbn10?: string | null;
  thumbnail?: string | null;
  description?: string | null;
  source: string;
  isOriginal: boolean;
}

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
  categories?: string[];
  averageRating?: number | null;
  ratingsCount?: number | null;
  language?: string | null;
  thumbnail?: string | null;
  previewLink?: string | null;
  infoLink?: string | null;
  buyLink?: string | null;
  source: string;
  audiobookData?: AudiobookData;
  notionPageId?: string;
  copyright?: string | null;
  originalPublishedDate?: string | null;
  firstPublishedDate?: string | null;
  openLibraryKey?: string | null;
  openLibraryData?: {
    editionCount?: number;
    firstPublishYear?: number;
    subjects?: string[];
    rawSubjects?: string[];
  };

  // Edition variants for consolidated search results (deluxe, special editions, etc.)
  editionVariants?: EditionVariant[];

  // Google audiobook hints
  googleAudiobookHints?: GoogleAudiobookHints;
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
  includeAudiobooks?: boolean | 'top';
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
    filteredForEnglish?: boolean;
  };
  error?: string;
} 