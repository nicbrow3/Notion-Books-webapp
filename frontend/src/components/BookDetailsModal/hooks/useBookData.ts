import { useState, useEffect, useCallback, useRef } from 'react';
import { BookSearchResult, BookEdition, BookEditionsResponse, AudiobookData } from '../../../types/book';
import { BookService } from '../../../services/bookService';
import { CategoryService } from '../../../services/categoryService';
import { FieldSelections } from '../BookInfoPanel';
import { extractPlainText } from '../utils/htmlUtils';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../../../utils/api';

interface UseBookDataProps {
  book: BookSearchResult;
  isOpen: boolean;
  notionSettings?: any;
}

interface UseBookDataReturn {
  currentBook: BookSearchResult;
  setCurrentBook: (book: BookSearchResult) => void;
  editions: BookEdition[];
  loadingEditions: boolean;
  loadingAudiobook: boolean;
  fieldSelections: FieldSelections | null;
  getFinalBookData: () => BookSearchResult;
  fetchAllEditionsCategories: () => Promise<void>;
  fetchAudiobookData: () => Promise<void>;
  getFieldSources: (fieldId: string) => Array<{value: string | number, label: string, content: string}>;
  updateFieldSelection: (fieldId: string, value: string | number) => void;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '';
  
  try {
    const cleanDate = dateString.split('T')[0];
    
    if (/^\d{4}$/.test(cleanDate.trim())) {
      return cleanDate.trim();
    }
    
    const isoDateMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      const [, year, month, day] = isoDateMatch;
      const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit',
        timeZone: 'UTC'
      });
    }
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      const yearMatch = cleanDate.match(/\d{4}/);
      if (yearMatch) {
        return yearMatch[0];
      }
      return dateString;
    }
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: '2-digit'
    });
  } catch {
    return dateString;
  }
};

export const useBookData = ({ book, isOpen, notionSettings }: UseBookDataProps): UseBookDataReturn => {
  const [currentBook, setCurrentBook] = useState<BookSearchResult>(book);
  const [editions, setEditions] = useState<BookEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [loadingAudiobook, setLoadingAudiobook] = useState(false);
  const [fieldSelections, setFieldSelections] = useState<FieldSelections | null>(null);
  const editionsRequestCacheRef = useRef<Set<string>>(new Set());

  // When the modal is opened with a new book, reset the state
  useEffect(() => {
    if (isOpen) {
      setCurrentBook(book);
      setEditions([]);
      setFieldSelections(null);
    }
  }, [isOpen, book]);

  const getFinalBookData = useCallback(() => {
    const finalData = { ...currentBook };
    
    if (!fieldSelections) {
      // Before any selections are made, check if audiobook data is present
      // and if its cover should be preferred.
      if (currentBook.audiobookData?.image && CategoryService.getPreferAudiobookCovers()) {
        finalData.thumbnail = currentBook.audiobookData.image;
      }
      return finalData;
    }

    Object.keys(fieldSelections).forEach(fieldKey => {
      const selection = fieldSelections[fieldKey as keyof typeof fieldSelections];
      
      switch (fieldKey) {
        case 'thumbnail':
          if (selection === 'audiobook' && currentBook.audiobookData?.image) {
            finalData.thumbnail = currentBook.audiobookData.image;
          } else if (typeof selection === 'string' && selection.startsWith('variant_') && currentBook.editionVariants) {
            const variantIndex = parseInt(selection.replace('variant_', ''));
            const variant = currentBook.editionVariants[variantIndex];
            if (variant?.thumbnail) {
              finalData.thumbnail = variant.thumbnail;
            }
          } else if (typeof selection === 'number' && editions[selection]?.thumbnail) {
            finalData.thumbnail = editions[selection].thumbnail;
          } else {
            finalData.thumbnail = book.thumbnail; // Fallback to original book thumbnail
          }
          break;
        case 'description':
          if (selection === 'audiobook' && currentBook.audiobookData?.description) {
            finalData.description = extractPlainText(currentBook.audiobookData.description);
          } else if (selection === 'audiobook_summary' && currentBook.audiobookData?.summary) {
            finalData.description = extractPlainText(currentBook.audiobookData.summary);
          } else if (typeof selection === 'string' && selection.startsWith('variant_') && currentBook.editionVariants) {
            const variantIndex = parseInt(selection.replace('variant_', ''));
            const variant = currentBook.editionVariants[variantIndex];
            if (variant?.description) {
              finalData.description = variant.description;
            }
          } else if (typeof selection === 'number' && editions[selection]?.description) {
            finalData.description = editions[selection].description;
          } else {
            finalData.description = book.description;
          }
          break;
        case 'publisher':
          if (selection === 'audiobook' && currentBook.audiobookData?.publisher) {
            finalData.publisher = currentBook.audiobookData.publisher;
          } else if (typeof selection === 'string' && selection.startsWith('variant_') && currentBook.editionVariants) {
            const variantIndex = parseInt(selection.replace('variant_', ''));
            const variant = currentBook.editionVariants[variantIndex];
            if (variant?.publisher) {
              finalData.publisher = variant.publisher;
            }
          } else if (typeof selection === 'number' && editions[selection]?.publisher) {
            finalData.publisher = editions[selection].publisher;
          } else {
            finalData.publisher = book.publisher;
          }
          break;
        case 'releaseDate':
          if (selection === 'audiobook' && currentBook.audiobookData?.publishedDate) {
            finalData.publishedDate = currentBook.audiobookData.publishedDate;
          } else if (typeof selection === 'string' && selection.startsWith('variant_') && currentBook.editionVariants) {
            const variantIndex = parseInt(selection.replace('variant_', ''));
            const variant = currentBook.editionVariants[variantIndex];
            if (variant?.publishedDate) {
              finalData.publishedDate = variant.publishedDate;
            }
          } else if (typeof selection === 'number' && editions[selection]?.publishedDate) {
            finalData.publishedDate = editions[selection].publishedDate;
          } else {
            finalData.publishedDate = book.publishedDate;
          }
          break;
        case 'pageCount':
          if (typeof selection === 'string' && selection.startsWith('variant_') && currentBook.editionVariants) {
            const variantIndex = parseInt(selection.replace('variant_', ''));
            const variant = currentBook.editionVariants[variantIndex];
            if (variant?.pageCount) {
              finalData.pageCount = variant.pageCount;
            }
          } else if (typeof selection === 'number' && editions[selection]?.pageCount) {
            finalData.pageCount = editions[selection].pageCount;
          } else {
            finalData.pageCount = book.pageCount;
          }
          break;
      }
    });

    return finalData;
  }, [currentBook, editions, fieldSelections, book]);

  const updateFieldSelection = useCallback((fieldId: string, value: string | number) => {
    const newSelections: FieldSelections = {
      ...(fieldSelections || {
        description: 'original',
        publisher: 'original',
        pageCount: 'original',
        releaseDate: 'original',
        thumbnail: 'original',
      } as FieldSelections),
      [fieldId]: value,
    };
    
    setFieldSelections(newSelections);
    
    toast.success(`Updated ${fieldId} source`);
  }, [fieldSelections]);
  
  // Smartly select default sources when new data (audiobook/editions) is loaded
  useEffect(() => {
    if (!isOpen || (!currentBook.audiobookData && editions.length === 0)) return;

    let needsUpdate = false;
    const preferAudiobookCovers = CategoryService.getPreferAudiobookCovers();
    const savedDescriptionDefault = CategoryService.getFieldDefault('description');
    const savedPublisherDefault = CategoryService.getFieldDefault('publisher');
    const savedReleaseDateDefault = CategoryService.getFieldDefault('releaseDate');
    const savedThumbnailDefault = CategoryService.getFieldDefault('thumbnail');
    
    const updatedSelections: FieldSelections = { 
      ...(fieldSelections || {
        description: 'original',
        publisher: 'original',
        pageCount: 'original',
        releaseDate: 'original',
        thumbnail: 'original',
      })
    } as FieldSelections;

    // Handle Audiobook Data
    if (currentBook.audiobookData) {
      if (currentBook.audiobookData.image) {
        const currentSelection = fieldSelections?.thumbnail;
        const shouldSelectAudiobookCover = !currentSelection || 
                                           currentSelection === 'original' || 
                                           preferAudiobookCovers || 
                                           savedThumbnailDefault === 'audiobook';

        if (shouldSelectAudiobookCover && updatedSelections.thumbnail !== 'audiobook') {
          updatedSelections.thumbnail = 'audiobook';
          needsUpdate = true;
        }
      }

      if (savedDescriptionDefault === 'audiobook' && currentBook.audiobookData.description && updatedSelections.description !== 'audiobook') {
        updatedSelections.description = 'audiobook';
        needsUpdate = true;
      }
      
      if (savedDescriptionDefault === 'audiobook_summary' && currentBook.audiobookData.summary && updatedSelections.description !== 'audiobook_summary') {
        updatedSelections.description = 'audiobook_summary';
        needsUpdate = true;
      }
      
      if (savedPublisherDefault === 'audiobook' && currentBook.audiobookData.publisher && updatedSelections.publisher !== 'audiobook') {
        updatedSelections.publisher = 'audiobook';
        needsUpdate = true;
      }
      
      if ((savedReleaseDateDefault === 'audiobook' || currentBook.audiobookData.isEarlierDate) && currentBook.audiobookData.publishedDate && updatedSelections.releaseDate !== 'audiobook') {
        updatedSelections.releaseDate = 'audiobook';
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      setFieldSelections(updatedSelections);
    }
  }, [isOpen, currentBook.audiobookData]);

  const fetchAllEditionsCategories = useCallback(async () => {
    if (!currentBook.openLibraryKey) return;

    const cleanWorkKey = currentBook.openLibraryKey.replace('/works/', '');

    let englishOnly = true;
    if (notionSettings && notionSettings.useEnglishOnlySources === false) {
      englishOnly = false;
    }

    const normalizedTitle = (currentBook.title || '').trim();
    const requestKey = `${cleanWorkKey}|${englishOnly ? 'en' : 'all'}|${normalizedTitle}`;

    if (editionsRequestCacheRef.current.has(requestKey)) {
      return;
    }

    editionsRequestCacheRef.current.add(requestKey);

    setLoadingEditions(true);
    try {
      let url = `${API_BASE_URL}/api/books/editions/${cleanWorkKey}`;
      const queryParams = new URLSearchParams();
      if (englishOnly) {
        queryParams.append('englishOnly', 'true');
        if (normalizedTitle) {
          queryParams.append('originalTitle', normalizedTitle);
        }
      }
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const responseText = await response.text();
        if (response.status === 404) {
          console.warn(`Editions endpoint returned 404 for ${url}. Treating as no editions.`);
          setEditions([]);
          return;
        }

        throw new Error(`Edition request failed (${response.status} ${response.statusText}): ${responseText}`);
      }

      const result: BookEditionsResponse = await response.json();
      
      if (result.success && result.data) {
        setEditions(result.data.editions);
        
        // Enhancement: Fill in missing book information from editions
        const enhancedBook = { ...currentBook };
        let hasEnhancements = false;

        if (currentBook.audiobookData?.hasAudiobook) {
          if (!enhancedBook.description && currentBook.audiobookData.description) {
            enhancedBook.description = currentBook.audiobookData.description;
            hasEnhancements = true;
          }
        }

        if (!enhancedBook.description || !enhancedBook.publisher || !enhancedBook.pageCount) {
          const editionWithDescription = result.data.editions.find(edition => 
            edition.description && edition.description.trim().length > 50
          );
          
          const mostCompleteEdition = result.data.editions.reduce((best, current) => {
            const currentScore = [
              current.description,
              current.publisher,
              current.pageCount,
              current.isbn13,
              current.publishedDate
            ].filter(Boolean).length;
            
            const bestScore = [
              best?.description,
              best?.publisher,
              best?.pageCount,
              best?.isbn13,
              best?.publishedDate
            ].filter(Boolean).length;
            
            return currentScore > bestScore ? current : best;
          }, result.data.editions[0]);

          if (!enhancedBook.description && editionWithDescription?.description) {
            enhancedBook.description = editionWithDescription.description;
            hasEnhancements = true;
          }

          if (!enhancedBook.publisher && mostCompleteEdition?.publisher) {
            enhancedBook.publisher = mostCompleteEdition.publisher;
            hasEnhancements = true;
          }

          if (!enhancedBook.pageCount && mostCompleteEdition?.pageCount) {
            enhancedBook.pageCount = mostCompleteEdition.pageCount;
            hasEnhancements = true;
          }

          if (!enhancedBook.isbn13 && mostCompleteEdition?.isbn13) {
            enhancedBook.isbn13 = mostCompleteEdition.isbn13;
            hasEnhancements = true;
          }

          if (!enhancedBook.isbn10 && mostCompleteEdition?.isbn10) {
            enhancedBook.isbn10 = mostCompleteEdition.isbn10;
            hasEnhancements = true;
          }

          if (!enhancedBook.publishedDate && mostCompleteEdition?.publishedDate) {
            enhancedBook.publishedDate = mostCompleteEdition.publishedDate;
            hasEnhancements = true;
          }
        }

        if (hasEnhancements) {
          setCurrentBook(enhancedBook);
        }
      }
    } catch (error) {
      console.error('Error fetching editions:', error);
      editionsRequestCacheRef.current.delete(requestKey);
    } finally {
      setLoadingEditions(false);
    }
  }, [currentBook.openLibraryKey, currentBook.title, notionSettings?.useEnglishOnlySources]);

  useEffect(() => {
    editionsRequestCacheRef.current.clear();
  }, [book.id, book.openLibraryKey]);

  // Fetch audiobook data
  const fetchAudiobookData = useCallback(async () => {
    setLoadingAudiobook(true);
    try {
      const bookWithAudiobook = await BookService.getAudiobookData(currentBook);
      
      if (bookWithAudiobook.audiobookData?.hasAudiobook && bookWithAudiobook.audiobookData.publishedDate) {
        const cleanAudiobookDate = (dateString: string) => {
          return dateString.replace(/T00:00:00\.000Z$/, '');
        };
        
        const cleanedAudiobookDate = cleanAudiobookDate(bookWithAudiobook.audiobookData.publishedDate);
        const audiobookDate = new Date(cleanedAudiobookDate);
        
        if (!isNaN(audiobookDate.getTime())) {
          let shouldUseAudiobookDate = false;
          
          if (bookWithAudiobook.publishedDate) {
            const bookDate = new Date(bookWithAudiobook.publishedDate);
            if (!isNaN(bookDate.getTime()) && audiobookDate < bookDate) {
              shouldUseAudiobookDate = true;
            }
          }
          
          if (!shouldUseAudiobookDate && bookWithAudiobook.originalPublishedDate) {
            const originalDate = new Date(bookWithAudiobook.originalPublishedDate);
            if (!isNaN(originalDate.getTime()) && audiobookDate < originalDate) {
              shouldUseAudiobookDate = true;
            }
          }
          
          if (!shouldUseAudiobookDate && !bookWithAudiobook.publishedDate && !bookWithAudiobook.originalPublishedDate) {
            shouldUseAudiobookDate = true;
          }
          
          if (shouldUseAudiobookDate) {
            bookWithAudiobook.audiobookData.isEarlierDate = true;
          }
        }
      }
      
      setCurrentBook(bookWithAudiobook);
      if (bookWithAudiobook.audiobookData?.hasAudiobook) {
      }
    } catch (error) {
      console.error('❌ Failed to fetch audiobook data:', error);
      setCurrentBook(prev => ({
        ...prev,
        audiobookData: {
          hasAudiobook: false,
          source: 'error',
          error: error instanceof Error ? error.message : 'Failed to fetch audiobook data'
        }
      }));
    } finally {
      setLoadingAudiobook(false);
    }
  }, [currentBook.title, currentBook.authors]);

  // Function to get available sources for a field
  const getFieldSources = (fieldId: string) => {
    const sources: Array<{value: string | number, label: string, content: any}> = [];

    // Helper to get the value from the main book object
    const getMainValue = (field: string): any => {
      switch (field) {
        case 'title': return currentBook.title;
        case 'authors': return currentBook.authors?.join(', ');
        case 'description': return currentBook.description;
        case 'publisher': return currentBook.publisher;
        case 'releaseDate': return currentBook.publishedDate;
        case 'pageCount': return currentBook.pageCount;
        case 'thumbnail': return currentBook.thumbnail;
        case 'isbn13': return currentBook.isbn13;
        case 'isbn10': return currentBook.isbn10;
        case 'rating': return currentBook.averageRating;
        case 'categories': return currentBook.categories?.length ? `${currentBook.categories.length} categories` : null;
        // Audiobook-specific fields
        case 'audiobookPublisher': return currentBook.audiobookData?.publisher;
        case 'audiobookNarrators': 
          if (currentBook.audiobookData?.narrators) {
            if (Array.isArray(currentBook.audiobookData.narrators)) {
              return currentBook.audiobookData.narrators.join(', ');
            }
            return String(currentBook.audiobookData.narrators);
          }
          return null;
        case 'audiobookDuration': 
          if (currentBook.audiobookData?.totalDurationHours) {
            return currentBook.audiobookData.totalDurationHours < 1 
              ? `${Math.round(currentBook.audiobookData.totalDurationHours * 60)} min`
              : `${currentBook.audiobookData.totalDurationHours.toFixed(1)} hrs`;
          }
          return currentBook.audiobookData?.duration;
        case 'audiobookChapters': 
          return currentBook.audiobookData?.chapters?.toString() || currentBook.audiobookData?.chapterCount?.toString();
        case 'audiobookRating': 
          if (currentBook.audiobookData?.rating) {
            return currentBook.audiobookData.ratingCount 
              ? `${currentBook.audiobookData.rating}/5 (${currentBook.audiobookData.ratingCount} reviews)`
              : `${currentBook.audiobookData.rating}/5`;
          }
          return null;
        case 'audiobookASIN': return currentBook.audiobookData?.asin;
        case 'audiobookURL': return currentBook.audiobookData?.audibleUrl;
        default: return null;
      }
    };

    const mainValue = getMainValue(fieldId);

    // Always add the main book source if it has a value.
    // For audiobook fields, use "Audiobook" as the label instead of "Original Book"
    if (mainValue !== null && mainValue !== undefined && mainValue !== '') {
      const isAudiobookField = fieldId.startsWith('audiobook');
      sources.push({
        value: 'original',
        label: isAudiobookField ? 'Audiobook' : 'Original Book',
        content: mainValue,
      });
    }

    // Special handling for releaseDate to gather all date-related fields
    if (fieldId === 'releaseDate') {
      if (currentBook.originalPublishedDate && currentBook.originalPublishedDate !== mainValue) {
        sources.push({ value: 'first_published', label: 'First Published', content: formatDate(currentBook.originalPublishedDate) });
      }
      if (currentBook.audiobookData?.publishedDate && currentBook.audiobookData.publishedDate !== mainValue) {
        sources.push({ value: 'audiobook', label: 'Audiobook', content: formatDate(currentBook.audiobookData.publishedDate) });
      }
      if (currentBook.copyright && currentBook.copyright !== mainValue) {
        sources.push({ value: 'copyright', label: 'Copyright', content: formatDate(currentBook.copyright) });
      }
      if (currentBook.audiobookData?.copyright && currentBook.audiobookData.copyright !== mainValue) {
        sources.push({ value: 'audiobook_copyright', label: 'Audiobook Copyright', content: formatDate(currentBook.audiobookData.copyright) });
      }
    }

    // Add sources from search-consolidated edition variants (deluxe, special editions, etc.)
    if (currentBook.editionVariants && currentBook.editionVariants.length > 0) {
      currentBook.editionVariants.forEach((variant, index) => {
        let variantValue: any = null;
        let variantLabel = variant.title;

        // Extract edition type from title for better labeling
        const deluxeMatch = variantLabel.toLowerCase().match(/\b(deluxe|special|collector's?|premium|limited|anniversary|commemorative|expanded|enhanced|director's?)\s*(edition|version)?\b/);
        if (deluxeMatch) {
          const editionType = deluxeMatch[1].charAt(0).toUpperCase() + deluxeMatch[1].slice(1);
          variantLabel = `${editionType} Edition`;
        } else if (!variant.isOriginal) {
          variantLabel = `Alternative Edition`;
        } else {
          variantLabel = `Original Edition`;
        }

        switch (fieldId) {
          case 'title': variantValue = variant.title; break;
          case 'publisher': variantValue = variant.publisher; break;
          case 'pageCount': variantValue = variant.pageCount; break;
          case 'description': variantValue = variant.description; break;
          case 'thumbnail': variantValue = variant.thumbnail; break;
          case 'releaseDate': variantValue = variant.publishedDate; break;
        }

        // Add if the variant has a value and it's not already in sources
        if (variantValue && !sources.some(s => s.content === variantValue)) {
          sources.push({
            value: `variant_${index}`,
            label: variantLabel,
            content: fieldId === 'releaseDate' ? formatDate(variantValue) : variantValue,
          });
        }
      });
    }

    // Add sources from different editions (Open Library editions)
    if (editions && editions.length > 0) {
      editions.forEach((edition, index) => {
        let editionValue: any = null;
        switch (fieldId) {
          case 'title': editionValue = edition.title; break;
          case 'publisher': editionValue = edition.publisher; break;
          case 'pageCount': editionValue = edition.pageCount; break;
          case 'description': editionValue = edition.description; break;
          case 'thumbnail': editionValue = edition.thumbnail; break;
          case 'releaseDate': editionValue = edition.publishedDate; break;
        }

        // Add if the edition has a value and it's not already in sources
        if (editionValue && !sources.some(s => s.content === editionValue)) {
          sources.push({
            value: index,
            label: `Edition ${index + 1}`,
            content: fieldId === 'releaseDate' ? formatDate(editionValue) : editionValue,
          });
        }
      });
    }

    // Add sources from audiobook data
    if (currentBook.audiobookData) {
      if (fieldId === 'thumbnail' && currentBook.audiobookData.image && !sources.some(s => s.value === 'audiobook')) {
        sources.push({ value: 'audiobook', label: 'Audiobook Cover', content: currentBook.audiobookData.image });
      }
      if (fieldId === 'description') {
        if (currentBook.audiobookData.description && !sources.some(s => s.value === 'audiobook')) {
          sources.push({ value: 'audiobook', label: 'About this listen', content: currentBook.audiobookData.description });
        }
        if (currentBook.audiobookData.summary && !sources.some(s => s.value === 'audiobook_summary')) {
          sources.push({ value: 'audiobook_summary', label: 'Audiobook Summary', content: currentBook.audiobookData.summary });
        }
      }
       if (fieldId === 'publisher' && currentBook.audiobookData.publisher && !sources.some(s => s.value === 'audiobook')) {
        sources.push({ value: 'audiobook', label: 'Audiobook', content: currentBook.audiobookData.publisher });
      }
    }
    
    // Remove duplicates based on content, prioritizing 'original' and then others
    const uniqueSources = Array.from(new Map(sources.map(s => [s.content, s])).values());
    
    return uniqueSources;
  };

  return {
    currentBook,
    setCurrentBook,
    editions,
    loadingEditions,
    loadingAudiobook,
    fieldSelections,
    getFinalBookData,
    fetchAllEditionsCategories,
    fetchAudiobookData,
    getFieldSources,
    updateFieldSelection,
  };
}; 
