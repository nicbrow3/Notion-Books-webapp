const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface BookSuggestion {
  type: string;
  confidence: number;
  originalQuery: string;
  suggestion: string;
  author: string;
  series: string;
  bookNumber: number;
  reason: string;
  searchQuery: string;
  displayText: string;
  metadata: {
    series: string;
    bookNumber: number;
    author: string;
    confidence: number;
  };
}

export interface SuggestionResponse {
  query: string;
  suggestions: BookSuggestion[];
}

export class SuggestionService {
  static async getSuggestions(query: string): Promise<SuggestionResponse> {
    if (!query || query.trim().length < 3) {
      return {
        query,
        suggestions: []
      };
    }

    try {
      const searchParams = new URLSearchParams({
        q: query.trim()
      });

      const response = await fetch(`${API_BASE_URL}/api/books/suggestions?${searchParams}`, {
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
      
      if (result.success && result.data) {
        return {
          query: result.data.query || query,
          suggestions: result.data.suggestions || []
        };
      } else {
        throw new Error(result.message || 'Invalid response format');
      }
    } catch (error) {
      console.error('Suggestion service error:', error);
      return {
        query,
        suggestions: []
      };
    }
  }
} 