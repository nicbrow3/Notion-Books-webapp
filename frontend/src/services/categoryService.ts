export interface CategorySettings {
  ignoredCategories: string[];
  categoryMappings: { [key: string]: string }; // Maps similar categories to preferred names
  fieldDefaults: { [fieldName: string]: 'audiobook' | 'original' | number }; // Default sources for each field
  overriddenDefaultMappings?: string[]; // Categories where default mapping should be ignored
  autoFilterLocations?: boolean; // Automatically filter out location genres
  splitCommas?: boolean; // Split genres by commas
  splitAmpersand?: boolean; // Split genres by '&' or ' and '
}

export class CategoryService {
  private static readonly STORAGE_KEY = 'notion-books-category-settings';

  // Default category mappings for common variations
  // Note: Compound genres like "Science Fiction & Fantasy" will be split before mapping
  private static readonly DEFAULT_MAPPINGS: { [key: string]: string } = {
    'sci-fi': 'Science Fiction',
    'scifi': 'Science Fiction',
    'science fiction': 'Science Fiction',
    'sf': 'Science Fiction',
    'fantasy fiction': 'Fantasy',
    'fiction / fantasy': 'Fantasy',
    'young adult fiction': 'Young Adult',
    'ya fiction': 'Young Adult',
    'ya': 'Young Adult',
    'teen fiction': 'Young Adult',
    'juvenile fiction': 'Young Adult',
    'children\'s books': 'Children\'s Fiction',
    'kids books': 'Children\'s Fiction',
    'mystery & detective': 'Mystery',
    'mystery fiction': 'Mystery',
    'detective fiction': 'Mystery',
    'thriller': 'Thriller',
    'suspense': 'Thriller',
    'romance fiction': 'Romance',
    'love stories': 'Romance',
    'historical fiction': 'Historical Fiction',
    'historical novel': 'Historical Fiction',
    'biography & autobiography': 'Biography',
    'biographies': 'Biography',
    'autobiography': 'Biography',
    'self-help': 'Self-Help',
    'self help': 'Self-Help',
    'personal development': 'Self-Help',
    'business & economics': 'Business',
    'business': 'Business',
    'economics': 'Business',
    'health & fitness': 'Health',
    'fitness': 'Health',
    'cooking': 'Cooking',
    'cookbooks': 'Cooking',
    'recipes': 'Cooking',
    'travel': 'Travel',
    'travel guides': 'Travel',
    'guidebooks': 'Travel',
    'computers': 'Technology',
    'technology': 'Technology',
    'programming': 'Technology',
    'software': 'Technology'
  };

  /**
   * Load category settings from localStorage
   */
  static loadSettings(): CategorySettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Start with default mappings
        const mappings = { ...this.DEFAULT_MAPPINGS };
        
        // Apply custom mappings (overriding defaults where applicable)
        if (parsed.categoryMappings) {
          Object.entries(parsed.categoryMappings).forEach(([key, value]: [string, any]) => {
            mappings[key] = value;
          });
        }
        
        // Remove any default mappings that have been explicitly overridden
        if (parsed.overriddenDefaults && Array.isArray(parsed.overriddenDefaults)) {
          parsed.overriddenDefaults.forEach((key: string) => {
            delete mappings[key];
          });
        }
        
        return {
          ignoredCategories: parsed.ignoredCategories || [],
          categoryMappings: mappings,
          fieldDefaults: parsed.fieldDefaults || {},
          overriddenDefaultMappings: parsed.overriddenDefaultMappings || [],
          autoFilterLocations: parsed.autoFilterLocations ?? false,
          splitCommas: parsed.splitCommas ?? true,
          splitAmpersand: parsed.splitAmpersand ?? true
        };
      }
    } catch (error) {
      console.error('Failed to load category settings:', error);
    }
    
    return {
      ignoredCategories: [],
      categoryMappings: { ...this.DEFAULT_MAPPINGS },
      fieldDefaults: {},
      overriddenDefaultMappings: [],
      autoFilterLocations: false,
      splitCommas: true,
      splitAmpersand: true
    };
  }

  /**
   * Save category settings to localStorage
   */
  static saveSettings(settings: CategorySettings): void {
    try {
      // We need to track both custom mappings and explicit overrides of default mappings
      const customMappings: { [key: string]: string } = {};
      const overriddenDefaults: string[] = [];
      
      // First, find all explicitly defined mappings (different from defaults)
      Object.entries(settings.categoryMappings).forEach(([key, value]) => {
        if (this.DEFAULT_MAPPINGS[key] !== value) {
          // This is either a custom mapping or a modified default
          customMappings[key] = value;
        }
      });
      
      // Now find default mappings that have been removed (they won't be in settings.categoryMappings)
      Object.keys(this.DEFAULT_MAPPINGS).forEach(key => {
        if (!(key in settings.categoryMappings)) {
          // This default mapping has been explicitly removed by the user
          overriddenDefaults.push(key);
        }
      });

      const toSave = {
        ignoredCategories: settings.ignoredCategories,
        categoryMappings: customMappings,
        overriddenDefaults: overriddenDefaults,
        fieldDefaults: settings.fieldDefaults,
        overriddenDefaultMappings: settings.overriddenDefaultMappings || [],
        autoFilterLocations: settings.autoFilterLocations || false,
        splitCommas: settings.splitCommas ?? true,
        splitAmpersand: settings.splitAmpersand ?? true
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
      
      // Dispatch a custom event to notify other components of the change
      window.dispatchEvent(new CustomEvent('categorySettingsChanged', { 
        detail: settings 
      }));
    } catch (error) {
      console.error('Failed to save category settings:', error);
    }
  }

  /**
   * Split comma-separated categories and clean them up
   */
  static splitCategories(categories: string[], options: { splitCommas: boolean; splitAmpersand: boolean }): string[] {
    const split: string[] = [];
    
    // Well-known compound genres that should not be split
    const preservedCompoundGenres = [
      'health & fitness',
      'health & wellness',
      'home & garden',
      'biography & autobiography',
      'business & economics',
      // All other compound genres will be split into their component genres
    ];
    
    categories.forEach(category => {
      const lowerCategory = category.toLowerCase();
      
      // Check if this is a preserved compound genre
      const isPreservedCompound = preservedCompoundGenres.some(preserved => 
        lowerCategory === preserved || lowerCategory.includes(preserved)
      );
      
      if (isPreservedCompound) {
        // Don't split compound genres, just clean them up
        split.push(category.trim());
        return;
      }
      
      // Start with the original category, then apply splitting rules in order
      let parts = [category];
      
      // First, split by comma if enabled
      if (options.splitCommas && category.includes(',')) {
        parts = category.split(',').map(part => part.trim()).filter(part => part.length > 0);
      }
      
      // Then, split each part by ampersand and " and " if enabled
      if (options.splitAmpersand) {
        const finalParts: string[] = [];
        
        parts.forEach(part => {
          let subParts = [part];
          
          // Split by ampersand
          if (part.includes('&')) {
            subParts = part.split('&').map(p => p.trim()).filter(p => p.length > 0);
          }
          
          // Then split each subpart by " and " (with spaces to avoid splitting words like "brand")
          const andSplitParts: string[] = [];
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
      
      // Add all processed parts
      split.push(...parts.filter(part => part.length > 0));
    });
    
    return split.filter(cat => cat.length > 0);
  }

  /**
   * Split comma-separated categories and clean them up, while preserving audiobook genres
   */
  static splitCategoriesWithAudiobookPreservation(categories: string[], audiobookGenres: string[] = [], options: { splitCommas: boolean; splitAmpersand: boolean }): string[] {
    const split: string[] = [];
    
    // Well-known compound genres that should not be split
    const preservedCompoundGenres = [
      'health & fitness',
      'health & wellness',
      'home & garden',
      'biography & autobiography',
      'business & economics',
      // All other compound genres will be split into their component genres
    ];
    
    // Create a lowercase set of audiobook genres for comparison
    const audiobookGenresLower = audiobookGenres.map(g => g.toLowerCase());
    
    categories.forEach(category => {
      const lowerCategory = category.toLowerCase();
      
      // Check if this is a preserved compound genre that we should never split
      const isPreservedCompound = preservedCompoundGenres.some(preserved => 
        lowerCategory === preserved || lowerCategory.includes(preserved)
      );
      
      if (isPreservedCompound) {
        // Don't split preserved compound genres, just clean them up
        split.push(category.trim());
        return;
      }
      
      // Check if this category is an audiobook genre - if so, still apply splitting
      // This ensures consistency regardless of when genres are loaded
      if (audiobookGenresLower.includes(lowerCategory)) {
        // Even for audiobook genres, apply splitting if it contains & or and
        if (options.splitAmpersand && (category.includes('&') || category.toLowerCase().includes(' and '))) {
          let parts = [category];
          
          if (options.splitAmpersand) {
            // Split by ampersand
            if (category.includes('&')) {
              parts = category.split('&');
            }
          }
          
          // Then split each part by " and " (with spaces to avoid splitting words like "brand")
          const finalParts: string[] = [];
          parts.forEach(part => {
            if (options.splitAmpersand && part.toLowerCase().includes(' and ')) {
              const andParts = part.split(/ and /i) // Case insensitive split
                .map(p => p.trim())
                .filter(p => p.length > 0);
              finalParts.push(...andParts);
            } else {
              finalParts.push(part.trim());
            }
          });
          
          split.push(...finalParts.filter(part => part.length > 0));
        } else {
          // For non-compound audiobook genres, preserve as is
          split.push(category.trim());
        }
        return;
      }
      
      // Start with the original category, then apply splitting rules in order
      let parts = [category];
      
      // First, split by comma if enabled
      if (options.splitCommas && category.includes(',')) {
        parts = category.split(',').map(part => part.trim()).filter(part => part.length > 0);
      }
      
      // Then, split each part by ampersand and " and " if enabled
      if (options.splitAmpersand) {
        const finalParts: string[] = [];
        
        parts.forEach(part => {
          let subParts = [part];
          
          // Split by ampersand
          if (part.includes('&')) {
            subParts = part.split('&').map(p => p.trim()).filter(p => p.length > 0);
          }
          
          // Then split each subpart by " and " (with spaces to avoid splitting words like "brand")
          const andSplitParts: string[] = [];
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
      
      // Add all processed parts
      split.push(...parts.filter(part => part.length > 0));
    });
    
    return split.filter(cat => cat.length > 0);
  }

  /**
   * Apply category mappings and remove ignored categories
   */
  static processCategories(
    categories: string[], 
    settings: CategorySettings, 
    audiobookData?: any
  ): {
    processed: string[];
    ignored: string[];
    mapped: { [original: string]: string };
  } {
    // Determine which splitting function to use based on audiobook data availability
    let splitCategories: string[];
    
    if (audiobookData?.hasAudiobook && audiobookData.genres && audiobookData.genres.length > 0) {
      const cleanAudiobookGenres = audiobookData.genres
        .map((genre: any) => typeof genre === 'string' ? genre : (genre as any)?.name)
        .filter(Boolean) as string[];
        
      if (cleanAudiobookGenres.length > 0) {
        console.log(`Processing categories with audiobook genre splitting (${cleanAudiobookGenres.length} genres)`);
      }
      // Use the audiobook-aware splitting method, but ensure compound genres still get split
      splitCategories = this.splitCategoriesWithAudiobookPreservation(categories, cleanAudiobookGenres, { splitCommas: settings.splitCommas !== false, splitAmpersand: settings.splitAmpersand !== false });
    } else {
      // For all other cases, use the standard splitting method
      splitCategories = this.splitCategories(categories, { splitCommas: settings.splitCommas !== false, splitAmpersand: settings.splitAmpersand !== false });
    }
    
    const processed: string[] = [];
    const ignored: string[] = [];
    const mapped: { [original: string]: string } = {};

    // Common location-based genres to filter when autoFilterLocations is enabled
    const locationBasedGenres = [
      'england', 'london', 'new york', 'paris', 'rome', 'italy', 'japan', 'china', 'france', 
      'scotland', 'ireland', 'australia', 'united states', 'america', 'california', 'texas',
      'canada', 'india', 'russia', 'germany', 'spain', 'mexico', 'brazil', 'africa',
      'asia', 'europe', 'north america', 'south america'
    ];

    splitCategories.forEach(category => {
      const lowerCategory = category.toLowerCase();
      
      // Check if category should be ignored
      if (settings.ignoredCategories.some(ignored => ignored.toLowerCase() === lowerCategory)) {
        ignored.push(category);
        return;
      }

      // Check if category is a location-based genre and should be filtered out
      if (settings.autoFilterLocations && locationBasedGenres.includes(lowerCategory)) {
        ignored.push(category);
        return;
      }

      // Check if category has a mapping
      const mappedCategory = settings.categoryMappings[lowerCategory];
      if (mappedCategory) {
        mapped[category] = mappedCategory;
        if (!processed.includes(mappedCategory)) {
          processed.push(mappedCategory);
        }
      } else {
        // Capitalize first letter of each word for consistency
        const formatted = this.formatCategoryName(category);
        if (!processed.includes(formatted)) {
          processed.push(formatted);
        }
      }
    });

    return { processed: processed.sort(), ignored, mapped };
  }

  /**
   * Format category name with proper capitalization
   */
  static formatCategoryName(category: string): string {
    return category
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Add a category to the ignored list
   */
  static addIgnoredCategory(category: string): void {
    const settings = this.loadSettings();
    const lowerCategory = category.toLowerCase();
    
    if (!settings.ignoredCategories.some(ignored => ignored.toLowerCase() === lowerCategory)) {
      settings.ignoredCategories.push(category);
      this.saveSettings(settings);
    }
  }

  /**
   * Remove a category from the ignored list
   */
  static removeIgnoredCategory(category: string): void {
    const settings = this.loadSettings();
    const lowerCategory = category.toLowerCase();
    
    settings.ignoredCategories = settings.ignoredCategories.filter(
      ignored => ignored.toLowerCase() !== lowerCategory
    );
    this.saveSettings(settings);
  }

  /**
   * Add or update a category mapping
   */
  static addCategoryMapping(from: string, to: string): void {
    const settings = this.loadSettings();
    settings.categoryMappings[from.toLowerCase()] = to;
    this.saveSettings(settings);
  }

  /**
   * Remove a category mapping
   */
  static removeCategoryMapping(from: string): void {
    const settings = this.loadSettings();
    delete settings.categoryMappings[from.toLowerCase()];
    this.saveSettings(settings);
  }

  /**
   * Check if a category is currently mapped to another category
   */
  static isCategoryMapped(category: string): { isMapped: boolean; mappedTo?: string; mappedFrom?: string } {
    const settings = this.loadSettings();
    const lowerCategory = category.toLowerCase();
    
    // Check if this category is mapped FROM another category
    const mappedTo = settings.categoryMappings[lowerCategory];
    if (mappedTo) {
      return { isMapped: true, mappedTo };
    }
    
    // Check if this category is mapped TO by other categories
    const mappedFrom = Object.keys(settings.categoryMappings).find(
      key => settings.categoryMappings[key] === category
    );
    if (mappedFrom) {
      return { isMapped: true, mappedFrom };
    }
    
    return { isMapped: false };
  }

  /**
   * Get all current mappings for debugging/management
   */
  static getAllMappings(): { [key: string]: string } {
    const settings = this.loadSettings();
    return { ...settings.categoryMappings };
  }

  /**
   * Get default mappings for UI display
   */
  static getDefaultMappings(): { [key: string]: string } {
    return { ...this.DEFAULT_MAPPINGS };
  }

  /**
   * Check if a mapping is from the default mappings
   */
  static isDefaultMapping(key: string): boolean {
    return key in this.DEFAULT_MAPPINGS;
  }

  /**
   * Check if a default mapping has been overridden (removed by the user)
   */
  static isDefaultMappingOverridden(key: string): boolean {
    const settings = this.loadSettings();
    return this.isDefaultMapping(key) && !(key in settings.categoryMappings);
  }

  /**
   * Remove all mappings for a specific target category
   */
  static removeAllMappingsTo(targetCategory: string): string[] {
    const settings = this.loadSettings();
    const removedMappings: string[] = [];
    
    Object.keys(settings.categoryMappings).forEach(key => {
      if (settings.categoryMappings[key] === targetCategory) {
        delete settings.categoryMappings[key];
        removedMappings.push(key);
      }
    });
    
    this.saveSettings(settings);
    return removedMappings;
  }

  /**
   * Get suggestions for similar categories that could be merged
   */
  static getSimilarCategories(categories: string[]): { [key: string]: string[] } {
    const similar: { [key: string]: string[] } = {};
    const processed = categories.map(cat => cat.toLowerCase());

    // Look for categories that might be similar
    processed.forEach((cat1, i) => {
      const matches: string[] = [];
      
      processed.forEach((cat2, j) => {
        if (i !== j && this.areSimilar(cat1, cat2)) {
          matches.push(categories[j]);
        }
      });
      
      if (matches.length > 0) {
        similar[categories[i]] = matches;
      }
    });

    return similar;
  }

  /**
   * Check if two categories are similar
   */
  private static areSimilar(cat1: string, cat2: string): boolean {
    // Normalize categories for comparison
    const normalize = (str: string) => str.toLowerCase().trim();
    const norm1 = normalize(cat1);
    const norm2 = normalize(cat2);
    
    // Don't consider categories similar if they're identical
    if (norm1 === norm2) return false;
    
    // Explicitly prevent certain categories from being considered similar
    const mutuallyDistinctPairs = [
      ['action', 'adventure'],
      ['science', 'fiction'],
      ['fantasy', 'magic'],
      ['mystery', 'thriller'],
      ['horror', 'thriller']
    ];
    
    for (const [a, b] of mutuallyDistinctPairs) {
      if ((norm1 === a && norm2 === b) || (norm1 === b && norm2 === a) ||
          (norm1 === a && norm2.includes(b)) || (norm1 === b && norm2.includes(a)) ||
          (norm2 === a && norm1.includes(b)) || (norm2 === b && norm1.includes(a))) {
        return false;
      }
    }
    
    // Don't merge geographical categories with non-geographical ones
    if (this.isGeographicalCategory(cat1) !== this.isGeographicalCategory(cat2)) {
      return false;
    }
    
    // Don't merge temporal categories with non-temporal ones
    if (this.isTemporalCategory(cat1) !== this.isTemporalCategory(cat2)) {
      return false;
    }
    
    // Define broad categories that should remain distinct
    const distinctCategories = [
      'fiction', 'non-fiction', 'nonfiction', 'biography', 'autobiography',
      'history', 'science', 'mathematics', 'philosophy', 'religion',
      'art', 'music', 'sports', 'politics', 'economics',
      // Specific subjects that shouldn't be merged
      'magic', 'wizards', 'dragons', 'vampires', 'werewolves', 'zombies',
      'pirates', 'knights', 'princesses', 'kings', 'queens',
      'school', 'college', 'university', 'education',
      'friendship', 'family', 'love', 'death', 'war', 'peace',
      'animals', 'cats', 'dogs', 'horses', 'birds',
      'space', 'aliens', 'robots', 'time travel'
    ];
    
    // Check if either category is a distinct category that shouldn't be merged
    if (distinctCategories.includes(norm1) || distinctCategories.includes(norm2)) {
      // Only allow merging if they're in the same predefined group
      const predefinedGroups = [
        ['biography', 'autobiography', 'biographies'],
        ['non-fiction', 'nonfiction'],
        ['united states', 'america', 'american'],
        ['united kingdom', 'british', 'england'],
        ['world war i', 'world war 1', 'wwi', 'first world war'],
        ['world war ii', 'world war 2', 'wwii', 'second world war']
      ];
      
      for (const group of predefinedGroups) {
        if (group.includes(norm1) && group.includes(norm2)) {
          return true;
        }
      }
      return false;
    }
    
    // Remove common words for similarity checking, but be more careful
    const removeCommonWords = (str: string) => {
      return str.replace(/\b(fiction|books?|literature|novel|story|stories)\b/g, '').trim();
    };
    
    const cleanCat1 = removeCommonWords(norm1);
    const cleanCat2 = removeCommonWords(norm2);
    
    // Don't consider similar if one becomes empty after cleaning
    if (!cleanCat1 || !cleanCat2) return false;
    
    // Don't consider similar if they're too different in length
    const lengthRatio = Math.min(cleanCat1.length, cleanCat2.length) / Math.max(cleanCat1.length, cleanCat2.length);
    if (lengthRatio < 0.3) return false;
    
    // Check if one contains the other (but both must have substantial content)
    if (cleanCat1.length > 3 && cleanCat2.length > 3) {
      if (cleanCat1.includes(cleanCat2) || cleanCat2.includes(cleanCat1)) {
        return true;
      }
    }
    
    // Check for common abbreviations and variations
    const abbreviations = [
      ['science fiction', 'sci-fi', 'scifi', 'sf'],
      ['young adult', 'ya', 'teen fiction', 'teenage'],
      ['mystery', 'detective', 'crime'],
      ['self-help', 'self help', 'personal development'],
      ['business', 'economics', 'finance'],
      ['health', 'fitness', 'wellness'],
      ['cooking', 'recipes', 'cookbooks', 'culinary'],
      ['travel', 'guidebooks', 'tourism'],
      ['technology', 'computers', 'programming', 'tech'],
      ['romance', 'love stories', 'romantic'],
      ['horror', 'scary', 'frightening'],
      ['adventure', 'action', 'thriller'],
      ['historical', 'history', 'period']
    ];
    
    for (const group of abbreviations) {
      if (group.includes(cleanCat1) && group.includes(cleanCat2)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a category represents a geographical location
   */
  static isGeographicalCategory(category: string): boolean {
    const normalized = category.toLowerCase().trim();
    
    // Common geographical indicators
    const geoIndicators = [
      // Countries
      'england', 'scotland', 'wales', 'ireland', 'france', 'germany', 'italy', 'spain',
      'united states', 'america', 'canada', 'mexico', 'brazil', 'russia', 'china', 'japan',
      'india', 'australia', 'new zealand', 'south africa', 'egypt', 'morocco',
      
      // Regions/Continents
      'europe', 'asia', 'africa', 'north america', 'south america', 'oceania',
      'middle east', 'far east', 'western', 'eastern', 'northern', 'southern',
      
      // Cities
      'london', 'paris', 'new york', 'los angeles', 'chicago', 'boston', 'san francisco',
      'toronto', 'vancouver', 'sydney', 'melbourne', 'tokyo', 'beijing', 'mumbai',
      
      // Adjectives
      'american', 'british', 'english', 'french', 'german', 'italian', 'spanish',
      'canadian', 'australian', 'japanese', 'chinese', 'indian', 'european', 'asian',
      'african', 'latin', 'nordic', 'scandinavian', 'mediterranean'
    ];
    
    return geoIndicators.some(indicator => 
      normalized === indicator || 
      normalized.includes(indicator) ||
      indicator.includes(normalized)
    );
  }

  /**
   * Check if a category represents a time period
   */
  static isTemporalCategory(category: string): boolean {
    const normalized = category.toLowerCase().trim();
    
    const timeIndicators = [
      // Historical periods
      'ancient', 'medieval', 'renaissance', 'victorian', 'edwardian', 'georgian',
      'modern', 'contemporary', 'postmodern', 'classical', 'baroque', 'romantic',
      
      // Centuries
      '19th century', '20th century', '21st century', '18th century', '17th century',
      '16th century', '15th century', 'nineteenth century', 'twentieth century',
      
      // Wars and events
      'world war', 'civil war', 'revolutionary war', 'cold war', 'vietnam war',
      'wwi', 'wwii', 'ww1', 'ww2', 'great depression', 'industrial revolution',
      
      // Decades
      '1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s',
      'twenties', 'thirties', 'forties', 'fifties', 'sixties', 'seventies', 'eighties', 'nineties'
    ];
    
    return timeIndicators.some(indicator => 
      normalized === indicator || 
      normalized.includes(indicator) ||
      indicator.includes(normalized)
    );
  }

  /**
   * Explain why two categories are not considered similar
   */
  static explainSimilarity(cat1: string, cat2: string): string {
    const norm1 = cat1.toLowerCase().trim();
    const norm2 = cat2.toLowerCase().trim();
    
    if (norm1 === norm2) {
      return "Categories are identical";
    }
    
    if (this.isGeographicalCategory(cat1) && !this.isGeographicalCategory(cat2)) {
      return `"${cat1}" is a geographical location and won't be merged with non-geographical categories`;
    }
    
    if (this.isGeographicalCategory(cat2) && !this.isGeographicalCategory(cat1)) {
      return `"${cat2}" is a geographical location and won't be merged with non-geographical categories`;
    }
    
    if (this.isTemporalCategory(cat1) && !this.isTemporalCategory(cat2)) {
      return `"${cat1}" is a time period and won't be merged with non-temporal categories`;
    }
    
    if (this.isTemporalCategory(cat2) && !this.isTemporalCategory(cat1)) {
      return `"${cat2}" is a time period and won't be merged with non-temporal categories`;
    }
    
    const distinctCategories = [
      'fiction', 'non-fiction', 'nonfiction', 'biography', 'autobiography',
      'history', 'science', 'mathematics', 'philosophy', 'religion',
      'art', 'music', 'sports', 'politics', 'economics'
    ];
    
    if (distinctCategories.includes(norm1) || distinctCategories.includes(norm2)) {
      return "One or both categories are broad genres that should remain distinct";
    }
    
    const removeCommonWords = (str: string) => {
      return str.replace(/\b(fiction|books?|literature|novel|story|stories)\b/g, '').trim();
    };
    
    const cleanCat1 = removeCommonWords(norm1);
    const cleanCat2 = removeCommonWords(norm2);
    
    if (!cleanCat1 || !cleanCat2) {
      return "One category becomes empty when common words are removed";
    }
    
    const lengthRatio = Math.min(cleanCat1.length, cleanCat2.length) / Math.max(cleanCat1.length, cleanCat2.length);
    if (lengthRatio < 0.3) {
      return "Categories are too different in length to be considered similar";
    }
    
    return "Categories don't match any similarity patterns";
  }

  /**
   * Set default source for a field
   */
  static setFieldDefault(fieldName: string, defaultSource: 'audiobook' | 'original' | number): void {
    const settings = this.loadSettings();
    const key = fieldName.toLowerCase();
    settings.fieldDefaults[key] = defaultSource;
    this.saveSettings(settings);
  }

  /**
   * Get default source for a field
   */
  static getFieldDefault(fieldName: string): 'audiobook' | 'original' | number | null {
    const settings = this.loadSettings();
    const key = fieldName.toLowerCase();
    return (settings.fieldDefaults[key] ?? settings.fieldDefaults[fieldName]) || null;
  }

  /**
   * Remove default source for a field
   */
  static removeFieldDefault(fieldName: string): void {
    const settings = this.loadSettings();
    const key = fieldName.toLowerCase();
    delete settings.fieldDefaults[key];
    this.saveSettings(settings);
  }

  // Add methods to save and get audiobook cover preference
  static savePreferAudiobookCovers = (value: boolean): void => {
    try {
      localStorage.setItem('preferAudiobookCovers', JSON.stringify(value));
    } catch (e) {
      console.error('Error saving audiobook cover preference:', e);
    }
  };

  static getPreferAudiobookCovers = (): boolean => {
    try {
      const value = localStorage.getItem('preferAudiobookCovers');
      return value ? JSON.parse(value) : false;
    } catch (e) {
      console.error('Error getting audiobook cover preference:', e);
      return false;
    }
  };
} 