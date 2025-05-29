const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const googleBooksService = require('../services/googleBooksService');
const bookSearchService = require('../services/bookSearchService');
const bookSuggestionService = require('../services/bookSuggestionService');
const AudiobookService = require('../services/audiobookService');

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
 * GET /api/books/suggestions
 * Get search suggestions for a query
 * Query parameters:
 * - q: search query (required)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || query.trim() === '') {
      return res.json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }

    console.log(`💡 Getting suggestions for: "${query}"`);

    const suggestions = await bookSuggestionService.getEnhancedSuggestions(query);

    console.log(`✨ Found ${suggestions.length} suggestions for: "${query}"`);

    res.json({
      success: true,
      data: {
        query: query,
        suggestions: suggestions
      }
    });

  } catch (error) {
    console.error('❌ Suggestions error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
      message: 'An error occurred while getting suggestions. Please try again.'
    });
  }
});

/**
 * GET /api/books/editions/:workKey
 * Get different editions of a book from Open Library
 * Path parameters:
 * - workKey: Open Library work key (e.g., "OL123456W")
 * Query parameters:
 * - limit: max results (1-50) - default: 20
 */
router.get('/editions/:workKey', async (req, res) => {
  try {
    const { workKey } = req.params;
    const { limit = 20 } = req.query;

    // Validation
    if (!workKey) {
      return res.status(400).json({
        success: false,
        error: 'Work key is required'
      });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

    console.log(`📚 Getting editions for work: ${workKey} (limit: ${parsedLimit})`);

    const result = await bookSearchService.getBookEditions(workKey, parsedLimit);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch editions'
      });
    }

    res.json({
      success: true,
      data: {
        workKey: result.workKey,
        totalEditions: result.totalEditions,
        editions: result.editions,
        message: result.message
      }
    });

  } catch (error) {
    console.error('❌ Editions fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch book editions',
      message: 'An error occurred while fetching book editions. Please try again.'
    });
  }
});

/**
 * GET /api/books/search
 * Search for books using enhanced service with original publication dates
 * Query parameters:
 * - q: search query (required)
 * - type: search type (isbn, title, author, general) - default: general
 * - limit: max results (1-40) - default: 10
 * - includeAudiobooks: whether to enrich with audiobook data (true/false) - default: false
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query, type = 'general', limit = 10, includeAudiobooks = 'false' } = req.query;

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
    
    // Parse includeAudiobooks parameter
    const shouldIncludeAudiobooks = includeAudiobooks === 'true' || includeAudiobooks === true;

    console.log(`📚 Book search request: "${query}" (type: ${type}, limit: ${maxResults}${shouldIncludeAudiobooks ? ', with audiobooks' : ''})`);

    // Search books using enhanced service with original publication dates and optional audiobook data
    const result = await bookSearchService.searchBooks(query, type, maxResults, shouldIncludeAudiobooks);

    // Log search results
    console.log(`✅ Found ${result.books.length} books for query: "${query}"`);
    
    // Log if we found original publication dates
    const booksWithOriginalDates = result.books.filter(book => 
      book.originalPublishedDate && book.originalPublishedDate !== book.publishedDate
    );
    if (booksWithOriginalDates.length > 0) {
      console.log(`📅 Enhanced ${booksWithOriginalDates.length} books with original publication dates`);
    }
    
    // Log audiobook enrichment results
    if (shouldIncludeAudiobooks) {
      const booksWithAudiobooks = result.books.filter(book => 
        book.audiobookData && book.audiobookData.hasAudiobook
      );
      console.log(`🎧 Found audiobook data for ${booksWithAudiobooks.length} books`);
    }

    res.json({
      success: true,
      data: {
        query: query,
        searchType: type,
        totalItems: result.totalItems,
        returnedItems: result.books.length,
        books: result.books,
        source: result.source,
        enhancedWithOriginalDates: booksWithOriginalDates.length,
        includeAudiobooks: shouldIncludeAudiobooks
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
 * Get detailed information about a specific book by Google Books ID with original publication date
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

    console.log(`📖 Fetching enhanced book details for ID: ${id}`);

    const result = await bookSearchService.getBookById(id);

    console.log(`✅ Retrieved enhanced book details: "${result.book.title}"`);
    
    if (result.book.originalPublishedDate && result.book.originalPublishedDate !== result.book.publishedDate) {
      console.log(`📅 Found original publication date: ${result.book.originalPublishedDate} (edition: ${result.book.publishedDate})`);
    }

    res.json({
      success: true,
      data: {
        book: result.book,
        source: result.source
      }
    });

  } catch (error) {
    console.error('❌ Book details error:', error.message);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Book Not Found',
        message: 'The requested book could not be found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to Fetch Book Details',
      message: 'An error occurred while fetching book details. Please try again.'
    });
  }
});

// Search for audiobook matches for user selection
router.get('/audiobook-search/:title/:author', async (req, res) => {
  try {
    const { title, author } = req.params;
    
    console.log(`🔍 API: Searching audiobooks for user selection: "${title}" by ${author}`);
    
    const audiobookService = new AudiobookService();
    const searchResults = await audiobookService.searchAudnexusForUserSelection(title, author);
    
    res.json({
      success: searchResults.success,
      data: searchResults.success ? {
        searchQuery: searchResults.searchQuery,
        results: searchResults.results,
        totalAuthors: searchResults.totalAuthors,
        message: searchResults.message
      } : null,
      error: searchResults.success ? null : searchResults.error,
      suggestion: searchResults.suggestion
    });
    
  } catch (error) {
    console.error('❌ Audiobook search API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search for audiobooks',
      details: error.message
    });
  }
});

// Get audiobook details by ASIN (for user selection)
router.get('/audiobook/:asin', async (req, res) => {
  try {
    const { asin } = req.params;
    const { title, author } = req.query;
    
    console.log(`🎯 API: Getting audiobook by ASIN: ${asin}`);
    
    const audiobookService = new AudiobookService();
    const audiobook = await audiobookService.getSelectedAudiobook(asin, title, author);
    
    if (audiobook) {
      res.json({
        success: true,
        data: audiobook
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Audiobook with ASIN ${asin} not found`
      });
    }
    
  } catch (error) {
    console.error('❌ Get audiobook API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audiobook details',
      details: error.message
    });
  }
});

// Manual ASIN lookup endpoint
router.post('/audiobook/manual-lookup', async (req, res) => {
  try {
    const { asin, title, author } = req.body;
    
    if (!asin) {
      return res.status(400).json({
        success: false,
        error: 'ASIN is required'
      });
    }
    
    console.log(`🎯 API: Manual ASIN lookup: ${asin} for "${title}" by ${author}`);
    
    const audiobookService = new AudiobookService();
    const audiobook = await audiobookService.getSelectedAudiobook(asin, title, author);
    
    if (audiobook) {
      res.json({
        success: true,
        data: audiobook
      });
    } else {
      res.status(404).json({
        success: false,
        error: `No audiobook found with ASIN ${asin}. Please check the ASIN and try again.`
      });
    }
    
  } catch (error) {
    console.error('❌ Manual ASIN lookup API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lookup audiobook by ASIN',
      details: error.message
    });
  }
});

module.exports = router;