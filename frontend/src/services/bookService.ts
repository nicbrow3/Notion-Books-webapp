import { BookSearchResponse, SearchParams } from '../types/book';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export class BookService {
  static async searchBooks(params: SearchParams): Promise<BookSearchResponse> {
    const { query, type, limit = 10 } = params;
    
    const searchParams = new URLSearchParams({
      q: query,
      type,
      limit: limit.toString()
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