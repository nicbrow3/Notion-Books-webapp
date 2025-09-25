const bookSearchService = require('../../services/bookSearchService');
const { ValidationError } = require('../../lib/errors');

/**
 * Search for books using enhanced service
 * @param {Object} params - Request parameters
 * @param {string} params.query - Search query
 * @param {string} params.type - Search type (isbn, title, author, general)
 * @param {number} params.limit - Max results (1-40)
 * @param {boolean|string} params.includeAudiobooks - Whether to include audiobooks
 * @returns {Promise<Object>} Search results
 */
const searchBooks = async ({
  query,
  type = 'general',
  limit = 10,
  includeAudiobooks = false
}) => {
  // Validation
  if (!query || query.trim() === '') {
    throw new ValidationError('Search query is required');
  }

  const validTypes = ['isbn', 'title', 'author', 'subject', 'general'];
  if (!validTypes.includes(type)) {
    throw new ValidationError(
      `Search type must be one of: ${validTypes.join(', ')}`
    );
  }

  // Validate limit
  const maxResults = Math.min(Math.max(parseInt(limit) || 10, 1), 40);

  // Parse includeAudiobooks parameter
  let audiobookOption = false;
  if (includeAudiobooks === 'true' || includeAudiobooks === true) {
    audiobookOption = true;
  } else if (includeAudiobooks === 'top') {
    audiobookOption = 'top';
  }

  console.log(`📚 Book search request: "${query}" (type: ${type}, limit: ${maxResults}${
    audiobookOption ? audiobookOption === 'top' ? ', with audiobook for top result' : ', with audiobooks' : ''
  })`);

  try {
    // Search books using enhanced service
    const result = await bookSearchService.searchBooks(query, type, maxResults, audiobookOption);

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
    if (audiobookOption) {
      const booksWithAudiobooks = result.books.filter(book =>
        book.audiobookData && book.audiobookData.hasAudiobook
      );
      if (audiobookOption === 'top') {
        const topBookHasAudiobook = result.books.length > 0 &&
          result.books[0].audiobookData &&
          result.books[0].audiobookData.hasAudiobook;

        console.log(`🎧 Top result audiobook status: ${topBookHasAudiobook ? 'Found' : 'Not found'}`);
      } else {
        console.log(`🎧 Found audiobook data for ${booksWithAudiobooks.length} books`);
      }
    }

    return {
      success: true,
      data: {
        query: query,
        searchType: type,
        totalItems: result.totalItems,
        returnedItems: result.books.length,
        books: result.books,
        source: result.source,
        enhancedWithOriginalDates: booksWithOriginalDates.length,
        includeAudiobooks: audiobookOption
      }
    };

  } catch (error) {
    console.error('❌ Book search error:', error.message);

    // Handle specific error types
    if (error.message.includes('API key')) {
      throw new ValidationError('Google Books API is not properly configured');
    }

    if (error.message.includes('quota exceeded')) {
      throw new ValidationError('Google Books API quota has been exceeded. Please try again later.');
    }

    if (error.message.includes('timeout')) {
      throw new ValidationError('The search request timed out. Please try again.');
    }

    // Re-throw if it's already a custom error
    if (error.isOperational) {
      throw error;
    }

    throw new Error('An error occurred while searching for books');
  }
};

module.exports = {
  searchBooks
};