const axios = require('axios');
const googleBooksService = require('./googleBooksService');

class BookSearchService {
  constructor() {
    this.openLibraryBaseURL = 'https://openlibrary.org/search.json';
    this.openLibraryWorksURL = 'https://openlibrary.org/works';
  }

  /**
   * Search for books using Google Books API with Open Library fallback and merging
   * @param {string} query - Search query
   * @param {string} searchType - Type of search (isbn, title, author, general)
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Object>} Enhanced book data with merged results from both APIs
   */
  async searchBooks(query, searchType = 'general', maxResults = 10) {
    try {
      console.log(`🔍 Starting enhanced search for: "${query}" (type: ${searchType})`);
      
      // Search both APIs in parallel
      const [googleResult, openLibraryResult] = await Promise.all([
        googleBooksService.searchBooks(query, searchType, maxResults).catch(err => {
          console.warn('⚠️ Google Books search failed:', err.message);
          return { success: false, books: [], totalItems: 0, source: 'google_books' };
        }),
        this.searchOpenLibraryDirect(query, searchType, maxResults).catch(err => {
          console.warn('⚠️ Open Library search failed:', err.message);
          return { success: false, books: [], totalItems: 0, source: 'open_library' };
        })
      ]);

      console.log(`📊 Google Books found: ${googleResult.books?.length || 0} results`);
      console.log(`📊 Open Library found: ${openLibraryResult.books?.length || 0} results`);

      // If Google Books has good results, enhance them with Open Library data
      if (googleResult.success && googleResult.books.length > 0) {
        const enhancedGoogleBooks = await Promise.all(
          googleResult.books.map(book => this.enhanceBookWithOpenLibraryData(book))
        );

        // If Open Library also has results, merge and deduplicate
        if (openLibraryResult.success && openLibraryResult.books.length > 0) {
          const mergedBooks = this.mergeAndRankResults(enhancedGoogleBooks, openLibraryResult.books, query);
          
          return {
            success: true,
            totalItems: Math.max(googleResult.totalItems || 0, openLibraryResult.totalItems || 0),
            books: mergedBooks.slice(0, maxResults),
            source: 'merged_apis',
            sources: ['google_books', 'open_library']
          };
        }

        return {
          ...googleResult,
          books: enhancedGoogleBooks,
          source: 'google_books_enhanced'
        };
      }

      // If Google Books failed but Open Library has results, use Open Library
      if (openLibraryResult.success && openLibraryResult.books.length > 0) {
        console.log('📚 Using Open Library as primary source');
        return {
          ...openLibraryResult,
          source: 'open_library_primary'
        };
      }

      // Both failed
      return {
        success: true,
        totalItems: 0,
        books: [],
        source: 'no_results',
        message: 'No results found from either Google Books or Open Library'
      };

    } catch (error) {
      console.error('❌ Enhanced Book Search Service Error:', error.message);
      throw error;
    }
  }

  /**
   * Search Open Library directly and parse results
   * @param {string} query - Search query
   * @param {string} searchType - Type of search
   * @param {number} maxResults - Maximum number of results
   * @returns {Promise<Object>} Open Library search results
   */
  async searchOpenLibraryDirect(query, searchType = 'general', maxResults = 10) {
    try {
      let params = { 
        limit: Math.min(maxResults * 2, 20), // Get more results to filter better matches
        fields: 'key,title,author_name,first_publish_year,edition_count,subject,isbn,number_of_pages_median,publisher,cover_i,language'
      };

             // Format query based on search type
       if (searchType === 'isbn') {
         params.isbn = query;
       } else if (searchType === 'title') {
         params.title = query;
       } else if (searchType === 'author') {
         params.author = query;
       } else {
         // For general searches, try to improve query for better results
         let searchQuery = query;
         
         // Special handling for Harry Potter queries
         if (query.toLowerCase().includes('harry potter')) {
           // Try to extract book number or subtitle
           const numberMatch = query.match(/(\d+)/);
           if (numberMatch) {
             const bookNumber = parseInt(numberMatch[1]);
             const harryPotterTitles = {
               1: 'Harry Potter and the Philosopher\'s Stone',
               2: 'Harry Potter and the Chamber of Secrets',
               3: 'Harry Potter and the Prisoner of Azkaban',
               4: 'Harry Potter and the Goblet of Fire',
               5: 'Harry Potter and the Order of the Phoenix',
               6: 'Harry Potter and the Half-Blood Prince',
               7: 'Harry Potter and the Deathly Hallows'
             };
             
             if (harryPotterTitles[bookNumber]) {
               searchQuery = harryPotterTitles[bookNumber];
               params.title = searchQuery;
               params.author = 'J.K. Rowling';
               console.log(`🪄 Enhanced Harry Potter search: "${searchQuery}"`);
             } else {
               params.q = searchQuery;
             }
           } else {
             params.q = searchQuery;
           }
         } else {
           params.q = searchQuery;
         }
       }

      console.log(`🔍 Searching Open Library directly: ${JSON.stringify(params)}`);

      const response = await axios.get(this.openLibraryBaseURL, {
        params,
        timeout: 8000
      });

      if (!response.data?.docs?.length) {
        return {
          success: true,
          totalItems: 0,
          books: [],
          source: 'open_library'
        };
      }

      // Parse and filter results
      const books = response.data.docs
        .map(doc => this.parseOpenLibraryData(doc))
        .filter(book => book.title && book.title !== 'Unknown Title')
        .slice(0, maxResults);

      return {
        success: true,
        totalItems: response.data.numFound || books.length,
        books: books,
        source: 'open_library'
      };

    } catch (error) {
      console.error('❌ Open Library direct search error:', error.message);
      throw error;
    }
  }

  /**
   * Parse Open Library document into standardized book format
   * @param {Object} doc - Open Library document
   * @returns {Object} Standardized book data
   */
  parseOpenLibraryData(doc) {
    // Get the best cover image
    let thumbnail = null;
    if (doc.cover_i) {
      thumbnail = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    }

    // Extract ISBNs
    const isbns = doc.isbn || [];
    const isbn13 = isbns.find(isbn => isbn.length === 13);
    const isbn10 = isbns.find(isbn => isbn.length === 10);

    return {
      id: doc.key,
      title: doc.title || 'Unknown Title',
      subtitle: null,
      authors: doc.author_name || [],
      publisher: doc.publisher?.[0] || null,
      publishedDate: doc.first_publish_year ? doc.first_publish_year.toString() : null,
      originalPublishedDate: doc.first_publish_year ? doc.first_publish_year.toString() : null,
      editionPublishedDate: doc.first_publish_year ? doc.first_publish_year.toString() : null,
      description: null, // Open Library search doesn't include descriptions
      isbn13: isbn13 || null,
      isbn10: isbn10 || null,
      pageCount: doc.number_of_pages_median || null,
      categories: this.splitAndCleanCategories(doc.subject?.slice(0, 10) || []),
      averageRating: null,
      ratingsCount: null,
      language: doc.language?.[0] || 'en',
      thumbnail: thumbnail,
      previewLink: null,
      infoLink: doc.key ? `https://openlibrary.org${doc.key}` : null,
      buyLink: null,
      source: 'open_library',
      openLibraryKey: doc.key,
      openLibraryData: {
        editionCount: doc.edition_count,
        firstPublishYear: doc.first_publish_year,
        subjects: doc.subject?.slice(0, 10) || []
      },
      rawData: doc
    };
  }

  /**
   * Merge and rank results from both APIs
   * @param {Array} googleBooks - Books from Google Books (already enhanced)
   * @param {Array} openLibraryBooks - Books from Open Library
   * @param {string} query - Original search query
   * @returns {Array} Merged and ranked book results
   */
  mergeAndRankResults(googleBooks, openLibraryBooks, query) {
    const mergedBooks = [];
    const seenTitles = new Set();

    // Helper function to calculate relevance score
    const calculateRelevanceScore = (book, query) => {
      let score = 0;
      const queryLower = query.toLowerCase();
      const titleLower = book.title.toLowerCase();
      
      // Exact title match gets highest score
      if (titleLower === queryLower) score += 100;
      else if (titleLower.includes(queryLower)) score += 50;
      else if (queryLower.includes(titleLower)) score += 30;
      
      // Author match
      if (book.authors.some(author => author.toLowerCase().includes(queryLower))) score += 20;
      
      // Has page count (important for books)
      if (book.pageCount && book.pageCount > 0) score += 10;
      
      // Has original publication date
      if (book.originalPublishedDate && book.originalPublishedDate !== book.publishedDate) score += 5;
      
      // Has cover image
      if (book.thumbnail) score += 5;
      
      // Prefer books with ISBNs
      if (book.isbn13 || book.isbn10) score += 5;
      
      // Penalize very old or very new publication dates for popular queries
      if (book.originalPublishedDate) {
        const year = parseInt(book.originalPublishedDate);
        if (year > 1800 && year < 2025) score += 3;
      }

      return score;
    };

    // Helper function to create a normalized title for deduplication
    const normalizeForDedup = (title) => {
      return title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Add Google Books results first (they usually have better metadata)
    for (const book of googleBooks) {
      const normalizedTitle = normalizeForDedup(book.title);
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        mergedBooks.push({
          ...book,
          relevanceScore: calculateRelevanceScore(book, query),
          primarySource: 'google_books'
        });
      }
    }

    // Add Open Library results that aren't duplicates
    for (const book of openLibraryBooks) {
      const normalizedTitle = normalizeForDedup(book.title);
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        mergedBooks.push({
          ...book,
          relevanceScore: calculateRelevanceScore(book, query),
          primarySource: 'open_library'
        });
      } else {
        // If we have a duplicate, merge the data to get the best of both
        const existingIndex = mergedBooks.findIndex(existing => 
          normalizeForDedup(existing.title) === normalizedTitle
        );
        
        if (existingIndex !== -1) {
          const existing = mergedBooks[existingIndex];
          mergedBooks[existingIndex] = this.mergeDuplicateBooks(existing, book);
        }
      }
    }

    // Sort by relevance score (highest first)
    return mergedBooks.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Merge data from duplicate books found in both APIs
   * @param {Object} primaryBook - Book from primary source (usually Google Books)
   * @param {Object} secondaryBook - Book from secondary source
   * @returns {Object} Merged book data
   */
  mergeDuplicateBooks(primaryBook, secondaryBook) {
    // Merge categories more intelligently
    const primaryCategories = this.splitAndCleanCategories(primaryBook.categories || []);
    const secondaryCategories = this.splitAndCleanCategories(secondaryBook.categories || []);
    
    // Merge and deduplicate categories
    const mergedCategories = [...new Set([
      ...primaryCategories,
      ...secondaryCategories
    ])];

    console.log(`🔗 Merged categories for "${primaryBook.title}": ${mergedCategories.length} total categories`);

    return {
      ...primaryBook,
      // Use the best available data from either source
      pageCount: primaryBook.pageCount || secondaryBook.pageCount,
      originalPublishedDate: primaryBook.originalPublishedDate || secondaryBook.originalPublishedDate,
      publisher: primaryBook.publisher || secondaryBook.publisher,
      isbn13: primaryBook.isbn13 || secondaryBook.isbn13,
      isbn10: primaryBook.isbn10 || secondaryBook.isbn10,
      thumbnail: primaryBook.thumbnail || secondaryBook.thumbnail,
      categories: mergedCategories,
      // Merge Open Library data
      openLibraryData: {
        ...primaryBook.openLibraryData,
        ...secondaryBook.openLibraryData,
        subjects: this.splitAndCleanCategories([
          ...(primaryBook.openLibraryData?.subjects || []),
          ...(secondaryBook.openLibraryData?.subjects || [])
        ]),
        rawSubjects: [...new Set([
          ...(primaryBook.openLibraryData?.rawSubjects || []),
          ...(secondaryBook.openLibraryData?.rawSubjects || [])
        ])]
      },
      sources: [...new Set([
        ...(primaryBook.sources || [primaryBook.source]),
        ...(secondaryBook.sources || [secondaryBook.source])
      ])]
    };
  }

  /**
   * Enhance Google Books data with Open Library information
   * @param {Object} book - Book data from Google Books
   * @returns {Promise<Object>} Enhanced book data
   */
  async enhanceBookWithOpenLibraryData(book) {
    try {
      // Try to find the book in Open Library using ISBN or title
      const openLibraryData = await this.searchOpenLibrary(book);
      
      if (openLibraryData && openLibraryData.first_publish_year) {
        // Merge categories from both sources
        const googleCategories = this.splitAndCleanCategories(book.categories || []);
        const openLibrarySubjects = this.splitAndCleanCategories(openLibraryData.subject?.slice(0, 12) || []);
        
        // Merge and deduplicate categories
        const mergedCategories = [...new Set([
          ...googleCategories,
          ...openLibrarySubjects
        ])];

        console.log(`📚 Enhanced "${book.title}" with ${openLibrarySubjects.length} Open Library subjects`);

        return {
          ...book,
          originalPublishedDate: openLibraryData.first_publish_year.toString(),
          // Keep the Google Books published date as the edition date
          editionPublishedDate: book.publishedDate,
          // Merge categories from both sources
          categories: mergedCategories,
          // Add additional Open Library data if available
          openLibraryKey: openLibraryData.key,
          openLibraryData: {
            editionCount: openLibraryData.edition_count,
            firstPublishYear: openLibraryData.first_publish_year,
            subjects: openLibrarySubjects,
            rawSubjects: openLibraryData.subject?.slice(0, 10) || [] // Keep raw for debugging
          }
        };
      }

      // If no Open Library data found, return original book
      return {
        ...book,
        originalPublishedDate: book.publishedDate, // Fallback to Google Books date
        editionPublishedDate: book.publishedDate
      };

    } catch (error) {
      console.warn(`⚠️ Failed to enhance book "${book.title}" with Open Library data:`, error.message);
      // Return original book if enhancement fails
      return {
        ...book,
        originalPublishedDate: book.publishedDate,
        editionPublishedDate: book.publishedDate
      };
    }
  }

  /**
   * Search Open Library for a book to get original publication date
   * @param {Object} book - Book data from Google Books
   * @returns {Promise<Object|null>} Open Library book data or null
   */
  async searchOpenLibrary(book) {
    try {
      let bestResult = null;
      let earliestYear = null;

      // Try title and author search first (more likely to find the original work)
      if (book.title && book.authors && book.authors.length > 0) {
        const titleAuthorParams = {
          title: book.title,
          author: book.authors[0],
          limit: 10, // Get more results to find the earliest
          fields: 'key,title,author_name,first_publish_year,edition_count,subject,isbn'
        };

        const titleResponse = await axios.get(this.openLibraryBaseURL, {
          params: titleAuthorParams,
          timeout: 5000
        });

        if (titleResponse.data?.docs?.length > 0) {
          // Find the match with the earliest publication year
          for (const doc of titleResponse.data.docs) {
            const isMatch = this.isLikelyMatch(book, doc);
            if (isMatch && doc.first_publish_year) {
              if (!earliestYear || doc.first_publish_year < earliestYear) {
                earliestYear = doc.first_publish_year;
                bestResult = doc;
              }
            }
          }
          
          if (bestResult) {
            console.log(`📅 Found original publication date via title/author: ${bestResult.first_publish_year} for "${book.title}"`);
            return bestResult;
          }
        }
      }

      // Try ISBN search as fallback (might find specific edition)
      if (book.isbn13 || book.isbn10) {
        const isbn = book.isbn13 || book.isbn10;
        
        const isbnSearchParams = {
          isbn: isbn,
          limit: 5,
          fields: 'key,title,author_name,first_publish_year,edition_count,subject,isbn'
        };

        const isbnResponse = await axios.get(this.openLibraryBaseURL, {
          params: isbnSearchParams,
          timeout: 5000
        });

        if (isbnResponse.data?.docs?.length > 0) {
          // Find the match with the earliest publication year
          for (const doc of isbnResponse.data.docs) {
            const isMatch = this.isLikelyMatch(book, doc);
            if (isMatch && doc.first_publish_year) {
              if (!earliestYear || doc.first_publish_year < earliestYear) {
                earliestYear = doc.first_publish_year;
                bestResult = doc;
              }
            }
          }
          
          if (bestResult) {
            console.log(`📅 Found original publication date via ISBN: ${bestResult.first_publish_year} for "${book.title}"`);
            return bestResult;
          }
        }
      }

      return null;

    } catch (error) {
      console.warn('⚠️ Open Library search failed:', error.message);
      return null;
    }
  }

  /**
   * Check if Open Library result is likely the same book as Google Books result
   * @param {Object} googleBook - Book from Google Books
   * @param {Object} openLibraryDoc - Document from Open Library
   * @returns {boolean} True if likely the same book
   */
  isLikelyMatch(googleBook, openLibraryDoc) {
    // If we searched by ISBN, it's very likely a match
    if (googleBook.isbn13 || googleBook.isbn10) {
      return true;
    }

    // For title/author searches, do similarity check
    const googleTitle = googleBook.title?.toLowerCase().trim() || '';
    const olTitle = openLibraryDoc.title?.toLowerCase().trim() || '';
    
    // Normalize titles for better matching
    const normalizeTitle = (title) => {
      return title
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
    };

    const normalizedGoogleTitle = normalizeTitle(googleTitle);
    const normalizedOLTitle = normalizeTitle(olTitle);
    
    // Check various title matching strategies
    const exactMatch = normalizedGoogleTitle === normalizedOLTitle;
    const containsMatch = normalizedGoogleTitle.includes(normalizedOLTitle) || 
                         normalizedOLTitle.includes(normalizedGoogleTitle);
    
    // For Harry Potter specifically, handle "Sorcerer's" vs "Philosopher's" variation
    const isHarryPotter = normalizedGoogleTitle.includes('harry potter') && 
                         normalizedOLTitle.includes('harry potter');
    
    const titleMatch = exactMatch || containsMatch || 
                      (isHarryPotter && (
                        (normalizedGoogleTitle.includes('sorcerer') && normalizedOLTitle.includes('philosopher')) ||
                        (normalizedGoogleTitle.includes('philosopher') && normalizedOLTitle.includes('sorcerer'))
                      ));

    // Check if at least one author matches
    const googleAuthors = googleBook.authors?.map(a => a.toLowerCase().trim()) || [];
    const olAuthors = openLibraryDoc.author_name?.map(a => a.toLowerCase().trim()) || [];
    
    // More flexible author matching
    const authorMatch = googleAuthors.length === 0 || olAuthors.length === 0 || 
                       googleAuthors.some(ga => 
                         olAuthors.some(ola => {
                           // Check if names contain each other (handles "J.K. Rowling" vs "J. K. Rowling")
                           const gaWords = ga.split(/\s+/);
                           const olaWords = ola.split(/\s+/);
                           
                           // Check if last names match
                           const gaLastName = gaWords[gaWords.length - 1];
                           const olaLastName = olaWords[olaWords.length - 1];
                           
                           return gaLastName === olaLastName || 
                                  ga.includes(ola) || 
                                  ola.includes(ga) ||
                                  gaWords.some(word => olaWords.includes(word));
                         })
                       );

    const finalMatch = titleMatch && authorMatch;

    return finalMatch;
  }

  /**
   * Get book details by Google Books ID with Open Library enhancement
   * @param {string} bookId - Google Books volume ID
   * @returns {Promise<Object>} Enhanced book details
   */
  async getBookById(bookId) {
    try {
      const googleResult = await googleBooksService.getBookById(bookId);
      
      if (!googleResult.success) {
        return googleResult;
      }

      const enhancedBook = await this.enhanceBookWithOpenLibraryData(googleResult.book);

      return {
        ...googleResult,
        book: enhancedBook
      };

    } catch (error) {
      console.error('❌ Enhanced Book Get Error:', error.message);
      throw error;
    }
  }

  /**
   * Get different editions of a book from Open Library
   * @param {string} openLibraryKey - Open Library work key (e.g., "/works/OL123456W")
   * @param {number} limit - Maximum number of editions to return
   * @returns {Promise<Object>} Different editions of the book
   */
  async getBookEditions(openLibraryKey, limit = 20) {
    try {
      if (!openLibraryKey) {
        throw new Error('Open Library key is required');
      }

      // Clean the key to ensure it's in the right format
      const workKey = openLibraryKey.startsWith('/works/') ? openLibraryKey : `/works/${openLibraryKey}`;
      
      console.log(`📚 Fetching editions for Open Library work: ${workKey}`);

      // Get editions from Open Library
      const editionsUrl = `https://openlibrary.org${workKey}/editions.json`;
      const response = await axios.get(editionsUrl, {
        params: {
          limit: limit,
          offset: 0
        },
        timeout: 8000
      });

      if (!response.data?.entries?.length) {
        return {
          success: true,
          totalEditions: 0,
          editions: [],
          message: 'No editions found'
        };
      }

      // Parse and format editions
      const editions = response.data.entries
        .map(edition => this.parseOpenLibraryEdition(edition))
        .filter(edition => edition.title) // Filter out invalid entries
        .sort((a, b) => {
          // Sort by publication date (newest first)
          const yearA = parseInt(a.publishedDate) || 0;
          const yearB = parseInt(b.publishedDate) || 0;
          return yearB - yearA;
        });

      console.log(`📖 Found ${editions.length} editions for ${workKey}`);

      return {
        success: true,
        totalEditions: response.data.size || editions.length,
        editions: editions,
        workKey: workKey
      };

    } catch (error) {
      console.error('❌ Error fetching book editions:', error.message);
      return {
        success: false,
        error: error.message,
        totalEditions: 0,
        editions: []
      };
    }
  }

  /**
   * Parse Open Library edition data into standardized format
   * @param {Object} edition - Raw edition data from Open Library
   * @returns {Object} Standardized edition data
   */
  parseOpenLibraryEdition(edition) {
    // Get cover image
    let thumbnail = null;
    if (edition.covers && edition.covers.length > 0) {
      thumbnail = `https://covers.openlibrary.org/b/id/${edition.covers[0]}-L.jpg`;
    }

    // Extract ISBNs
    const isbn13List = edition.isbn_13 || [];
    const isbn10List = edition.isbn_10 || [];
    const isbn13 = isbn13List[0] || null;
    const isbn10 = isbn10List[0] || null;

    // Get publication date
    let publishedDate = null;
    if (edition.publish_date) {
      // Try to extract year from various date formats
      const yearMatch = edition.publish_date.match(/\d{4}/);
      publishedDate = yearMatch ? yearMatch[0] : edition.publish_date;
    }

    // Get publishers
    const publishers = edition.publishers || [];
    const publisher = publishers[0] || null;

    // Get page count
    const pageCount = edition.number_of_pages || null;

    // Extract subjects/categories from edition if available
    const subjects = edition.subjects || [];
    const categories = this.splitAndCleanCategories(subjects.slice(0, 15)); // Limit to 15 subjects and split them

    return {
      id: edition.key,
      title: edition.title || 'Unknown Title',
      subtitle: edition.subtitle || null,
      authors: edition.authors?.map(author => author.name || 'Unknown Author') || [],
      publisher: publisher,
      publishedDate: publishedDate,
      isbn13: isbn13,
      isbn10: isbn10,
      pageCount: pageCount,
      language: edition.languages?.[0]?.key?.replace('/languages/', '') || 'en',
      thumbnail: thumbnail,
      format: edition.physical_format || null,
      dimensions: edition.physical_dimensions || null,
      weight: edition.weight || null,
      description: edition.description?.value || edition.description || null,
      categories: categories, // Add categories from edition
      infoLink: `https://openlibrary.org${edition.key}`,
      source: 'open_library_edition',
      openLibraryKey: edition.key,
      rawData: edition
    };
  }

  /**
   * Split comma-separated categories and clean them up
   * @param {Array} categories - Array of category strings
   * @returns {Array} Array of cleaned, split categories
   */
  splitAndCleanCategories(categories) {
    if (!categories || !Array.isArray(categories)) return [];
    
    const split = [];
    categories.forEach(category => {
      if (typeof category === 'string' && category.includes(',')) {
        // Split by comma and clean each part
        const parts = category.split(',')
          .map(part => part.trim())
          .filter(part => part.length > 0 && part.length < 50);
        split.push(...parts);
      } else if (typeof category === 'string' && category.trim().length > 0) {
        split.push(category.trim());
      }
    });
    
    // Remove duplicates and filter out unwanted categories
    return [...new Set(split)]
      .filter(category => {
        const categoryLower = category.toLowerCase();
        return !categoryLower.includes('accessible book') &&
               !categoryLower.includes('protected daisy') &&
               !categoryLower.includes('in library') &&
               !categoryLower.includes('lending library') &&
               category.length > 2 && 
               category.length < 50;
      });
  }
}

module.exports = new BookSearchService(); 