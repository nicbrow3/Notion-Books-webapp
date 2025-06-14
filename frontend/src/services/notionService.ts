import { 
  NotionDatabase, 
  NotionPage, 
  CreateNotionPageRequest,
  NotionIntegrationSettings,
  NotionBookSearchResult
} from '../types/notion';
import { API_BASE_URL } from '../utils/api';

export class NotionService {
  /**
   * Setup Notion integration using personal token
   */
  static async setupIntegration(): Promise<{ success: boolean; message: string; user?: any; isFirstTime?: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/setup`, {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.error || `HTTP error! status: ${response.status}`
        };
      }

      return {
        success: true,
        message: result.message || 'Successfully connected to Notion',
        user: result.user,
        isFirstTime: result.isFirstTime
      };
    } catch (error) {
      console.error('Setup integration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to setup Notion integration'
      };
    }
  }

  /**
   * Check if user is authenticated with Notion
   */
  static async checkAuth(): Promise<{ authenticated: boolean; user?: any; autoAuthenticated?: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        return { authenticated: false };
      }

      const result = await response.json();
      return {
        authenticated: result.authenticated || false,
        user: result.user,
        autoAuthenticated: result.autoAuthenticated
      };
    } catch (error) {
      console.error('Auth check error:', error);
      return { authenticated: false };
    }
  }

  /**
   * Logout from Notion
   */
  static async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * Get user's accessible Notion databases
   */
  static async getDatabases(): Promise<NotionDatabase[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notion/databases`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.databases || [];
    } catch (error) {
      console.error('Get databases error:', error);
      throw error;
    }
  }

  /**
   * Get database properties/schema
   */
  static async getDatabaseProperties(databaseId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notion/database/${databaseId}/properties`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get database properties error:', error);
      throw error;
    }
  }

  /**
   * Create a new page in Notion database
   */
  static async createPage(request: CreateNotionPageRequest): Promise<NotionPage> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notion/pages/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          databaseId: request.databaseId,
          bookData: request.bookData,
          fieldMappings: request.fieldMapping
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          throw new Error('Authentication required. Please refresh the page and try again.');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Create page error:', error);
      throw error;
    }
  }

  /**
   * Update an existing Notion page
   */
  static async updatePage(pageId: string, updates: any): Promise<NotionPage> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notion/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Update page error:', error);
      throw error;
    }
  }

  /**
   * Update an existing book page in Notion database
   */
  static async updateBookPage(pageId: string, request: CreateNotionPageRequest): Promise<NotionPage> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notion/pages/${pageId}/book`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          databaseId: request.databaseId,
          bookData: request.bookData,
          fieldMappings: request.fieldMapping
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          throw new Error('Authentication required. Please refresh the page and try again.');
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Update book page error:', error);
      throw error;
    }
  }

  /**
   * Get user's Notion integration settings from localStorage
   */
  static async getSettings(): Promise<NotionIntegrationSettings | null> {
    try {
      const settingsJson = localStorage.getItem('notion-settings');
      if (!settingsJson) {
        return null; // No settings found
      }
      
      const settings = JSON.parse(settingsJson);
      console.log('📱 Loaded settings from localStorage:', settings);
      return settings;
    } catch (error) {
      console.error('Get settings error:', error);
      return null;
    }
  }

  /**
   * Save user's Notion integration settings to localStorage
   */
  static async saveSettings(settings: NotionIntegrationSettings): Promise<void> {
    try {
      const settingsJson = JSON.stringify(settings);
      localStorage.setItem('notion-settings', settingsJson);
      console.log('📱 Saved settings to localStorage:', settings);
    } catch (error) {
      console.error('Save settings error:', error);
      throw error;
    }
  }

  /**
   * Test Notion API connection
   */
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notion/test`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || 'Connection test failed'
        };
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

  /**
   * Search for existing books in Notion database to avoid duplicates
   */
  static async searchExistingBooks(databaseId: string, isbn?: string, title?: string, fieldMappings?: any): Promise<NotionBookSearchResult[]> {
    try {
      const requestBody: any = {};
      if (isbn) requestBody.isbn = isbn;
      if (title) requestBody.title = title;
      if (fieldMappings) requestBody.fieldMappings = fieldMappings;

      const response = await fetch(
        `${API_BASE_URL}/api/notion/database/${databaseId}/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.books || [];
    } catch (error) {
      console.error('Search existing books error:', error);
      throw error;
    }
  }
} 