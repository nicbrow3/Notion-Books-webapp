const axios = require('axios');

class GoogleBooksService {
  constructor() {
    this.baseURL = 'https://www.googleapis.com/books/v1/volumes';
    this.apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  }

  /**
   * Search for books using Google Books API
   * @param {string} query - Search query (ISBN, title, author, etc.)
   * @param {string} searchType - Type of search (isbn, title, author, general)
   * @param {number} maxResults - Maximum number of results (default: 10)
   * @returns {Promise<Object>} Formatted book data
   */
  async searchBooks(query, searchType = 'general', maxResults = 10) {
    try {
      if (!query || query.trim() === '') {
        throw new Error('Search query is required');
      }

      if (!this.apiKey) {
        throw new Error('Google Books API key is not configured');
      }

      // Format query based on search type
      const formattedQuery = this.formatQuery(query, searchType);
      
      const params = {
        q: formattedQuery,
        maxResults: Math.min(maxResults, 40), // Google Books API limit
        key: this.apiKey,
        printType: 'books',
        projection: 'full'
      };

      console.log(`🔍 Searching Google Books API: ${formattedQuery}`);
      
      const response = await axios.get(this.baseURL, { 
        params,
        timeout: 10000 // 10 second timeout
      });

      if (!response.data || !response.data.items) {
        return {
          success: true,
          totalItems: 0,
          books: [],
          source: 'google_books'
        };
      }

      const books = response.data.items.map(item => this.parseBookData(item));
      
      return {
        success: true,
        totalItems: response.data.totalItems || 0,
        books: books,
        source: 'google_books',
        query: formattedQuery
      };

    } catch (error) {
      console.error('❌ Google Books API Error:', error.message);
      
      if (error.response) {
        // API responded with error status
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;
        
        if (status === 403) {
          throw new Error('Google Books API quota exceeded or invalid API key');
        } else if (status === 400) {
          throw new Error('Invalid search query format');
        } else {
          throw new Error(`Google Books API error: ${message}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Google Books API request timeout');
      } else {
        throw new Error(`Google Books service error: ${error.message}`);
      }
    }
  }

  /**
   * Format search query based on search type
   * @param {string} query - Raw search query
   * @param {string} searchType - Type of search
   * @returns {string} Formatted query
   */
  formatQuery(query, searchType) {
    const cleanQuery = query.trim();
    
    switch (searchType) {
      case 'isbn':
        // Remove any hyphens and spaces from ISBN
        const cleanISBN = cleanQuery.replace(/[-\s]/g, '');
        return `isbn:${cleanISBN}`;
      
      case 'title':
        // For title search, use intitle without quotes for better compatibility
        return `intitle:${cleanQuery}`;
      
      case 'author':
        // For author search, use inauthor without quotes for better compatibility
        return `inauthor:${cleanQuery}`;
      
      case 'subject':
        // For subject search, use subject without quotes for better compatibility
        return `subject:${cleanQuery}`;
      
      case 'general':
      default:
        // For general search, try to detect if it's an ISBN
        const isISBN = /^[\d\-\s]{10,17}$/.test(cleanQuery);
        if (isISBN) {
          const cleanISBN = cleanQuery.replace(/[-\s]/g, '');
          return `isbn:${cleanISBN}`;
        }
        return cleanQuery;
    }
  }

  /**
   * Parse and normalize book data from Google Books API response
   * @param {Object} item - Raw book item from API
   * @returns {Object} Normalized book data
   */
  parseBookData(item) {
    const volumeInfo = item.volumeInfo || {};
    const saleInfo = item.saleInfo || {};
    
    // Extract ISBNs
    const industryIdentifiers = volumeInfo.industryIdentifiers || [];
    const isbn13 = industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier;
    const isbn10 = industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier;
    
    // Extract thumbnail (prefer higher resolution)
    let thumbnail = null;
    if (volumeInfo.imageLinks) {
      thumbnail = volumeInfo.imageLinks.large ||
                 volumeInfo.imageLinks.medium ||
                 volumeInfo.imageLinks.small ||
                 volumeInfo.imageLinks.thumbnail ||
                 volumeInfo.imageLinks.smallThumbnail;
      
      // Convert to HTTPS if needed
      if (thumbnail && thumbnail.startsWith('http:')) {
        thumbnail = thumbnail.replace('http:', 'https:');
      }
    }

    return {
      id: item.id,
      title: volumeInfo.title || 'Unknown Title',
      subtitle: volumeInfo.subtitle || null,
      authors: volumeInfo.authors || [],
      publisher: volumeInfo.publisher || null,
      publishedDate: volumeInfo.publishedDate || null,
      description: volumeInfo.description || null,
      isbn13: isbn13 || null,
      isbn10: isbn10 || null,
      pageCount: volumeInfo.pageCount || null,
      categories: volumeInfo.categories || [],
      averageRating: volumeInfo.averageRating || null,
      ratingsCount: volumeInfo.ratingsCount || null,
      language: volumeInfo.language || null,
      thumbnail: thumbnail,
      previewLink: volumeInfo.previewLink || null,
      infoLink: volumeInfo.infoLink || null,
      buyLink: saleInfo.buyLink || null,
      source: 'google_books',
      rawData: item // Keep original data for debugging
    };
  }

  /**
   * Get book details by Google Books ID
   * @param {string} bookId - Google Books volume ID
   * @returns {Promise<Object>} Book details
   */
  async getBookById(bookId) {
    try {
      if (!bookId) {
        throw new Error('Book ID is required');
      }

      if (!this.apiKey) {
        throw new Error('Google Books API key is not configured');
      }

      const url = `${this.baseURL}/${bookId}`;
      const params = { key: this.apiKey };

      console.log(`📖 Fetching book details: ${bookId}`);

      const response = await axios.get(url, { 
        params,
        timeout: 10000
      });

      if (!response.data) {
        throw new Error('Book not found');
      }

      return {
        success: true,
        book: this.parseBookData(response.data),
        source: 'google_books'
      };

    } catch (error) {
      console.error('❌ Google Books Get Book Error:', error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Book not found');
      }
      
      throw new Error(`Failed to fetch book details: ${error.message}`);
    }
  }
}

module.exports = new GoogleBooksService(); 