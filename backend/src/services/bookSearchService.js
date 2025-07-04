const axios = require('axios');
const googleBooksService = require('./googleBooksService');
const AudiobookService = require('./audiobookService');

class BookSearchService {
  constructor() {
    this.openLibraryBaseURL = 'https://openlibrary.org/search.json';
    this.openLibraryWorksURL = 'https://openlibrary.org/works';
    this.audiobookService = new AudiobookService();
  }

  /**
   * Search for books using Google Books API with Open Library fallback and merging
   * @param {string} query - Search query
   * @param {string} searchType - Type of search (isbn, title, author, general)
   * @param {number} maxResults - Maximum number of results
   * @param {boolean|string} includeAudiobooks - Whether to enrich results with audiobook data 
   *                                           - Can be boolean or string 'top' to only enrich top result
   * @returns {Promise<Object>} Enhanced book data with merged results from both APIs
   */
  async searchBooks(query, searchType = 'general', maxResults = 10, includeAudiobooks = false) {
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

      let finalBooks = [];

      // If Google Books has good results, enhance them with Open Library data
      if (googleResult.success && googleResult.books.length > 0) {
        const enhancedGoogleBooks = await Promise.all(
          googleResult.books.map(book => this.enhanceBookWithOpenLibraryData(book))
        );

        // If Open Library also has results, merge and deduplicate
        if (openLibraryResult.success && openLibraryResult.books.length > 0) {
          finalBooks = this.mergeAndRankResults(enhancedGoogleBooks, openLibraryResult.books, query);
        } else {
          finalBooks = enhancedGoogleBooks;
        }
      } else if (openLibraryResult.success && openLibraryResult.books.length > 0) {
        // If Google Books failed but Open Library has results, use Open Library
        console.log('📚 Using Open Library as primary source');
        finalBooks = openLibraryResult.books;
      }

      // Enrich with audiobook data if requested
      if (includeAudiobooks && finalBooks.length > 0) {
        // Determine audiobook loading strategy
        const audiobookStrategy = includeAudiobooks === 'top' ? 'top_only' : 'all';
        console.log(`🎧 Enriching results with audiobook data (strategy: ${audiobookStrategy})...`);
        
        if (audiobookStrategy === 'top_only' && finalBooks.length > 0) {
          // Only enrich the top result
          console.log(`🎧 Loading audiobook data for top result only: "${finalBooks[0].title}"`);
          
          // Add Google audiobook hints
          const topBookWithHints = await this.enhanceWithGoogleAudiobookHints(finalBooks[0]);
          
          // Then enrich with Audnexus data
          const topBookWithAudiobook = await this.audiobookService.enrichWithAudiobookData(topBookWithHints);
          
          // Replace top book with enriched version
          finalBooks[0] = topBookWithAudiobook;
          
          const hasAudiobook = topBookWithAudiobook.audiobookData?.hasAudiobook || false;
          console.log(`🎧 Top result audiobook data loaded (hasAudiobook: ${hasAudiobook})`);
        } else {
          // Enrich all results
          // First, add Google audiobook hints
          const booksWithGoogleHints = await Promise.all(
            finalBooks.map(book => this.enhanceWithGoogleAudiobookHints(book))
          );
          
          // Then enrich with Audnexus data
          finalBooks = await Promise.all(
            booksWithGoogleHints.map(book => this.audiobookService.enrichWithAudiobookData(book))
          );
          
          // Count how many books have audiobook data
          const audiobookCount = finalBooks.filter(book => 
            book.audiobookData?.hasAudiobook || book.googleAudiobookHints
          ).length;
          
          console.log(`🎧 Found audiobook data for ${audiobookCount} books`);
        }
      }

      // Determine source
      let source = 'no_results';
      if (finalBooks.length > 0) {
        if (googleResult.success && openLibraryResult.success) {
          source = 'merged_apis';
        } else if (googleResult.success) {
          source = 'google_books_enhanced';
        } else {
          source = 'open_library_primary';
        }
      }

      return {
        success: true,
        totalItems: Math.max(googleResult.totalItems || 0, openLibraryResult.totalItems || 0),
        books: finalBooks.slice(0, maxResults),
        source: source,
        sources: googleResult.success && openLibraryResult.success ? ['google_books', 'open_library'] : undefined,
        message: finalBooks.length === 0 ? 'No results found from either Google Books or Open Library' : undefined
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
      categories: this.splitAndCleanCategories(doc.subject?.slice(0, 10) || [], true),
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
    const primaryCategories = this.splitAndCleanCategories(primaryBook.categories || [], true); // Skip splitting initially
    const secondaryCategories = this.splitAndCleanCategories(secondaryBook.categories || [], true); // Skip splitting initially
    
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
        ], true), // Skip splitting initially
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
   * Enhance Google Books data with Open Library data
   * @param {Object} book - Book object from Google Books
   * @returns {Promise<Object>} Enhanced book
   */
  async enhanceBookWithOpenLibraryData(book) {
    try {
      console.log(`📚 Enhancing book with Open Library data: "${book.title}"`);
      
      const openLibraryBook = await this.searchOpenLibrary(book);
      
      if (!openLibraryBook) {
        console.log(`📚 No Open Library data found for "${book.title}"`);
        return book;
      }
      
      console.log(`📚 Found Open Library data for "${book.title}"`);
      
      // Create enhanced book object with OL data
      const enhancedBook = {
        ...book,
        openLibraryKey: openLibraryBook.key || null,
        openLibraryData: {
          editionCount: openLibraryBook.edition_count,
          firstPublishYear: openLibraryBook.first_publish_year,
          subjects: this.splitAndCleanCategories(openLibraryBook.subject || []),
          rawSubjects: openLibraryBook.subject || []
        },
        originalPublishedDate: openLibraryBook.first_publish_year ? openLibraryBook.first_publish_year.toString() : null
      };
      
      // If OpenLibrary has copyright data, use it if Google Books doesn't have it
      if (openLibraryBook.copyright_date && !enhancedBook.copyright) {
        enhancedBook.copyright = `©${openLibraryBook.copyright_date}`;
      }
      
      // Merge categories/subjects (prefer Google's but add missing ones from OL)
      const googleCategories = new Set(book.categories || []);
      const olSubjects = this.splitAndCleanCategories(openLibraryBook.subject || [], true);
      
      // Add OL subjects that aren't already in Google categories
      for (const subject of olSubjects) {
        // Check if this subject or a similar one is already in Google categories
        const isDuplicate = Array.from(googleCategories).some(
          category => category.toLowerCase().includes(subject.toLowerCase()) || 
                    subject.toLowerCase().includes(category.toLowerCase())
        );
        
        if (!isDuplicate) {
          googleCategories.add(subject);
        }
      }
      
      enhancedBook.categories = Array.from(googleCategories);
      
      return enhancedBook;
    } catch (error) {
      console.warn('⚠️ Error enhancing book with Open Library data:', error.message);
      return book;
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
   * @param {boolean} englishOnly - Filter to English-only editions
   * @param {string} originalTitle - Original title of the book
   * @returns {Promise<Object>} Different editions of the book
   */
  async getBookEditions(openLibraryKey, limit = 20, englishOnly = false, originalTitle = '') {
    try {
      if (!openLibraryKey) {
        throw new Error('Open Library key is required');
      }

      const workKey = openLibraryKey.startsWith('/works/') ? openLibraryKey : `/works/${openLibraryKey}`;
      
      let logMessage = `📚 Fetching editions for Open Library work: ${workKey}`;
      if (englishOnly) logMessage += ` (English-only, original title: "${originalTitle}")`;
      console.log(logMessage);

      const response = await axios.get(`https://openlibrary.org${workKey}/editions.json`, {
        params: { limit: englishOnly ? limit * 3 : limit * 2, offset: 0 }, // Fetch more if filtering heavily
        timeout: 8000
      });

      if (!response.data?.entries?.length) {
        return { success: true, totalEditions: 0, editions: [], message: 'No editions found' };
      }

      const normalizeTitleForComparison = (title) => {
        if (!title) return '';
        return title.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
      };

      const isEnglishEditionStrict = (rawEditionData) => {
        if (!rawEditionData || !rawEditionData.languages || rawEditionData.languages.length === 0) {
          return false; 
        }
        const language = rawEditionData.languages[0];
        if (typeof language === 'object' && language.key) {
          const langKey = language.key.toLowerCase();
          return langKey === '/languages/eng' || langKey === '/languages/en';
        }
        if (typeof language === 'string') {
          const langStr = language.toLowerCase().trim();
          return langStr === 'en' || langStr === 'eng' || langStr === 'english';
        }
        return false; 
      };

      let editions = response.data.entries
        .map(edition => this.parseOpenLibraryEdition(edition))
        .filter(edition => edition.title); 

      if (englishOnly) {
        const originalCount = editions.length;
        const normOriginalTitle = originalTitle ? normalizeTitleForComparison(originalTitle) : null;
        
        console.log(`[DEBUG] English-only filtering for "${originalTitle}". ${originalCount} editions before filtering.`);
        editions.forEach((edition, index) => {
          const rawLanguages = edition.rawData?.languages;
          const isMarkedStrictlyEnglish = isEnglishEditionStrict(edition.rawData);
          console.log(`[DEBUG] Edition ${index + 1}/${originalCount}: "${edition.title}" | Langs: ${JSON.stringify(rawLanguages)} | StrictEnglishCheck: ${isMarkedStrictlyEnglish}`);
        });

        editions = editions.filter(edition => {
          const isMarkedEnglish = isEnglishEditionStrict(edition.rawData);
          
          if (!isMarkedEnglish) {
            // console.log(`📚 Filtering non-English edition: "${edition.title}" (Langs: ${JSON.stringify(edition.rawData?.languages)})`);
            return false; 
          }

          if (normOriginalTitle && edition.title) {
            const normEditionTitle = normalizeTitleForComparison(edition.title);
            if (normEditionTitle.length > 3 && normOriginalTitle.length > 3) {
              if (!normEditionTitle.includes(normOriginalTitle) && !normOriginalTitle.includes(normEditionTitle)) {
                // Add a check for significant word overlap if simple .includes fails
                const originalWords = new Set(normOriginalTitle.split(' '));
                const editionWords = new Set(normEditionTitle.split(' '));
                const intersection = new Set([...originalWords].filter(word => editionWords.has(word)));
                const MIN_SHARED_WORDS = 2; // e.g., "Project Hail Mary" vs "Projet Ave Maria" might share "project" and "mary" in some languages after transliteration
                
                // For very different titles like "Der Astronaut" vs "Project Hail Mary", intersection will be 0 or 1.
                if (intersection.size < MIN_SHARED_WORDS && originalWords.size > 1 && editionWords.size > 1) {
                   console.log(`📚 Filtering edition "${edition.title}" (Normalized: "${normEditionTitle}") due to title mismatch with "${originalTitle}" (Normalized: "${normOriginalTitle}"). Langs: ${JSON.stringify(edition.rawData?.languages)}. Shared words: ${intersection.size}.`);
                   return false;
                }
              }
            }
          }
          return true;
        });
        console.log(`🌍 Filtered ${originalCount - editions.length} editions (English-only & title match). ${editions.length} remaining for ${workKey}.`);
      }

      editions = editions
        .sort((a, b) => (parseInt(b.publishedDate) || 0) - (parseInt(a.publishedDate) || 0))
        .slice(0, limit);

      console.log(`📖 Found ${editions.length} final editions for ${workKey}`);

      return {
        success: true,
        totalEditions: response.data.size || editions.length, // This might be inaccurate after heavy filtering
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
    const categories = this.splitAndCleanCategories(subjects.slice(0, 15), true); // Skip splitting initially

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
   * @param {boolean} skipSplitting - If true, skip splitting by & and "and", only clean
   * @returns {Array} Array of cleaned, split categories
   */
  splitAndCleanCategories(categories, skipSplitting = false) {
    if (!categories || !Array.isArray(categories)) return [];
    
    const split = [];
    categories.forEach(category => {
      if (typeof category === 'string') {
        let parts = [category];
        
        if (!skipSplitting) {
          // Split by comma first
          if (category.includes(',')) {
            parts = category.split(',');
          }
          
          // Then split each part by forward slash
          const slashSplitParts = [];
          parts.forEach(part => {
            if (part.includes('/')) {
              const slashParts = part.split('/').map(p => p.trim()).filter(p => p.length > 0);
              slashSplitParts.push(...slashParts);
            } else {
              slashSplitParts.push(part);
            }
          });
          parts = slashSplitParts;
          
          // Then split each part by ampersand and "and"
          const finalParts = [];
          parts.forEach(part => {
            let subParts = [part];
            
            // Split by ampersand
            if (part.includes('&')) {
              subParts = part.split('&');
            }
            
            // Then split each subpart by " and " (with spaces to avoid splitting words like "brand")
            const andSplitParts = [];
            subParts.forEach(subPart => {
              if (subPart.toLowerCase().includes(' and ')) {
                const andParts = subPart.split(/ and /i) // Case insensitive split
                  .map(p => p.trim())
                  .filter(p => p.length > 0);
                andSplitParts.push(...andParts);
              } else {
                andSplitParts.push(subPart.trim());
              }
            });
            
            finalParts.push(...andSplitParts);
          });
          
          parts = finalParts;
        }
        
        // Clean and filter parts
        const cleanedParts = parts
          .map(part => part.trim())
          .filter(part => part.length > 0 && part.length < 50);
        
        split.push(...cleanedParts);
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

  /**
   * Check Google Books API for audiobook-related information
   * @param {Object} book - Book object with Google Books data
   * @returns {Object} Enhanced book with Google audiobook hints
   */
  async enhanceWithGoogleAudiobookHints(book) {
    try {
      // If we have Google Books data, check for audiobook hints
      if (book.source?.includes('google') && book.rawData?.googleBooks) {
        const googleData = book.rawData.googleBooks;
        
        // Check for text-to-speech permission (indicates potential audiobook availability)
        const textToSpeechAllowed = googleData.accessInfo?.textToSpeechPermission === 'ALLOWED';
        
        // Check if this is marked as an audiobook in Google's system
        const isAudiobook = googleData.volumeInfo?.printType === 'AUDIOBOOK' || 
                           googleData.volumeInfo?.categories?.some(cat => 
                             cat.toLowerCase().includes('audiobook')
                           );
        
        // Look for audiobook-related links
        const hasAudioLinks = googleData.saleInfo?.buyLink?.includes('audiobook') ||
                             googleData.volumeInfo?.infoLink?.includes('audiobook');
        
        // Add Google audiobook hints to the book
        if (textToSpeechAllowed || isAudiobook || hasAudioLinks) {
          book.googleAudiobookHints = {
            textToSpeechAllowed,
            markedAsAudiobook: isAudiobook,
            hasAudioLinks,
            confidence: isAudiobook ? 'high' : textToSpeechAllowed ? 'medium' : 'low',
            source: 'google_books_api'
          };
          
          console.log(`🎧 Google audiobook hints for "${book.title}": ${JSON.stringify(book.googleAudiobookHints)}`);
        }
      }
      
      return book;
    } catch (error) {
      console.warn('⚠️ Failed to enhance with Google audiobook hints:', error.message);
      return book;
    }
  }
}

module.exports = new BookSearchService(); 