/**
 * Add audiobook data to book
 * @param {Object} book - Original book data
 * @returns {Promise<Object>} Book with audiobook data
 */
async addAudiobookData(book) {
  try {
    const audiobookService = new AudiobookService();
    
    // Use Audnexus to find audiobook data
    const isbn = book.isbn13 || book.isbn10;
    
    // Skip known problematic ISBNs
    if (this.isProblematicISBN(isbn)) {
      console.log(`⚠️ Skipping known problematic ISBN: ${isbn}`);
      return {
        ...book,
        audiobookData: {
          hasAudiobook: false,
          source: 'skipped',
          reason: 'Known problematic ISBN'
        }
      };
    }
    
    console.log(`🎧 Looking for audiobook data for: "${book.title}" by ${book.authors?.join(', ')}`);
    
    let audiobookData = null;
    try {
      const primaryAuthor = book.authors?.[0];
      audiobookData = await audiobookService.searchAudnexusAudiobook(book.title, primaryAuthor, isbn);
    } catch (audiobookError) {
      console.error('❌ Audiobook search error:', audiobookError.message);
    }
    
    if (audiobookData && audiobookData.hasAudiobook) {
      console.log(`✅ Found audiobook data for "${book.title}"`);
      
      // Merge the data
      const mergedBook = {
        ...book,
        audiobookData: audiobookData
      };
      
      // If book doesn't have copyright but audiobook does, use the audiobook copyright
      if (!mergedBook.copyright && audiobookData.copyright) {
        mergedBook.copyright = audiobookData.copyright;
      }
      
      return mergedBook;
    }
    
    console.log(`📚 No audiobook data found for "${book.title}"`);
    
    return {
      ...book,
      audiobookData: audiobookData || {
        hasAudiobook: false,
        source: 'none'
      }
    };
    
  } catch (error) {
    console.error('❌ Error adding audiobook data:', error.message);
    return {
      ...book,
      audiobookData: {
        hasAudiobook: false,
        source: 'error',
        error: error.message
      }
    };
  }
} 