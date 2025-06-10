const axios = require('axios');

class AudiobookService {
  constructor() {
    this.audnexusBaseURL = 'https://api.audnex.us';
    this.audibleBaseURL = 'https://api.audible.com/1.0';
  }

  /**
   * Search for audiobook on Audnexus using Audible's search API (like Audnexus.bundle does)
   */
  async searchAudnexusAudiobook(title, author, isbn = null) {
    try {
      console.log(`🎧 Searching for audiobook: "${title}" by ${author}${isbn ? ` (ISBN: ${isbn})` : ''}`);

      if (!author) {
        console.log('📚 No author provided, skipping audiobook search');
        return null;
      }

      // Strategy 1: Use Audible's search API to find ASINs (like Audnexus.bundle does)
      const audibleSearchResult = await this.searchAudibleForASINs(title, author);
      if (audibleSearchResult && audibleSearchResult.length > 0) {
        console.log(`🔍 Found ${audibleSearchResult.length} potential matches from Audible search`);
        
        // Try each ASIN until we find one that works with Audnexus
        for (const result of audibleSearchResult) {
          try {
            console.log(`🎯 Trying ASIN: ${result.asin} - "${result.title}"`);
            const audnexusData = await this.getAudiobookByAsin(result.asin);
            if (audnexusData && audnexusData.hasAudiobook) {
              console.log(`✅ Successfully found audiobook data via ASIN: ${result.asin}`);
              return {
                ...audnexusData,
                searchMethod: 'audible_search',
                searchScore: result.score,
                searchReason: `Found via Audible search with score ${result.score}`
              };
            }
          } catch (asinError) {
            console.log(`⚠️ ASIN ${result.asin} failed: ${asinError.message}`);
            continue;
          }
        }
        
        console.log(`📚 Found ${audibleSearchResult.length} ASINs from Audible but none worked with Audnexus`);
      }

      // Strategy 2: Try ISBN search if available
      if (isbn) {
        console.log(`🔍 Trying ISBN-based search: ${isbn}`);
        const isbnResult = await this.searchByISBN(isbn);
        if (isbnResult && isbnResult.hasAudiobook && isbnResult.asin) {
          console.log(`🎧 Found audiobook via ISBN search: ${isbnResult.asin}`);
          return isbnResult;
        }
      }

      // Strategy 3: Try to find the book through author search on Audnexus
      const authorResult = await this.searchByAuthor(title, author);
      if (authorResult && authorResult.hasAudiobook && authorResult.asin) {
        console.log(`🎧 Found audiobook via Audnexus author search: ${authorResult.asin}`);
        return authorResult;
      }

      // Strategy 4: Try author name variations
      const authorVariations = this.generateAuthorVariations(author);
      for (const authorVariation of authorVariations) {
        if (authorVariation !== author) {
          console.log(`🔍 Trying author variation: "${authorVariation}"`);
          const variationResult = await this.searchByAuthor(title, authorVariation);
          if (variationResult && variationResult.hasAudiobook && variationResult.asin) {
            console.log(`🎧 Found audiobook via author variation: ${variationResult.asin}`);
            return variationResult;
          }
        }
      }

      // If we found author info but no specific book, return that with better messaging
      if (authorResult && authorResult.authorFound) {
        return {
          ...authorResult,
          message: `Author ${authorResult.authorName} found on Audnexus, but specific audiobook for "${title}" not discoverable.`,
          searchLimitation: 'Book not found in Audnexus database. The book may not have an audiobook version or may not be indexed yet.',
          suggestion: 'Try searching with different title variations or check if the book has an audiobook version on Audible.'
        };
      }

      // No results found
      return {
        source: 'audnexus',
        hasAudiobook: false,
        authorFound: false,
        error: `No audiobook found for "${title}" by ${author}`,
        searchLimitation: 'Book not found via Audible search or Audnexus author lookup.',
        suggestion: 'The book may not have an audiobook version, or it may not be available in the US Audible store.'
      };

    } catch (error) {
      console.error('❌ Audiobook search failed:', error.message);
      return {
        source: 'audnexus',
        hasAudiobook: false,
        authorFound: false,
        error: `Search failed: ${error.message}`
      };
    }
  }

  /**
   * Search Audible's API for ASINs (like Audnexus.bundle does)
   * This is the key method that makes the Plex agent work effectively
   */
  async searchAudibleForASINs(title, author) {
    try {
      console.log(`🔍 Searching Audible API for: "${title}" by ${author}`);
      
      // Clean up the search terms
      const cleanTitle = this.cleanSearchTerm(title);
      const cleanAuthor = this.cleanSearchTerm(author);
      
      // Try different search query combinations
      const searchQueries = [
        `${cleanTitle} ${cleanAuthor}`,
        `"${cleanTitle}" ${cleanAuthor}`,
        `${cleanTitle} by ${cleanAuthor}`,
        `"${cleanTitle}" by ${cleanAuthor}`,
        cleanTitle // Sometimes just the title works better
      ];

      let allResults = [];

      for (const query of searchQueries) {
        try {
          console.log(`🔍 Trying Audible search: "${query}"`);
          
          const response = await axios.get(`${this.audibleBaseURL}/catalog/products`, {
            params: {
              'response_groups': 'contributors,product_desc,product_extended_attrs,product_attrs,media,rating',
              'image_sizes': '500,1024',
              'keywords': query,
              'num_results': 25,
              'products_sort_by': 'Relevance'
            },
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          if (response.data && response.data.products && response.data.products.length > 0) {
            console.log(`📚 Found ${response.data.products.length} results from Audible for query: "${query}"`);
            
            // Process and score the results
            const scoredResults = response.data.products.map(product => {
              const score = this.calculateAudibleMatchScore(product, title, author);
              return {
                asin: product.asin,
                title: product.title,
                authors: product.authors ? product.authors.map(a => a.name) : [],
                narrator: product.narrators ? product.narrators.map(n => n.name).join(', ') : '',
                score: score,
                source: 'audible_search'
              };
            }).filter(result => result.score > 10); // Only keep results with decent scores

            allResults = allResults.concat(scoredResults);
          }
        } catch (queryError) {
          console.log(`⚠️ Audible search query "${query}" failed: ${queryError.message}`);
          continue;
        }
      }

      if (allResults.length === 0) {
        console.log(`📚 No results found from Audible search`);
        return [];
      }

      // Remove duplicates and sort by score
      const uniqueResults = allResults.reduce((acc, current) => {
        const existing = acc.find(item => item.asin === current.asin);
        if (!existing) {
          acc.push(current);
        } else if (current.score > existing.score) {
          // Replace with higher scoring version
          const index = acc.indexOf(existing);
          acc[index] = current;
        }
        return acc;
      }, []);

      // Sort by score (highest first)
      uniqueResults.sort((a, b) => b.score - a.score);

      console.log(`🎯 Found ${uniqueResults.length} unique results, top score: ${uniqueResults[0]?.score || 0}`);
      
      // Return top 5 results
      return uniqueResults.slice(0, 5);

    } catch (error) {
      console.warn('⚠️ Audible search failed:', error.message);
      return [];
    }
  }

  /**
   * Calculate match score for Audible search results
   */
  calculateAudibleMatchScore(product, targetTitle, targetAuthor) {
    let score = 0;
    
    const normalizedProductTitle = this.normalizeTitle(product.title || '');
    const normalizedTargetTitle = this.normalizeTitle(targetTitle);
    const normalizedTargetAuthor = this.normalizeAuthorName(targetAuthor);
    
    // Get product authors
    const productAuthors = product.authors ? product.authors.map(a => this.normalizeAuthorName(a.name)) : [];
    
    // Title matching (60 points max)
    if (normalizedProductTitle === normalizedTargetTitle) {
      score += 60;
    } else if (normalizedProductTitle.includes(normalizedTargetTitle) || normalizedTargetTitle.includes(normalizedProductTitle)) {
      score += 45;
    } else {
      // Word overlap for title
      const titleWords = normalizedTargetTitle.split(/\s+/).filter(word => word.length > 2);
      const productTitleWords = normalizedProductTitle.split(/\s+/).filter(word => word.length > 2);
      const commonWords = titleWords.filter(word => 
        productTitleWords.some(productWord => productWord.includes(word) || word.includes(productWord))
      );
      if (titleWords.length > 0) {
        score += (commonWords.length / titleWords.length) * 30;
      }
    }
    
    // Author matching (40 points max)
    let bestAuthorScore = 0;
    for (const productAuthor of productAuthors) {
      let authorScore = 0;
      if (productAuthor === normalizedTargetAuthor) {
        authorScore = 40;
      } else if (productAuthor.includes(normalizedTargetAuthor) || normalizedTargetAuthor.includes(productAuthor)) {
        authorScore = 30;
      } else {
        // Check for partial matches (last name, etc.)
        const authorWords = normalizedTargetAuthor.split(/\s+/);
        const productAuthorWords = productAuthor.split(/\s+/);
        const commonAuthorWords = authorWords.filter(word => 
          productAuthorWords.some(productWord => productWord.includes(word) || word.includes(productWord))
        );
        if (authorWords.length > 0) {
          authorScore = (commonAuthorWords.length / authorWords.length) * 20;
        }
      }
      bestAuthorScore = Math.max(bestAuthorScore, authorScore);
    }
    score += bestAuthorScore;
    
    // Bonus/Penalty based on numeric volume indicators --------------------------------
    // If the search query (target title) does NOT include a number but the product title DOES,
    // we slightly penalize it so that "Heretical Fishing" outranks "Heretical Fishing 2" etc.
    // Conversely, if the search query DOES include a number and that number is present in the
    // product title, we give a small bonus. If the numbers mismatch, add a small penalty.

    const targetNumberMatch = normalizedTargetTitle.match(/\d+/);
    const productNumberMatch = normalizedProductTitle.match(/\d+/);

    if (!targetNumberMatch && productNumberMatch) {
      score -= 10; // penalize numbered sequels when user didn't specify a number
    } else if (targetNumberMatch) {
      if (productNumberMatch) {
        if (productNumberMatch[0] === targetNumberMatch[0]) {
          score += 10; // exact matching number bonus
        } else {
          score -= 5;  // mismatching number penalty
        }
      } else {
        score -= 5; // user specified number but product lacks it
      }
    }

    // Bonus for being an audiobook (if we can detect it)
    if (product.format_type === 'audiobook' || product.content_type === 'Product') {
      score += 5;
    }
    
    return Math.round(score);
  }

  /**
   * Clean search terms for better Audible search results
   */
  cleanSearchTerm(term) {
    if (!term) return '';
    
    return term
      .replace(/\(.*?\)/g, '') // Remove parenthetical content like (Unabridged)
      .replace(/[^\w\s'-]/g, ' ') // Remove special characters except apostrophes and hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Normalize author name for better matching
   */
  normalizeAuthorName(author) {
    if (!author) return '';
    return author
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Search Audnexus using their search endpoint (legacy method - kept for fallback)
   * Note: This doesn't work as Audnexus doesn't have a public search endpoint
   */
  async searchAudnexusBooks(title, author) {
    // This method is kept for compatibility but doesn't work
    // Audnexus doesn't have a public search endpoint
    console.log(`📚 Direct Audnexus search not available (no public search endpoint)`);
    return null;
  }

  /**
   * Search for audiobook by author (limited by API design)
   */
  async searchByAuthor(title, author) {
    try {
      // Search for the author
      const authorResponse = await axios.get(`${this.audnexusBaseURL}/authors`, {
        params: {
          name: author,
          region: 'us'
        },
        timeout: 8000
      });

      const authors = authorResponse.data || [];
      console.log(`📚 Found ${authors.length} authors matching "${author}"`);

      // Find the best matching author
      const matchingAuthor = this.findBestAuthorMatch(authors, author);
      if (!matchingAuthor) {
        return {
          source: 'audnexus',
          hasAudiobook: false,
          authorFound: false,
          error: `Author "${author}" not found on Audnexus`
        };
      }

      console.log(`🎧 Found matching author: ${matchingAuthor.name} (${matchingAuthor.asin})`);

      // Get detailed author information
      const authorDetailResponse = await axios.get(`${this.audnexusBaseURL}/authors/${matchingAuthor.asin}`, {
        params: { 
          region: 'us',
          update: '0' // Don't force update to be faster
        },
        timeout: 8000
      });

      const authorDetails = authorDetailResponse.data;
      
      // Note: Audnexus author profiles typically don't include book catalogs
      // The 'books' field is often empty even for authors who have audiobooks
      const hasBooks = authorDetails.books && authorDetails.books.length > 0;
      
      console.log(`🎧 Found Audnexus author with ${authorDetails.genres?.length || 0} genres and ${authorDetails.books?.length || 0} books listed`);

      // Try to find a matching book by title if we have the author's books
      // Note: This is rare as most author profiles don't include book lists
      let matchingBook = null;
      let bookDetails = null;

      if (hasBooks) {
        console.log(`📚 Rare case: Author profile includes ${authorDetails.books.length} books`);
        
        // Try multiple matching strategies
        matchingBook = this.findBestBookMatch(authorDetails.books, title);
        
        if (matchingBook) {
          console.log(`📖 Found potential book match: "${matchingBook.title}" (ASIN: ${matchingBook.asin})`);
          
          // Try to get detailed book information
          try {
            bookDetails = await this.getAudiobookByAsin(matchingBook.asin);
            if (bookDetails) {
              console.log(`🎧 Successfully retrieved detailed audiobook data for "${title}"`);
              return bookDetails;
            }
          } catch (bookError) {
            console.warn(`⚠️ Could not get detailed book data for ${matchingBook.asin}:`, bookError.message);
          }
        } else {
          // If no exact match, try fuzzy matching on all books
          console.log(`🔍 No exact match found, trying fuzzy matching on ${authorDetails.books.length} books`);
          const fuzzyMatch = this.findFuzzyBookMatch(authorDetails.books, title);
          if (fuzzyMatch) {
            console.log(`📖 Found fuzzy book match: "${fuzzyMatch.title}" (ASIN: ${fuzzyMatch.asin})`);
            try {
              bookDetails = await this.getAudiobookByAsin(fuzzyMatch.asin);
              if (bookDetails) {
                console.log(`🎧 Successfully retrieved audiobook data via fuzzy match for "${title}"`);
                return bookDetails;
              }
            } catch (bookError) {
              console.warn(`⚠️ Could not get detailed book data for fuzzy match ${fuzzyMatch.asin}:`, bookError.message);
            }
          }
        }
      } else {
        console.log(`📚 Author profile doesn't include book catalog (typical for Audnexus)`);
      }

      // Return author info with realistic expectations
      return {
        source: 'audnexus',
        authorFound: true,
        authorName: authorDetails.name,
        authorAsin: authorDetails.asin,
        authorDescription: authorDetails.description,
        authorImage: authorDetails.image,
        genres: authorDetails.genres || [],
        bookCount: authorDetails.books?.length || 0,
        hasAudiobook: false, // Can't determine without ASIN
        confidence: 'low', // Low confidence since we can't find the specific book
        message: hasBooks && matchingBook
          ? `Found "${matchingBook.title}" by ${authorDetails.name} on Audnexus`
          : hasBooks
            ? `Author ${authorDetails.name} found on Audnexus with ${authorDetails.books.length} audiobooks, but no match for "${title}"`
            : `Author ${authorDetails.name} found on Audnexus, but book catalog not available (requires ASIN for book lookup)`,
        narrators: [], // Would need specific book data
        totalDurationMs: null,
        totalDurationMinutes: null,
        totalDurationHours: null,
        chapterCount: null,
        apiLimitation: 'Audnexus author profiles typically don\'t include book catalogs'
      };

    } catch (error) {
      console.error('❌ Author search failed:', error.message);
      return null;
    }
  }

  /**
   * Generate variations of author name for broader search
   */
  generateAuthorVariations(author) {
    const variations = [author];
    
    // Handle initials (e.g., "J.K. Rowling" -> "J. K. Rowling", "JK Rowling")
    if (author.includes('.')) {
      variations.push(author.replace(/\./g, '. ').replace(/\s+/g, ' ').trim());
      variations.push(author.replace(/\./g, '').replace(/\s+/g, ' ').trim());
    }
    
    // Handle middle names/initials
    const parts = author.split(/\s+/);
    if (parts.length > 2) {
      // Try without middle name/initial
      variations.push(`${parts[0]} ${parts[parts.length - 1]}`);
    }
    
    // Handle common name variations
    if (author.includes(' Jr.') || author.includes(' Sr.')) {
      variations.push(author.replace(/ (Jr\.|Sr\.)/, ''));
    }
    
    return [...new Set(variations)]; // Remove duplicates
  }

  /**
   * Find fuzzy book match using more flexible criteria
   */
  findFuzzyBookMatch(books, targetTitle) {
    if (!books || !books.length) return null;

    const normalizedTarget = this.normalizeTitle(targetTitle);
    const targetWords = normalizedTarget.split(/\s+/).filter(word => word.length > 2);

    let bestMatch = null;
    let bestScore = 0;

    for (const book of books) {
      const normalizedBook = this.normalizeTitle(book.title);
      const bookWords = normalizedBook.split(/\s+/).filter(word => word.length > 2);

      // Calculate similarity score
      let score = 0;
      
      // Exact match gets highest score
      if (normalizedBook === normalizedTarget) {
        return book;
      }
      
      // Substring match
      if (normalizedBook.includes(normalizedTarget) || normalizedTarget.includes(normalizedBook)) {
        score += 0.8;
      }
      
      // Word overlap score
      const commonWords = targetWords.filter(word => 
        bookWords.some(bookWord => bookWord.includes(word) || word.includes(bookWord))
      );
      const wordScore = commonWords.length / Math.max(targetWords.length, bookWords.length);
      score += wordScore * 0.6;
      
      // Length similarity bonus
      const lengthRatio = Math.min(normalizedTarget.length, normalizedBook.length) / 
                         Math.max(normalizedTarget.length, normalizedBook.length);
      score += lengthRatio * 0.2;

      if (score > bestScore && score > 0.4) { // Minimum threshold
        bestScore = score;
        bestMatch = book;
      }
    }

    if (bestMatch) {
      console.log(`🎯 Fuzzy match score: ${bestScore.toFixed(2)} for "${bestMatch.title}"`);
    }

    return bestMatch;
  }

  /**
   * Get audiobook details by ASIN (if we have it)
   */
  async getAudiobookByAsin(asin) {
    try {
      console.log(`🎧 Getting audiobook details for ASIN: ${asin}`);

      const bookResponse = await axios.get(`${this.audnexusBaseURL}/books/${asin}`, {
        params: {
          region: 'us',
          seedAuthors: 1,
          update: 0
        },
        timeout: 8000
      });

      const book = bookResponse.data;

      // Validate that we got book data
      if (!book || !book.asin) {
        console.warn(`⚠️ Invalid book data received for ASIN: ${asin}`);
        return null;
      }

      // Get chapter information for duration
      let chapterData = null;
      try {
        const chaptersResponse = await axios.get(`${this.audnexusBaseURL}/books/${asin}/chapters`, {
          params: {
            region: 'us',
            update: 0
          },
          timeout: 8000
        });
        chapterData = chaptersResponse.data;
        console.log(`📚 Retrieved chapter data for ${asin}: ${chapterData?.chapters?.length || 0} chapters`);
      } catch (chapterError) {
        console.warn('⚠️ Could not fetch chapter data:', chapterError.message);
      }

      return this.parseAudnexusBook(book, chapterData);

    } catch (error) {
      console.error('❌ Failed to get audiobook by ASIN:', error.message);
      
      // Check if it's a 404 (book not found) vs other errors
      if (error.response?.status === 404) {
        console.log(`📚 Book with ASIN ${asin} not found on Audnexus`);
        return null;
      }
      
      // For other errors, we might want to retry or handle differently
      throw error;
    }
  }

  /**
   * Search for audiobook by exact ASIN (if you already have the ASIN)
   */
  async searchByASIN(asin) {
    try {
      console.log(`🎯 Direct ASIN search: ${asin}`);
      return await this.getAudiobookByAsin(asin);
    } catch (error) {
      console.error(`❌ Direct ASIN search failed for ${asin}:`, error.message);
      return null;
    }
  }

  /**
   * Parse Audnexus book data into our standard format
   */
  parseAudnexusBook(book, chapterData = null) {
    console.log(`📖 Parsing Audnexus book data for: "${book.title}" (ASIN: ${book.asin})`);
    
    const narrators = book.narrators?.map(n => n.name) || [];
    console.log(`🎙️ Found ${narrators.length} narrators: ${narrators.join(', ')}`);
    
    let totalDurationMs = null;
    let totalDurationMinutes = null;
    let totalDurationHours = null;
    let chapterCount = null;

    // Calculate duration from runtime or chapters
    if (book.runtimeLengthMin) {
      totalDurationMinutes = book.runtimeLengthMin;
      totalDurationMs = book.runtimeLengthMin * 60 * 1000;
      totalDurationHours = Math.round(book.runtimeLengthMin / 60 * 10) / 10;
      console.log(`⏱️ Duration from book data: ${totalDurationHours} hours (${totalDurationMinutes} minutes)`);
    } else if (book.runtimeLengthSec) {
      totalDurationMinutes = Math.round(book.runtimeLengthSec / 60);
      totalDurationMs = book.runtimeLengthSec * 1000;
      totalDurationHours = Math.round(book.runtimeLengthSec / 3600 * 10) / 10;
      console.log(`⏱️ Duration from book seconds: ${totalDurationHours} hours (${totalDurationMinutes} minutes)`);
    } else if (chapterData?.runtimeLengthMs) {
      totalDurationMs = chapterData.runtimeLengthMs;
      totalDurationMinutes = Math.round(chapterData.runtimeLengthMs / 60000);
      totalDurationHours = Math.round(chapterData.runtimeLengthMs / 3600000 * 10) / 10;
      console.log(`⏱️ Duration from chapter data: ${totalDurationHours} hours (${totalDurationMinutes} minutes)`);
    } else if (chapterData?.runtimeLengthSec) {
      totalDurationMs = chapterData.runtimeLengthSec * 1000;
      totalDurationMinutes = Math.round(chapterData.runtimeLengthSec / 60);
      totalDurationHours = Math.round(chapterData.runtimeLengthSec / 3600 * 10) / 10;
      console.log(`⏱️ Duration from chapter seconds: ${totalDurationHours} hours (${totalDurationMinutes} minutes)`);
    } else {
      console.log(`⏱️ No duration data found in book or chapter data`);
    }

    if (chapterData?.chapters) {
      chapterCount = chapterData.chapters.length;
      console.log(`📚 Found ${chapterCount} chapters`);
    }

    const result = {
      source: 'audnexus',
      hasAudiobook: true,
      title: book.title,
      asin: book.asin,
      narrators: narrators,
      totalDurationMs: totalDurationMs,
      totalDurationMinutes: totalDurationMinutes,
      totalDurationHours: totalDurationHours,
      chapterCount: chapterCount,
      publisher: book.publisherName,
      description: book.description,
      summary: book.summary,
      copyright: book.copyright,
      rating: book.rating,
      releaseDate: book.releaseDate,
      publishedDate: book.releaseDate,
      isbn: book.isbn,
      language: book.language,
      isAdult: book.isAdult,
      formatType: book.formatType,
      image: book.image,
      genres: book.genres || [],
      authors: book.authors?.map(a => a.name) || []
    };

    console.log(`✅ Successfully parsed audiobook data for "${book.title}"`);
    return result;
  }

  /**
   * Find the best matching author from search results
   */
  findBestAuthorMatch(authors, targetAuthor) {
    if (!authors.length) return null;

    const normalizedTarget = this.normalizeAuthorName(targetAuthor);

    // Look for exact matches first
    let bestMatch = authors.find(author => 
      this.normalizeAuthorName(author.name) === normalizedTarget
    );

    if (bestMatch) return bestMatch;

    // Look for partial matches
    bestMatch = authors.find(author => {
      const normalizedAuthor = this.normalizeAuthorName(author.name);
      return normalizedAuthor.includes(normalizedTarget) || 
             normalizedTarget.includes(normalizedAuthor);
    });

    if (bestMatch) return bestMatch;

    // Look for word matches (handles "J.K. Rowling" vs "J. K. Rowling")
    bestMatch = authors.find(author => {
      const authorWords = this.normalizeAuthorName(author.name).split(/\s+/);
      const targetWords = normalizedTarget.split(/\s+/);
      
      // Check if last names match
      const authorLastName = authorWords[authorWords.length - 1];
      const targetLastName = targetWords[targetWords.length - 1];
      
      return authorLastName === targetLastName;
    });

    return bestMatch || authors[0]; // Fallback to first result
  }

  /**
   * Normalize title for comparison
   */
  normalizeTitle(title) {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Find the best matching book from an author's book list
   */
  findBestBookMatch(books, targetTitle) {
    if (!books || !books.length) return null;

    const normalizedTarget = this.normalizeTitle(targetTitle);

    // Look for exact matches first
    let bestMatch = books.find(book => 
      this.normalizeTitle(book.title) === normalizedTarget
    );

    if (bestMatch) return bestMatch;

    // Look for partial matches
    bestMatch = books.find(book => {
      const normalizedBook = this.normalizeTitle(book.title);
      return normalizedBook.includes(normalizedTarget) || 
             normalizedTarget.includes(normalizedBook);
    });

    if (bestMatch) return bestMatch;

    // Look for word matches (handles subtitles and variations)
    bestMatch = books.find(book => {
      const bookWords = this.normalizeTitle(book.title).split(/\s+/);
      const targetWords = normalizedTarget.split(/\s+/);
      
      // Check if most significant words match
      const significantWords = targetWords.filter(word => word.length > 3);
      const matchingWords = significantWords.filter(word => 
        bookWords.some(bookWord => bookWord.includes(word) || word.includes(bookWord))
      );
      
      return matchingWords.length >= Math.min(2, significantWords.length);
    });

    return bestMatch; // May be null if no good match found
  }

  /**
   * Search for audiobook by ISBN (experimental - may not work with all ISBNs)
   */
  async searchByISBN(isbn) {
    try {
      console.log(`📖 Attempting ISBN search on Audnexus: ${isbn}`);
      
      // Note: Audnexus doesn't have a direct ISBN search endpoint
      // This is a placeholder for potential future functionality
      // For now, we'll return null to indicate this method didn't find anything
      
      // If Audnexus adds ISBN search in the future, the implementation would be:
      // const response = await axios.get(`${this.audnexusBaseURL}/books/isbn/${isbn}`, {
      //   params: { region: 'us' },
      //   timeout: 8000
      // });
      
      console.log(`📖 ISBN search not supported by Audnexus API`);
      return null;
      
    } catch (error) {
      console.warn('⚠️ ISBN search failed:', error.message);
      return null;
    }
  }

  /**
   * Generate possible ASINs based on common patterns (experimental)
   * This is highly speculative and unlikely to work, but worth trying
   */
  generatePossibleASINs(title, author) {
    // This is experimental and likely won't work
    // ASINs are Amazon-specific identifiers that can't be easily guessed
    // But we could try some patterns if we had more data about how they're generated
    
    // For now, return empty array as ASIN generation is not feasible
    return [];
  }

  /**
   * Enrich book data with audiobook information from Audnexus
   */
  async enrichWithAudiobookData(book) {
    try {
      console.log(`🎧 Searching for audiobook data: "${book.title}" by ${book.authors?.join(', ')}`);

      const primaryAuthor = book.authors?.[0];
      const isbn = book.isbn13 || book.isbn10; // Prefer ISBN-13, fallback to ISBN-10
      
      // Check if Google hints suggest this might be an audiobook
      const googleHints = book.googleAudiobookHints;
      const googleSuggestsAudiobook = googleHints?.markedAsAudiobook || 
                                     googleHints?.confidence === 'high';
      
      // Search Audnexus for audiobook data with ISBN if available
      const audnexusData = await this.searchAudnexusAudiobook(book.title, primaryAuthor, isbn);
      
      if (audnexusData) {
        if (audnexusData.authorFound || audnexusData.hasAudiobook) {
          console.log(`🎧 Found audiobook data on Audnexus for "${book.title}"`);
        } else {
          console.log(`📚 No audiobook data found for "${book.title}": ${audnexusData.error || 'Unknown reason'}`);
        }
        
        // If Google suggests audiobook but Audnexus doesn't find it, enhance the message
        if (googleSuggestsAudiobook && !audnexusData.hasAudiobook && !audnexusData.authorFound) {
          audnexusData.googleHint = {
            suggestsAudiobook: true,
            confidence: googleHints.confidence,
            reason: googleHints.markedAsAudiobook ? 'Google Books marks this as an audiobook' : 
                   googleHints.textToSpeechAllowed ? 'Google Books allows text-to-speech' : 'Google Books has audiobook links',
            message: 'Google Books suggests this may have an audiobook version, but it wasn\'t found in Audnexus. It might be available on Google Play Books or other platforms.'
          };
        }
        
        return {
          ...book,
          audiobookData: audnexusData
        };
      }

      // No audiobook data found
      console.log(`📚 No audiobook data found for "${book.title}"`);
      
      // Create basic response with Google hints if available
      const basicResponse = {
        hasAudiobook: false,
        source: 'none'
      };
      
      if (googleSuggestsAudiobook) {
        basicResponse.googleHint = {
          suggestsAudiobook: true,
          confidence: googleHints.confidence,
          reason: googleHints.markedAsAudiobook ? 'Google Books marks this as an audiobook' : 
                 googleHints.textToSpeechAllowed ? 'Google Books allows text-to-speech' : 'Google Books has audiobook links',
          message: 'Google Books suggests this may have an audiobook version. Check Google Play Books or other audiobook platforms.'
        };
      }
      
      return {
        ...book,
        audiobookData: basicResponse
      };

    } catch (error) {
      console.error('❌ Audiobook enrichment failed:', error.message);
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

  /**
   * Search for multiple audiobook matches for user selection
   * Uses Audible's search API to find potential matches, then gets details from Audnexus
   */
  async searchAudnexusForUserSelection(title, author) {
    try {
      console.log(`🔍 Searching for audiobook matches: "${title}" by ${author}`);

      if (!author) {
        throw new Error('Author is required for audiobook search');
      }

      const foundBooks = [];

      // Strategy 1: Use Audible's search API to find potential ASINs
      console.log(`🎯 Searching Audible API for potential matches`);
      
      try {
        const audibleResults = await this.searchAudibleForASINs(title, author);
        if (audibleResults && audibleResults.length > 0) {
          console.log(`🔍 Found ${audibleResults.length} potential ASINs from Audible`);
          
          // Try to get Audnexus data for each ASIN
          for (const audibleResult of audibleResults) {
            try {
              console.log(`🎯 Getting Audnexus data for ASIN: ${audibleResult.asin} - "${audibleResult.title}"`);
              const audnexusData = await this.getAudiobookByAsin(audibleResult.asin);
              
              if (audnexusData && audnexusData.hasAudiobook) {
                const relevanceScore = this.calculateRelevanceScore(audnexusData, title, author);
                foundBooks.push({
                  ...audnexusData,
                  relevanceScore,
                  audibleScore: audibleResult.score,
                  matchReason: `Found via Audible search (Audible score: ${audibleResult.score}, relevance: ${relevanceScore})`,
                  searchMethod: 'audible_to_audnexus'
                });
                console.log(`✅ Successfully got Audnexus data for "${audnexusData.title}" (ASIN: ${audibleResult.asin})`);
              } else {
                // Even if Audnexus doesn't have full data, we can still show the Audible result
                foundBooks.push({
                  hasAudiobook: true,
                  source: 'audible_only',
                  asin: audibleResult.asin,
                  title: audibleResult.title,
                  authors: audibleResult.authors,
                  narrators: audibleResult.narrator ? [audibleResult.narrator] : [],
                  relevanceScore: audibleResult.score,
                  audibleScore: audibleResult.score,
                  matchReason: `Found via Audible search (score: ${audibleResult.score}) - Limited data available`,
                  searchMethod: 'audible_only',
                  limitation: 'Full audiobook data not available in Audnexus database'
                });
                console.log(`📚 Added Audible-only result for "${audibleResult.title}" (ASIN: ${audibleResult.asin})`);
              }
            } catch (asinError) {
              console.log(`⚠️ Failed to get Audnexus data for ASIN ${audibleResult.asin}: ${asinError.message}`);
              
              // Still add the Audible result even if Audnexus fails
              foundBooks.push({
                hasAudiobook: true,
                source: 'audible_only',
                asin: audibleResult.asin,
                title: audibleResult.title,
                authors: audibleResult.authors,
                narrators: audibleResult.narrator ? [audibleResult.narrator] : [],
                relevanceScore: audibleResult.score,
                audibleScore: audibleResult.score,
                matchReason: `Found via Audible search (score: ${audibleResult.score}) - Audnexus lookup failed`,
                searchMethod: 'audible_only',
                limitation: 'Audnexus lookup failed, showing Audible data only'
              });
            }
          }
        }
      } catch (audibleError) {
        console.log(`⚠️ Audible search failed: ${audibleError.message}`);
      }

      // Strategy 2: Try direct Audnexus author search as fallback
      let authorInfo = null;
      try {
        console.log(`🔍 Trying Audnexus author search as fallback`);
        const authorResponse = await axios.get(`${this.audnexusBaseURL}/authors`, {
          params: {
            name: author,
            region: 'us'
          },
          timeout: 8000
        });

        const authors = authorResponse.data || [];
        if (authors.length > 0) {
          const bestAuthor = this.findBestAuthorMatch(authors, author);
          if (bestAuthor) {
            console.log(`👤 Found author on Audnexus: ${bestAuthor.name} (${bestAuthor.asin})`);
            
            // Get author details
            try {
              const authorDetailResponse = await axios.get(`${this.audnexusBaseURL}/authors/${bestAuthor.asin}`, {
                params: { region: 'us' },
                timeout: 8000
              });
              authorInfo = authorDetailResponse.data;
              
              // If the author has books listed, try to find matches
              if (authorInfo.books && authorInfo.books.length > 0) {
                console.log(`📚 Author has ${authorInfo.books.length} books in Audnexus`);
                
                const bookMatch = this.findBestBookMatch(authorInfo.books, title);
                if (bookMatch && !foundBooks.find(b => b.asin === bookMatch.asin)) {
                  try {
                    const bookDetails = await this.getAudiobookByAsin(bookMatch.asin);
                    if (bookDetails && bookDetails.hasAudiobook) {
                      const relevanceScore = this.calculateRelevanceScore(bookDetails, title, author);
                      foundBooks.push({
                        ...bookDetails,
                        relevanceScore,
                        matchReason: `Found in author's Audnexus catalog (score: ${relevanceScore})`,
                        searchMethod: 'audnexus_author_catalog'
                      });
                      console.log(`✅ Found book in author catalog: "${bookDetails.title}"`);
                    }
                  } catch (bookError) {
                    console.log(`⚠️ Failed to get book details for ${bookMatch.asin}: ${bookError.message}`);
                  }
                }
              }
            } catch (detailError) {
              console.warn(`⚠️ Could not get author details: ${detailError.message}`);
              authorInfo = bestAuthor;
            }
          }
        }
      } catch (authorError) {
        console.warn(`⚠️ Audnexus author search failed: ${authorError.message}`);
      }

      // Remove duplicates and sort by relevance score
      const uniqueBooks = foundBooks.reduce((acc, current) => {
        const existing = acc.find(book => book.asin === current.asin);
        if (!existing) {
          acc.push(current);
        } else if (current.relevanceScore > existing.relevanceScore) {
          // Replace with higher scoring version
          const index = acc.indexOf(existing);
          acc[index] = current;
        }
        return acc;
      }, []);

      uniqueBooks.sort((a, b) => b.relevanceScore - a.relevanceScore);

      if (uniqueBooks.length > 0) {
        console.log(`🎉 Found ${uniqueBooks.length} unique audiobook matches`);
        
        return {
          success: true,
          searchQuery: { title, author },
          results: [{
            author: authorInfo || { name: author, asin: null },
            books: uniqueBooks,
            note: `Found ${uniqueBooks.length} potential matches via Audible search and Audnexus lookup. Click to select the best match.`
          }],
          totalAuthors: 1,
          message: `Found ${uniqueBooks.length} audiobook matches for "${title}" by ${author}`
        };
      }

      // No books found, but provide author info if available
      if (authorInfo) {
        return {
          success: true,
          searchQuery: { title, author },
          results: [{
            author: {
              name: authorInfo.name,
              asin: authorInfo.asin,
              description: authorInfo.description,
              image: authorInfo.image
            },
            books: [],
            note: `Author "${authorInfo.name}" found on Audnexus, but no audiobooks discovered for "${title}". The book may not have an audiobook version or may not be indexed in the databases.`
          }],
          totalAuthors: 1,
          message: `Author "${author}" found but no audiobooks discovered for "${title}"`
        };
      }

      // No results at all
      return {
        success: false,
        error: `No audiobooks or authors found for "${title}" by ${author}`,
        suggestion: 'The book may not have an audiobook version, or it may not be available in the US market. Try searching with different title variations or check the author name spelling.'
      };

    } catch (error) {
      console.error('❌ Audiobook user selection search failed:', error.message);
      return {
        success: false,
        error: `Search failed: ${error.message}`,
        suggestion: 'Try again with a different search term or check your internet connection'
      };
    }
  }

  /**
   * Get known audiobook ASINs for testing purposes
   * In a real implementation, this might query a database or external service
   */
  getKnownAudiobookASINs(title, author) {
    const knownBooks = [];
    
    // Add some popular audiobooks for testing
    // These are real ASINs that can be used for demonstration
    const popularAudiobooks = [
      { asin: 'B073H9PF2D', title: 'Becoming', author: 'Michelle Obama', reason: 'Popular audiobook' },
      { asin: 'B0752ZNDKD', title: 'Educated', author: 'Tara Westover', reason: 'Popular audiobook' },
      { asin: 'B07B4F5PSF', title: 'Atomic Habits', author: 'James Clear', reason: 'Popular audiobook' },
      { asin: 'B07MZTX7JZ', title: 'Where the Crawdads Sing', author: 'Delia Owens', reason: 'Popular audiobook' },
      { asin: 'B07BVNVZ3Q', title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', reason: 'Popular audiobook' }
    ];

    // Check if the search matches any known books
    const normalizedTitle = this.normalizeTitle(title);
    const normalizedAuthor = this.normalizeAuthorName(author);

    for (const book of popularAudiobooks) {
      const bookTitleNorm = this.normalizeTitle(book.title);
      const bookAuthorNorm = this.normalizeAuthorName(book.author);
      
      // Check for title matches
      if (bookTitleNorm.includes(normalizedTitle) || normalizedTitle.includes(bookTitleNorm)) {
        knownBooks.push({
          asin: book.asin,
          reason: `Title similarity to "${book.title}"`
        });
      }
      
      // Check for author matches
      if (bookAuthorNorm.includes(normalizedAuthor) || normalizedAuthor.includes(bookAuthorNorm)) {
        knownBooks.push({
          asin: book.asin,
          reason: `Author similarity to ${book.author}`
        });
      }
    }

    // For Harry Potter specifically, add some known ASINs
    if (normalizedTitle.includes('harry potter')) {
      knownBooks.push(
        { asin: 'B017V4IM1G', reason: 'Harry Potter series audiobook' },
        { asin: 'B017V4IMVQ', reason: 'Harry Potter series audiobook' },
        { asin: 'B017V4NUPO', reason: 'Harry Potter series audiobook' }
      );
    }

    // For John Scalzi specifically
    if (normalizedAuthor.includes('scalzi')) {
      knownBooks.push(
        { asin: 'B0CCQZX8QS', reason: 'John Scalzi audiobook' },
        { asin: 'B07MZTX7JZ', reason: 'John Scalzi audiobook' }
      );
    }

    return knownBooks.slice(0, 5); // Limit to prevent too many requests
  }

  /**
   * Calculate relevance score between found book and target
   */
  calculateRelevanceScore(book, targetTitle, targetAuthor) {
    let score = 0;
    
    const normalizedBookTitle = this.normalizeTitle(book.title || '');
    const normalizedTargetTitle = this.normalizeTitle(targetTitle);
    const normalizedBookAuthor = this.normalizeAuthorName((book.authors || [])[0] || '');
    const normalizedTargetAuthor = this.normalizeAuthorName(targetAuthor);
    
    // Title matching (most important - 60 points max)
    if (normalizedBookTitle === normalizedTargetTitle) {
      score += 60;
    } else if (normalizedBookTitle.includes(normalizedTargetTitle) || normalizedTargetTitle.includes(normalizedBookTitle)) {
      score += 45;
    } else {
      // Word overlap for title
      const titleWords = normalizedTargetTitle.split(/\s+/);
      const bookTitleWords = normalizedBookTitle.split(/\s+/);
      const commonWords = titleWords.filter(word => 
        bookTitleWords.some(bookWord => bookWord.includes(word) || word.includes(bookWord))
      );
      score += (commonWords.length / titleWords.length) * 30;
    }
    
    // Author matching (40 points max)
    if (normalizedBookAuthor === normalizedTargetAuthor) {
      score += 40;
    } else if (normalizedBookAuthor.includes(normalizedTargetAuthor) || normalizedTargetAuthor.includes(normalizedBookAuthor)) {
      score += 30;
    } else {
      // Partial author match
      const authorWords = normalizedTargetAuthor.split(/\s+/);
      const bookAuthorWords = normalizedBookAuthor.split(/\s+/);
      const commonAuthorWords = authorWords.filter(word => 
        bookAuthorWords.some(bookWord => bookWord.includes(word) || word.includes(bookWord))
      );
      score += (commonAuthorWords.length / authorWords.length) * 20;
    }
    
    // Numeric volume indicator adjustment ------------------------------------------------
    const targetNumberMatch = normalizedTargetTitle.match(/\d+/);
    const bookNumberMatch = normalizedBookTitle.match(/\d+/);

    if (!targetNumberMatch && bookNumberMatch) {
      score -= 10;
    } else if (targetNumberMatch) {
      if (bookNumberMatch) {
        if (bookNumberMatch[0] === targetNumberMatch[0]) {
          score += 10;
        } else {
          score -= 5;
        }
      } else {
        score -= 5;
      }
    }

    return Math.round(score);
  }

  /**
   * Get audiobook details by ASIN for user-selected book
   */
  async getSelectedAudiobook(asin, originalTitle, originalAuthor) {
    try {
      console.log(`🎯 Getting selected audiobook: ${asin} for "${originalTitle}" by ${originalAuthor}`);
      
      const bookDetails = await this.getAudiobookByAsin(asin);
      
      if (bookDetails) {
        // Add context about the selection
        bookDetails.selectionContext = {
          originalTitle,
          originalAuthor,
          selectedTitle: bookDetails.title,
          selectedAuthors: bookDetails.authors,
          userSelected: true
        };
        
        console.log(`✅ Successfully retrieved user-selected audiobook: "${bookDetails.title}"`);
        return bookDetails;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Failed to get selected audiobook ${asin}:`, error.message);
      throw error;
    }
  }
}

module.exports = AudiobookService; 