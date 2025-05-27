const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const googleBooksService = require('../services/googleBooksService');

// Database connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Google Books API service
const searchGoogleBooks = async (query, type = 'general') => {
  try {
    let searchQuery = query;
    
    // Format query based on type
    if (type === 'isbn') {
      searchQuery = `isbn:${query}`;
    } else if (type === 'title') {
      searchQuery = `intitle:${query}`;
    } else if (type === 'author') {
      searchQuery = `inauthor:${query}`;
    }

    const response = await axios.get('https://www.googleapis.com/books/v1/volumes', {
      params: {
        q: searchQuery,
        key: process.env.GOOGLE_BOOKS_API_KEY,
        maxResults: 10
      }
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Google Books API error:', error);
    return [];
  }
};

// Open Library API service (fallback)
const searchOpenLibrary = async (query, type = 'general') => {
  try {
    let endpoint = 'https://openlibrary.org/search.json';
    let params = { limit: 10 };

    if (type === 'isbn') {
      params.isbn = query;
    } else if (type === 'title') {
      params.title = query;
    } else if (type === 'author') {
      params.author = query;
    } else {
      params.q = query;
    }

    const response = await axios.get(endpoint, { params });
    return response.data.docs || [];
  } catch (error) {
    console.error('Open Library API error:', error);
    return [];
  }
};

// Parse Google Books data
const parseGoogleBookData = (item) => {
  const volumeInfo = item.volumeInfo || {};
  return {
    id: item.id,
    title: volumeInfo.title || 'Unknown Title',
    authors: volumeInfo.authors || [],
    description: volumeInfo.description || '',
    categories: volumeInfo.categories || [],
    publishedDate: volumeInfo.publishedDate || '',
    publisher: volumeInfo.publisher || '',
    pageCount: volumeInfo.pageCount || 0,
    isbn13: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier || '',
    isbn10: volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier || '',
    thumbnail: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || '',
    language: volumeInfo.language || 'en',
    source: 'google_books'
  };
};

// Parse Open Library data
const parseOpenLibraryData = (item) => {
  return {
    id: item.key,
    title: item.title || 'Unknown Title',
    authors: item.author_name || [],
    description: item.first_sentence?.[0] || '',
    categories: item.subject || [],
    publishedDate: item.first_publish_year ? item.first_publish_year.toString() : '',
    publisher: item.publisher?.[0] || '',
    pageCount: item.number_of_pages_median || 0,
    isbn13: item.isbn?.[0] || '',
    isbn10: item.isbn?.[0] || '',
    thumbnail: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : '',
    language: item.language?.[0] || 'en',
    source: 'open_library'
  };
};

// Merge book data from multiple sources
const mergeBookData = (googleData, openLibData) => {
  if (!googleData && !openLibData) return null;
  if (!googleData) return openLibData;
  if (!openLibData) return googleData;

  // Merge arrays and remove duplicates
  const mergeArrays = (arr1, arr2) => {
    const combined = [...(arr1 || []), ...(arr2 || [])];
    return [...new Set(combined)];
  };

  return {
    ...googleData, // Use Google Books as primary
    authors: mergeArrays(googleData.authors, openLibData.authors),
    categories: mergeArrays(googleData.categories, openLibData.categories),
    description: googleData.description || openLibData.description || '',
    isbn13: googleData.isbn13 || openLibData.isbn13 || '',
    isbn10: googleData.isbn10 || openLibData.isbn10 || '',
    thumbnail: googleData.thumbnail || openLibData.thumbnail || '',
    publishedDate: googleData.publishedDate || openLibData.publishedDate || '',
    publisher: googleData.publisher || openLibData.publisher || '',
    pageCount: googleData.pageCount || openLibData.pageCount || 0,
    sources: ['google_books', 'open_library']
  };
};

/**
 * GET /api/books/search
 * Search for books using Google Books API
 * Query parameters:
 * - q: search query (required)
 * - type: search type (isbn, title, author, general) - default: general
 * - limit: max results (1-40) - default: 10
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query, type = 'general', limit = 10 } = req.query;

    // Validation
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        message: 'Please provide a search query (q parameter)'
      });
    }

    // Validate search type
    const validTypes = ['isbn', 'title', 'author', 'subject', 'general'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search type',
        message: `Search type must be one of: ${validTypes.join(', ')}`
      });
    }

    // Validate limit
    const maxResults = Math.min(Math.max(parseInt(limit) || 10, 1), 40);

    console.log(`📚 Book search request: "${query}" (type: ${type}, limit: ${maxResults})`);

    // Search books using Google Books API
    const result = await googleBooksService.searchBooks(query, type, maxResults);

    // Log search results
    console.log(`✅ Found ${result.books.length} books for query: "${query}"`);

    res.json({
      success: true,
      data: {
        query: query,
        searchType: type,
        totalItems: result.totalItems,
        returnedItems: result.books.length,
        books: result.books,
        source: result.source
      }
    });

  } catch (error) {
    console.error('❌ Book search error:', error.message);

    // Handle specific error types
    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'API Configuration Error',
        message: 'Google Books API is not properly configured'
      });
    }

    if (error.message.includes('quota exceeded')) {
      return res.status(429).json({
        success: false,
        error: 'API Quota Exceeded',
        message: 'Google Books API quota has been exceeded. Please try again later.'
      });
    }

    if (error.message.includes('timeout')) {
      return res.status(408).json({
        success: false,
        error: 'Request Timeout',
        message: 'The search request timed out. Please try again.'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Search Failed',
      message: 'An error occurred while searching for books. Please try again.'
    });
  }
});

/**
 * GET /api/books/:id
 * Get detailed information about a specific book by Google Books ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Book ID is required',
        message: 'Please provide a valid book ID'
      });
    }

    console.log(`📖 Fetching book details for ID: ${id}`);

    const result = await googleBooksService.getBookById(id);

    console.log(`✅ Retrieved book details: "${result.book.title}"`);

    res.json({
      success: true,
      data: {
        book: result.book,
        source: result.source
      }
    });

  } catch (error) {
    console.error('❌ Get book error:', error.message);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Book Not Found',
        message: 'The requested book could not be found'
      });
    }

    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        error: 'API Configuration Error',
        message: 'Google Books API is not properly configured'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to Retrieve Book',
      message: 'An error occurred while fetching book details. Please try again.'
    });
  }
});

/**
 * GET /api/books/test/connection
 * Test endpoint to verify Google Books API connectivity
 */
router.get('/test/connection', async (req, res) => {
  try {
    // Test with a simple search
    const result = await googleBooksService.searchBooks('test', 'general', 1);
    
    res.json({
      success: true,
      message: 'Google Books API connection successful',
      data: {
        apiConfigured: !!process.env.GOOGLE_BOOKS_API_KEY,
        testSearchResults: result.books.length,
        source: result.source
      }
    });

  } catch (error) {
    console.error('❌ API connection test failed:', error.message);

    res.status(500).json({
      success: false,
      error: 'API Connection Failed',
      message: error.message,
      data: {
        apiConfigured: !!process.env.GOOGLE_BOOKS_API_KEY
      }
    });
  }
});

/**
 * GET /api/books/debug/env
 * Debug endpoint to check environment variables (for development only)
 */
router.get('/debug/env', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Debug endpoint not available in production' });
  }

  res.json({
    nodeEnv: process.env.NODE_ENV,
    hasGoogleBooksApiKey: !!process.env.GOOGLE_BOOKS_API_KEY,
    googleBooksApiKeyLength: process.env.GOOGLE_BOOKS_API_KEY ? process.env.GOOGLE_BOOKS_API_KEY.length : 0,
    googleBooksApiKeyPrefix: process.env.GOOGLE_BOOKS_API_KEY ? process.env.GOOGLE_BOOKS_API_KEY.substring(0, 10) + '...' : 'not set'
  });
});

// Create book editing session
router.post('/session', requireAuth, async (req, res) => {
  try {
    const { bookData } = req.body;

    if (!bookData) {
      return res.status(400).json({ error: 'Book data is required' });
    }

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const query = `
      INSERT INTO book_sessions (user_id, session_id, book_data, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING session_id, created_at;
    `;

    const result = await pool.query(query, [
      req.session.userId,
      sessionId,
      JSON.stringify(bookData),
      expiresAt
    ]);

    res.json({
      sessionId: result.rows[0].session_id,
      createdAt: result.rows[0].created_at,
      expiresAt
    });

  } catch (error) {
    console.error('Error creating book session:', error);
    res.status(500).json({ error: 'Failed to create book session' });
  }
});

// Get book session data
router.get('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const query = `
      SELECT session_id, book_data, approved, created_at, expires_at
      FROM book_sessions 
      WHERE session_id = $1 AND user_id = $2 AND expires_at > CURRENT_TIMESTAMP;
    `;

    const result = await pool.query(query, [sessionId, req.session.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error getting book session:', error);
    res.status(500).json({ error: 'Failed to get book session' });
  }
});

// Update book session data
router.put('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { bookData } = req.body;

    if (!bookData) {
      return res.status(400).json({ error: 'Book data is required' });
    }

    const query = `
      UPDATE book_sessions 
      SET book_data = $1, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = $2 AND user_id = $3 AND expires_at > CURRENT_TIMESTAMP
      RETURNING session_id, book_data, updated_at;
    `;

    const result = await pool.query(query, [
      JSON.stringify(bookData),
      sessionId,
      req.session.userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error updating book session:', error);
    res.status(500).json({ error: 'Failed to update book session' });
  }
});

// Delete book session
router.delete('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const query = `
      DELETE FROM book_sessions 
      WHERE session_id = $1 AND user_id = $2
      RETURNING session_id;
    `;

    const result = await pool.query(query, [sessionId, req.session.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, sessionId: result.rows[0].session_id });

  } catch (error) {
    console.error('Error deleting book session:', error);
    res.status(500).json({ error: 'Failed to delete book session' });
  }
});

module.exports = router; 