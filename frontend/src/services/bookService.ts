import { BookSearchResponse, SearchParams, BookSearchResult } from '../types/book';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export class BookService {
  static async searchBooks(params: SearchParams): Promise<BookSearchResponse> {
    const { query, type, limit = 10 } = params;
    
    const searchParams = new URLSearchParams({
      q: query,
      type,
      limit: limit.toString(),
      includeAudiobooks: 'false' // Don't include audiobooks in main search for performance
    });

    const response = await fetch(`${API_BASE_URL}/api/books/search?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Handle the backend response structure: { success: true, data: { books: [...], ... } }
    if (result.success && result.data) {
      return {
        books: result.data.books || [],
        totalItems: result.data.totalItems || 0,
        query: result.data.query || query,
        searchType: result.data.searchType || type
      };
    } else {
      throw new Error(result.message || 'Invalid response format');
    }
  }

  static async getAudiobookData(book: BookSearchResult): Promise<BookSearchResult> {
    const searchParams = new URLSearchParams({
      q: book.title,
      type: 'title',
      limit: '1',
      includeAudiobooks: 'true'
    });

    const response = await fetch(`${API_BASE_URL}/api/books/search?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.data && result.data.books.length > 0) {
      // Find the best matching book from the results
      const matchingBook = result.data.books.find((b: BookSearchResult) => 
        b.title.toLowerCase() === book.title.toLowerCase() && 
        b.authors.some(author => book.authors.includes(author))
      ) || result.data.books[0];

      // Return the original book with audiobook data added
      return {
        ...book,
        audiobookData: matchingBook.audiobookData
      };
    }

    // If no audiobook data found, return original book with empty audiobook data
    return {
      ...book,
      audiobookData: {
        hasAudiobook: false,
        source: 'none'
      }
    };
  }

  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/test/connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: result.success || false,
        message: result.message || 'Connection test completed'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
} 