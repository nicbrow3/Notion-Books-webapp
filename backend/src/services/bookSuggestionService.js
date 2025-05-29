const googleBooksService = require('./googleBooksService');

class BookSuggestionService {
  constructor() {
    // Popular book series and their variations
    this.bookSeries = {
      'harry potter': {
        books: [
          { number: 1, title: 'Harry Potter and the Philosopher\'s Stone', aliases: ['sorcerer\'s stone', 'philosopher\'s stone'] },
          { number: 2, title: 'Harry Potter and the Chamber of Secrets', aliases: ['chamber of secrets'] },
          { number: 3, title: 'Harry Potter and the Prisoner of Azkaban', aliases: ['prisoner of azkaban'] },
          { number: 4, title: 'Harry Potter and the Goblet of Fire', aliases: ['goblet of fire'] },
          { number: 5, title: 'Harry Potter and the Order of the Phoenix', aliases: ['order of the phoenix'] },
          { number: 6, title: 'Harry Potter and the Half-Blood Prince', aliases: ['half-blood prince'] },
          { number: 7, title: 'Harry Potter and the Deathly Hallows', aliases: ['deathly hallows'] }
        ],
        author: 'J.K. Rowling'
      },
      'lord of the rings': {
        books: [
          { number: 1, title: 'The Fellowship of the Ring', aliases: ['fellowship'] },
          { number: 2, title: 'The Two Towers', aliases: ['two towers'] },
          { number: 3, title: 'The Return of the King', aliases: ['return of the king'] }
        ],
        author: 'J.R.R. Tolkien'
      },
      'hunger games': {
        books: [
          { number: 1, title: 'The Hunger Games', aliases: ['hunger games'] },
          { number: 2, title: 'Catching Fire', aliases: ['catching fire'] },
          { number: 3, title: 'Mockingjay', aliases: ['mockingjay'] }
        ],
        author: 'Suzanne Collins'
      },
      'game of thrones': {
        books: [
          { number: 1, title: 'A Game of Thrones', aliases: ['game of thrones'] },
          { number: 2, title: 'A Clash of Kings', aliases: ['clash of kings'] },
          { number: 3, title: 'A Storm of Swords', aliases: ['storm of swords'] },
          { number: 4, title: 'A Feast for Crows', aliases: ['feast for crows'] },
          { number: 5, title: 'A Dance with Dragons', aliases: ['dance with dragons'] }
        ],
        author: 'George R.R. Martin'
      },
      'chronicles of narnia': {
        books: [
          { number: 1, title: 'The Lion, the Witch and the Wardrobe', aliases: ['lion witch wardrobe'] },
          { number: 2, title: 'Prince Caspian', aliases: ['prince caspian'] },
          { number: 3, title: 'The Voyage of the Dawn Treader', aliases: ['dawn treader'] },
          { number: 4, title: 'The Silver Chair', aliases: ['silver chair'] },
          { number: 5, title: 'The Horse and His Boy', aliases: ['horse and his boy'] },
          { number: 6, title: 'The Magician\'s Nephew', aliases: ['magician\'s nephew'] },
          { number: 7, title: 'The Last Battle', aliases: ['last battle'] }
        ],
        author: 'C.S. Lewis'
      },
      'stormlight archive': {
        books: [
          { number: 1, title: 'The Way of Kings', aliases: ['way of kings'] },
          { number: 2, title: 'Words of Radiance', aliases: ['words of radiance'] },
          { number: 3, title: 'Oathbringer', aliases: ['oathbringer'] },
          { number: 4, title: 'Rhythm of War', aliases: ['rhythm of war'] }
        ],
        author: 'Brandon Sanderson'
      },
      'mistborn': {
        books: [
          { number: 1, title: 'The Final Empire', aliases: ['final empire', 'mistborn'] },
          { number: 2, title: 'The Well of Ascension', aliases: ['well of ascension'] },
          { number: 3, title: 'The Hero of Ages', aliases: ['hero of ages'] }
        ],
        author: 'Brandon Sanderson'
      },
      'wheel of time': {
        books: [
          { number: 1, title: 'The Eye of the World', aliases: ['eye of the world'] },
          { number: 2, title: 'The Great Hunt', aliases: ['great hunt'] },
          { number: 3, title: 'The Dragon Reborn', aliases: ['dragon reborn'] },
          { number: 4, title: 'The Shadow Rising', aliases: ['shadow rising'] },
          { number: 5, title: 'The Fires of Heaven', aliases: ['fires of heaven'] }
        ],
        author: 'Robert Jordan'
      }
    };

    // Common search patterns and their corrections
    this.commonPatterns = [
      { pattern: /^(.+?)\s+(\d+)$/, type: 'series_number' },
      { pattern: /^(.+?)\s+book\s+(\d+)$/i, type: 'series_number' },
      { pattern: /^(.+?)\s+vol\s+(\d+)$/i, type: 'series_number' },
      { pattern: /^(.+?)\s+volume\s+(\d+)$/i, type: 'series_number' },
      { pattern: /^(.+?)\s+part\s+(\d+)$/i, type: 'series_number' },
      { pattern: /^(.+?)\s+#(\d+)$/i, type: 'series_number' }
    ];

    // Cache for dynamic series detection
    this.seriesCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Get suggestions for a search query
   * @param {string} query - The search query
   * @returns {Array} Array of suggestions
   */
  async getSuggestions(query) {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const suggestions = [];

    // Check for series number patterns first
    for (const pattern of this.commonPatterns) {
      const match = normalizedQuery.match(pattern.pattern);
      if (match && pattern.type === 'series_number') {
        const seriesName = match[1].trim();
        const bookNumber = parseInt(match[2]);
        
        const seriesSuggestions = await this.getSeriesSuggestions(seriesName, bookNumber);
        suggestions.push(...seriesSuggestions);
      }
    }

    // Check for partial series matches in hardcoded series
    const partialSuggestions = this.getPartialSeriesMatches(normalizedQuery);
    suggestions.push(...partialSuggestions);

    // If no suggestions from hardcoded series, try dynamic detection
    if (suggestions.length === 0) {
      const dynamicSuggestions = await this.getDynamicSeriesSuggestions(normalizedQuery);
      suggestions.push(...dynamicSuggestions);
    }

    // Remove duplicates and limit results
    const uniqueSuggestions = this.removeDuplicates(suggestions);
    return uniqueSuggestions.slice(0, 5);
  }

  /**
   * Get dynamic series suggestions using Google Books API
   * @param {string} query - The search query
   * @returns {Array} Array of suggestions
   */
  async getDynamicSeriesSuggestions(query) {
    try {
      // Check cache first
      const cacheKey = `dynamic_${query}`;
      const cached = this.seriesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.suggestions;
      }

      console.log(`🔍 Dynamic series detection for: "${query}"`);

      // Search for books that might be part of a series
      const searchResult = await googleBooksService.searchBooks(query, 'general', 20);
      
      if (!searchResult || !searchResult.success || !searchResult.books || searchResult.books.length === 0) {
        console.log(`📚 No books found for dynamic series detection: "${query}"`);
        return [];
      }

      console.log(`📚 Found ${searchResult.books.length} books for dynamic analysis`);

      // Analyze results to detect series patterns
      const seriesAnalysis = this.analyzeForSeries(searchResult.books, query);
      const suggestions = this.generateDynamicSuggestions(seriesAnalysis, query);

      // Cache the results
      this.seriesCache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });

      console.log(`✨ Generated ${suggestions.length} dynamic suggestions for: "${query}"`);
      return suggestions;

    } catch (error) {
      console.error('❌ Dynamic series detection error:', error.message);
      return [];
    }
  }

  /**
   * Analyze search results to detect series patterns
   * @param {Array} books - Array of book results
   * @param {string} query - Original query
   * @returns {Object} Series analysis
   */
  analyzeForSeries(books, query) {
    const analysis = {
      potentialSeries: new Map(),
      authors: new Map(),
      commonTitlePatterns: []
    };

    // Extract query information
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    const queryNumberMatch = query.match(/(\d+)/);
    const requestedNumber = queryNumberMatch ? parseInt(queryNumberMatch[1]) : null;

    // Group books by author first
    for (const book of books) {
      if (!book.title || !book.authors || book.authors.length === 0) continue;

      const author = book.authors[0];
      const title = book.title.toLowerCase();
      
      // Track authors
      if (!analysis.authors.has(author)) {
        analysis.authors.set(author, []);
      }
      analysis.authors.get(author).push(book);
    }

    // Analyze each author's books for series patterns
    for (const [author, authorBooks] of analysis.authors) {
      if (authorBooks.length < 2) continue; // Need at least 2 books to suggest a series

      const seriesKey = `${author}_series`;
      const seriesData = {
        author,
        books: [],
        confidence: 0,
        detectedPattern: null
      };

      // Strategy 1: Look for numbered series patterns
      const numberedBooks = [];
      for (const book of authorBooks) {
        const title = book.title.toLowerCase();
        
        // Look for series indicators in title
        const seriesIndicators = [
          /book\s+(\d+)/i,
          /volume\s+(\d+)/i,
          /part\s+(\d+)/i,
          /#(\d+)/,
          /(\d+)$/,
          /\((\d+)\)/
        ];

        let detectedNumber = null;
        for (const indicator of seriesIndicators) {
          const match = title.match(indicator);
          if (match) {
            const number = parseInt(match[1]);
            if (number > 0 && number <= 20) { // Reasonable book number
              detectedNumber = number;
              break;
            }
          }
        }

        if (detectedNumber) {
          numberedBooks.push({
            ...book,
            detectedNumber
          });
        }
      }

      // Strategy 2: For queries with numbers (like "twilight 3"), be more aggressive in finding series
      if (requestedNumber && numberedBooks.length === 0) {
        // Look for books by the same author that share words with the query
        const relevantBooks = [];
        const baseQuery = queryLower.replace(/\d+/g, '').trim(); // Remove numbers from query
        const baseWords = baseQuery.split(' ').filter(word => word.length > 2);
        
        for (const book of authorBooks) {
          const title = book.title.toLowerCase();
          let relevanceScore = 0;
          
          // Check if title contains query words
          for (const word of baseWords) {
            if (title.includes(word)) {
              relevanceScore += 2;
            }
          }
          
          // Boost score for exact word matches
          for (const word of baseWords) {
            const titleWords = title.split(' ');
            if (titleWords.includes(word)) {
              relevanceScore += 1;
            }
          }
          
          if (relevanceScore > 0) {
            relevantBooks.push({
              ...book,
              relevanceScore
            });
          }
        }
        
        // If we found relevant books by the same author, treat them as a potential series
        if (relevantBooks.length >= 2) {
          seriesData.books = relevantBooks.sort((a, b) => b.relevanceScore - a.relevanceScore);
          seriesData.confidence = Math.min(0.8, 0.4 + (relevantBooks.length * 0.1));
          seriesData.detectedPattern = 'author_relevance';
          console.log(`📚 Found ${relevantBooks.length} relevant books by ${author} for query "${query}"`);
        }
      }

      // Strategy 3: Use numbered books if found
      if (numberedBooks.length >= 2) {
        seriesData.books = numberedBooks;
        seriesData.confidence = Math.min(0.9, 0.5 + (numberedBooks.length * 0.1));
        seriesData.detectedPattern = 'numbered';
      }
      
      // Strategy 4: Look for common title patterns that suggest a series (fallback)
      if (seriesData.books.length === 0) {
        const titleWords = authorBooks.map(book => book.title.toLowerCase().split(' '));
        
        // Find books that share significant words with the query
        const relevantBooks = [];
        for (const book of authorBooks) {
          const bookWords = book.title.toLowerCase().split(' ');
          let commonWords = 0;
          
          for (const qWord of queryWords) {
            if (qWord.length > 2) { // Skip short words
              for (const bWord of bookWords) {
                if (bWord.includes(qWord) || qWord.includes(bWord)) {
                  commonWords++;
                  break;
                }
              }
            }
          }
          
          // If the book shares words with the query, it might be part of the series
          if (commonWords >= Math.min(1, queryWords.length)) {
            relevantBooks.push(book);
          }
        }

        if (relevantBooks.length >= 2) {
          seriesData.books = relevantBooks;
          seriesData.confidence = Math.min(0.6, 0.3 + (relevantBooks.length * 0.1));
          seriesData.detectedPattern = 'title_similarity';
        } else if (authorBooks.length >= 3) {
          // If an author has many books and the query matches, suggest anyway
          seriesData.books = authorBooks.slice(0, 5); // Limit to 5 books
          seriesData.confidence = 0.3;
          seriesData.detectedPattern = 'prolific_author';
        }
      }

      if (seriesData.books.length > 0) {
        analysis.potentialSeries.set(seriesKey, seriesData);
      }
    }

    return analysis;
  }

  /**
   * Generate suggestions from series analysis
   * @param {Object} analysis - Series analysis
   * @param {string} query - Original query
   * @returns {Array} Array of suggestions
   */
  generateDynamicSuggestions(analysis, query) {
    const suggestions = [];

    // Sort potential series by confidence and book count
    const sortedSeries = Array.from(analysis.potentialSeries.values())
      .filter(series => series.books.length > 0)
      .sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return b.books.length - a.books.length;
      });

    for (const series of sortedSeries.slice(0, 3)) { // Top 3 series
      if (series.detectedPattern === 'numbered') {
        // Handle numbered series (like "Book 1", "Book 2", etc.)
        this.generateNumberedSeriesSuggestions(series, query, suggestions);
      } else {
        // Handle non-numbered series (like Twilight, where books have unique titles)
        this.generateTitleBasedSeriesSuggestions(series, query, suggestions);
      }
    }

    return suggestions;
  }

  /**
   * Generate suggestions for numbered series
   * @param {Object} series - Series data
   * @param {string} query - Original query
   * @param {Array} suggestions - Suggestions array to populate
   */
  generateNumberedSeriesSuggestions(series, query, suggestions) {
    // Sort books by detected number
    const sortedBooks = series.books.sort((a, b) => {
      return (a.detectedNumber || 999) - (b.detectedNumber || 999);
    });

    // Check if query contains a number (like "twilight 3")
    const queryNumberMatch = query.match(/(\d+)/);
    const requestedNumber = queryNumberMatch ? parseInt(queryNumberMatch[1]) : null;

    if (requestedNumber) {
      // User is looking for a specific book number
      const exactMatch = sortedBooks.find(b => b.detectedNumber === requestedNumber);
      if (exactMatch) {
        suggestions.push({
          type: 'dynamic_exact_match',
          confidence: series.confidence,
          originalQuery: query,
          suggestion: exactMatch.title,
          author: series.author,
          series: query,
          bookNumber: exactMatch.detectedNumber,
          reason: `"${exactMatch.title}" (Book ${exactMatch.detectedNumber} by ${series.author})`
        });
      }

      // Also suggest nearby books
      const nearbyBooks = sortedBooks.filter(b => 
        b.detectedNumber && Math.abs(b.detectedNumber - requestedNumber) <= 1 && b.detectedNumber !== requestedNumber
      );
      
      for (const book of nearbyBooks.slice(0, 2)) {
        suggestions.push({
          type: 'dynamic_nearby_book',
          confidence: series.confidence * 0.8,
          originalQuery: query,
          suggestion: book.title,
          author: series.author,
          series: query,
          bookNumber: book.detectedNumber,
          reason: `Or "${book.title}" (Book ${book.detectedNumber})`
        });
      }
    } else {
      // Suggest starting with the first book
      const firstBook = sortedBooks[0];
      if (firstBook) {
        suggestions.push({
          type: 'dynamic_series_start',
          confidence: series.confidence,
          originalQuery: query,
          suggestion: firstBook.title,
          author: series.author,
          series: query,
          bookNumber: firstBook.detectedNumber || 1,
          reason: `Start with "${firstBook.title}" (${series.books.length} books found by ${series.author})`
        });
      }
    }
  }

  /**
   * Generate suggestions for title-based series (like Twilight)
   * @param {Object} series - Series data
   * @param {string} query - Original query
   * @param {Array} suggestions - Suggestions array to populate
   */
  generateTitleBasedSeriesSuggestions(series, query, suggestions) {
    // Check if query contains a number (like "twilight 3")
    const queryNumberMatch = query.match(/(\d+)/);
    const requestedNumber = queryNumberMatch ? parseInt(queryNumberMatch[1]) : null;

    if (requestedNumber) {
      // Try to determine series order using multiple strategies
      const orderedBooks = this.determineSeriesOrder(series.books, query);
      
      if (orderedBooks.length > 0 && requestedNumber <= orderedBooks.length) {
        const requestedBook = orderedBooks[requestedNumber - 1];
        suggestions.push({
          type: 'dynamic_series_book',
          confidence: series.confidence,
          originalQuery: query,
          suggestion: requestedBook.title,
          author: series.author,
          series: query,
          bookNumber: requestedNumber,
          reason: `"${requestedBook.title}" (Book ${requestedNumber} by ${series.author})`
        });

        // Suggest nearby books in the series
        if (requestedNumber > 1 && orderedBooks[requestedNumber - 2]) {
          const prevBook = orderedBooks[requestedNumber - 2];
          suggestions.push({
            type: 'dynamic_series_prev',
            confidence: series.confidence * 0.7,
            originalQuery: query,
            suggestion: prevBook.title,
            author: series.author,
            series: query,
            bookNumber: requestedNumber - 1,
            reason: `Or "${prevBook.title}" (Book ${requestedNumber - 1})`
          });
        }

        // Suggest next book if available
        if (requestedNumber < orderedBooks.length && orderedBooks[requestedNumber]) {
          const nextBook = orderedBooks[requestedNumber];
          suggestions.push({
            type: 'dynamic_series_next',
            confidence: series.confidence * 0.6,
            originalQuery: query,
            suggestion: nextBook.title,
            author: series.author,
            series: query,
            bookNumber: requestedNumber + 1,
            reason: `Continue with "${nextBook.title}" (Book ${requestedNumber + 1})`
          });
        }
      } else {
        // If we can't determine the exact order, but we have books by the same author
        // Try to find the most relevant book based on the query
        const mostRelevant = this.findMostRelevantBook(series.books, query);
        if (mostRelevant) {
          suggestions.push({
            type: 'dynamic_series_relevant',
            confidence: series.confidence * 0.7,
            originalQuery: query,
            suggestion: mostRelevant.title,
            author: series.author,
            series: query,
            bookNumber: requestedNumber,
            reason: `"${mostRelevant.title}" by ${series.author} (most relevant match)`
          });
        }

        // Also suggest other books by the same author
        const otherBooks = series.books.filter(book => book !== mostRelevant).slice(0, 2);
        for (const book of otherBooks) {
          suggestions.push({
            type: 'dynamic_series_other',
            confidence: series.confidence * 0.5,
            originalQuery: query,
            suggestion: book.title,
            author: series.author,
            series: query,
            reason: `Or try "${book.title}" by ${series.author}`
          });
        }
      }
    } else {
      // No specific number requested, suggest the first/most popular book
      const firstBook = this.findSeriesStartingBook(series.books);
      if (firstBook) {
        suggestions.push({
          type: 'dynamic_series_start',
          confidence: series.confidence,
          originalQuery: query,
          suggestion: firstBook.title,
          author: series.author,
          series: query,
          bookNumber: 1,
          reason: `Start with "${firstBook.title}" (${series.books.length} books found by ${series.author})`
        });
      }
    }
  }

  /**
   * Determine the order of books in a series using multiple strategies
   * @param {Array} books - Array of books
   * @param {string} query - Original query
   * @returns {Array} Ordered books
   */
  determineSeriesOrder(books, query) {
    // Strategy 1: Try publication date ordering
    const dateOrderedBooks = this.orderBooksByDate(books);
    
    // Strategy 2: Try to detect common series patterns
    const patternOrderedBooks = this.orderBooksByPatterns(books, query);
    
    // Strategy 3: Use title similarity and common series knowledge
    const intelligentOrderedBooks = this.orderBooksIntelligently(books, query);
    
    // Choose the best ordering strategy
    if (patternOrderedBooks.length > 0) {
      console.log(`📚 Using pattern-based ordering for series`);
      return patternOrderedBooks;
    } else if (intelligentOrderedBooks.length > 0) {
      console.log(`📚 Using intelligent ordering for series`);
      return intelligentOrderedBooks;
    } else if (dateOrderedBooks.length > 0) {
      console.log(`📚 Using date-based ordering for series`);
      return dateOrderedBooks;
    }
    
    return books; // Fallback to original order
  }

  /**
   * Order books by publication date
   * @param {Array} books - Array of books
   * @returns {Array} Date-ordered books
   */
  orderBooksByDate(books) {
    return books
      .filter(book => book.publishedDate || book.originalPublishedDate)
      .sort((a, b) => {
        const dateA = a.originalPublishedDate || a.publishedDate;
        const dateB = b.originalPublishedDate || b.publishedDate;
        const yearA = parseInt(dateA) || 9999;
        const yearB = parseInt(dateB) || 9999;
        return yearA - yearB;
      });
  }

  /**
   * Order books by detecting common series patterns
   * @param {Array} books - Array of books
   * @param {string} query - Original query
   * @returns {Array} Pattern-ordered books
   */
  orderBooksByPatterns(books, query) {
    const orderedBooks = [];
    
    // Look for numbered patterns in titles first
    const numberedBooks = [];
    for (const book of books) {
      const title = book.title.toLowerCase();
      
      // Look for explicit numbering patterns
      const numberPatterns = [
        /book\s+(\d+)/i,
        /volume\s+(\d+)/i,
        /part\s+(\d+)/i,
        /#(\d+)/,
        /\((\d+)\)/,
        /(\d+)$/
      ];

      for (const pattern of numberPatterns) {
        const match = title.match(pattern);
        if (match) {
          const number = parseInt(match[1]);
          if (number > 0 && number <= 20) {
            numberedBooks.push({
              ...book,
              detectedNumber: number
            });
            break;
          }
        }
      }
    }

    // If we found numbered books, sort by number
    if (numberedBooks.length >= 2) {
      return numberedBooks.sort((a, b) => a.detectedNumber - b.detectedNumber);
    }

    // For non-numbered series, try to detect order by publication date and title analysis
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const relevantBooks = books.filter(book => {
      const title = book.title.toLowerCase();
      // Book should contain at least one significant word from the query
      return queryWords.some(word => title.includes(word));
    });

    // Sort by publication date if available
    if (relevantBooks.length > 1) {
      const datedBooks = relevantBooks.filter(book => 
        book.publishedDate || book.originalPublishedDate
      );
      
      if (datedBooks.length >= 2) {
        return datedBooks.sort((a, b) => {
          const dateA = a.originalPublishedDate || a.publishedDate;
          const dateB = b.originalPublishedDate || b.publishedDate;
          const yearA = parseInt(dateA) || 9999;
          const yearB = parseInt(dateB) || 9999;
          return yearA - yearB;
        });
      }
    }

    return orderedBooks;
  }

  /**
   * Order books using intelligent analysis
   * @param {Array} books - Array of books
   * @param {string} query - Original query
   * @returns {Array} Intelligently ordered books
   */
  orderBooksIntelligently(books, query) {
    // Look for numbered titles first
    const numberedBooks = books.filter(book => {
      const title = book.title.toLowerCase();
      return /\b(book|volume|part|#)\s*(\d+)|\b(\d+)\b/.test(title);
    });

    if (numberedBooks.length >= 2) {
      return numberedBooks.sort((a, b) => {
        const getNumber = (title) => {
          const match = title.toLowerCase().match(/\b(book|volume|part|#)\s*(\d+)|\b(\d+)\b/);
          return match ? parseInt(match[2] || match[3]) : 999;
        };
        return getNumber(a.title) - getNumber(b.title);
      });
    }

    // Look for ordinal indicators (first, second, third, etc.)
    const ordinalBooks = books.filter(book => {
      const title = book.title.toLowerCase();
      return /(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)/.test(title);
    });

    if (ordinalBooks.length >= 2) {
      const ordinalMap = {
        'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
        'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10
      };
      
      return ordinalBooks.sort((a, b) => {
        const getOrdinal = (title) => {
          const match = title.toLowerCase().match(/(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)/);
          return match ? ordinalMap[match[1]] : 999;
        };
        return getOrdinal(a.title) - getOrdinal(b.title);
      });
    }

    // Fallback to publication date
    return this.orderBooksByDate(books);
  }

  /**
   * Find the most relevant book based on query
   * @param {Array} books - Array of books
   * @param {string} query - Search query
   * @returns {Object|null} Most relevant book
   */
  findMostRelevantBook(books, query) {
    const queryWords = query.toLowerCase().split(' ');
    let bestMatch = null;
    let bestScore = 0;

    for (const book of books) {
      const title = book.title.toLowerCase();
      let score = 0;
      
      for (const word of queryWords) {
        if (word.length > 2 && title.includes(word)) {
          score += word.length; // Longer words get higher scores
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = book;
      }
    }

    return bestMatch;
  }

  /**
   * Find the best starting book for a series
   * @param {Array} books - Array of books
   * @returns {Object|null} Starting book
   */
  findSeriesStartingBook(books) {
    // Look for books with "first", "beginning", or the original title
    const startingKeywords = ['first', 'beginning', 'origin', 'start'];
    
    for (const book of books) {
      const title = book.title.toLowerCase();
      if (startingKeywords.some(keyword => title.includes(keyword))) {
        return book;
      }
    }

    // If no obvious starting book, return the first one or the one with earliest publication
    return books.sort((a, b) => {
      const yearA = a.publishedDate ? parseInt(a.publishedDate) : 9999;
      const yearB = b.publishedDate ? parseInt(b.publishedDate) : 9999;
      return yearA - yearB;
    })[0];
  }

  /**
   * Get suggestions for a specific series and book number
   * @param {string} seriesName - The series name
   * @param {number} bookNumber - The book number
   * @returns {Array} Array of suggestions
   */
  async getSeriesSuggestions(seriesName, bookNumber) {
    const suggestions = [];

    // Check hardcoded series first
    for (const [key, series] of Object.entries(this.bookSeries)) {
      if (this.isSeriesMatch(seriesName, key)) {
        const book = series.books.find(b => b.number === bookNumber);
        if (book) {
          suggestions.push({
            type: 'exact_match',
            confidence: 0.9,
            originalQuery: `${seriesName} ${bookNumber}`,
            suggestion: book.title,
            author: series.author,
            series: key,
            bookNumber: bookNumber,
            reason: `Did you mean "${book.title}"?`
          });
        }

        // Also suggest nearby books in the series
        const nearbyBooks = series.books.filter(b => 
          Math.abs(b.number - bookNumber) <= 1 && b.number !== bookNumber
        );
        
        for (const nearbyBook of nearbyBooks) {
          suggestions.push({
            type: 'nearby_book',
            confidence: 0.6,
            originalQuery: `${seriesName} ${bookNumber}`,
            suggestion: nearbyBook.title,
            author: series.author,
            series: key,
            bookNumber: nearbyBook.number,
            reason: `Or maybe "${nearbyBook.title}" (Book ${nearbyBook.number})?`
          });
        }
      }
    }

    // If no hardcoded matches, try dynamic detection
    if (suggestions.length === 0) {
      try {
        const dynamicSuggestions = await this.getDynamicSeriesSuggestions(`${seriesName} book ${bookNumber}`);
        suggestions.push(...dynamicSuggestions);
      } catch (error) {
        console.error('❌ Dynamic series suggestions error:', error.message);
      }
    }

    return suggestions;
  }

  /**
   * Get partial matches for series names
   * @param {string} query - The search query
   * @returns {Array} Array of suggestions
   */
  getPartialSeriesMatches(query) {
    const suggestions = [];

    for (const [key, series] of Object.entries(this.bookSeries)) {
      // Check if query partially matches series name
      if (key.includes(query) || query.includes(key.split(' ')[0])) {
        // Suggest the first book in the series
        const firstBook = series.books[0];
        if (firstBook) {
          suggestions.push({
            type: 'series_start',
            confidence: 0.7,
            originalQuery: query,
            suggestion: firstBook.title,
            author: series.author,
            series: key,
            bookNumber: 1,
            reason: `Start with "${firstBook.title}" (Book 1 of ${this.capitalizeWords(key)})`
          });
        }

        // Check for alias matches within the series
        for (const book of series.books) {
          for (const alias of book.aliases) {
            if (alias.includes(query) || query.includes(alias)) {
              suggestions.push({
                type: 'alias_match',
                confidence: 0.8,
                originalQuery: query,
                suggestion: book.title,
                author: series.author,
                series: key,
                bookNumber: book.number,
                reason: `Did you mean "${book.title}"?`
              });
            }
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Check if a query matches a series name
   * @param {string} query - The search query
   * @param {string} seriesKey - The series key
   * @returns {boolean} True if it's a match
   */
  isSeriesMatch(query, seriesKey) {
    const queryWords = query.split(' ');
    const seriesWords = seriesKey.split(' ');
    
    // Check for exact match
    if (query === seriesKey) return true;
    
    // Check for partial match (at least 2 words or 1 significant word)
    const matchingWords = queryWords.filter(qWord => 
      seriesWords.some(sWord => 
        sWord.includes(qWord) || qWord.includes(sWord)
      )
    );
    
    return matchingWords.length >= Math.min(2, queryWords.length);
  }

  /**
   * Remove duplicate suggestions
   * @param {Array} suggestions - Array of suggestions
   * @returns {Array} Deduplicated suggestions
   */
  removeDuplicates(suggestions) {
    const seen = new Set();
    return suggestions.filter(suggestion => {
      const key = `${suggestion.suggestion}_${suggestion.author}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Capitalize words in a string
   * @param {string} str - The string to capitalize
   * @returns {string} Capitalized string
   */
  capitalizeWords(str) {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get enhanced search suggestions with search queries
   * @param {string} query - The original query
   * @returns {Array} Array of enhanced suggestions with search queries
   */
  async getEnhancedSuggestions(query) {
    const suggestions = await this.getSuggestions(query);
    
    return suggestions.map(suggestion => ({
      ...suggestion,
      searchQuery: suggestion.suggestion,
      displayText: suggestion.reason,
      metadata: {
        series: suggestion.series,
        bookNumber: suggestion.bookNumber,
        author: suggestion.author,
        confidence: suggestion.confidence
      }
    }));
  }
}

module.exports = new BookSuggestionService(); 