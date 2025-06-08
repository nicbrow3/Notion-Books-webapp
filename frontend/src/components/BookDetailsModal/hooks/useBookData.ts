import { useState, useEffect, useCallback, useRef } from 'react';
import { BookSearchResult, BookEdition, BookEditionsResponse } from '../../../types/book';
import { BookService } from '../../../services/bookService';
import { CategoryService } from '../../../services/categoryService';
import { FieldSelections } from '../BookInfoPanel';

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
  selectedFieldData: any;
  setFieldSelections: (selections: FieldSelections | null) => void;
  setSelectedFieldData: (data: any) => void;
  fetchAllEditionsCategories: () => Promise<void>;
  fetchAudiobookData: () => Promise<void>;
  getFinalBookData: () => BookSearchResult;
  getFieldSources: (fieldId: string) => Array<{value: string | number, label: string, content: string}>;
}

export const useBookData = ({ book, isOpen, notionSettings }: UseBookDataProps): UseBookDataReturn => {
  const [currentBook, setCurrentBook] = useState<BookSearchResult>(book);
  const [editions, setEditions] = useState<BookEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [loadingAudiobook, setLoadingAudiobook] = useState(false);
  const [fieldSelections, setFieldSelections] = useState<FieldSelections | null>(null);
  const [selectedFieldData, setSelectedFieldData] = useState<any>(null);
  
  const hasInitializedFieldSelectionsRef = useRef<boolean>(false);

  // Initialize book when prop changes
  useEffect(() => {
    if (book) {
      setCurrentBook(book);
      hasInitializedFieldSelectionsRef.current = false;
    }
  }, [book]);

  // Format date helper
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

  // Fetch all editions and their categories
  const fetchAllEditionsCategories = useCallback(async () => {
    if (!currentBook.openLibraryKey) return;

    setLoadingEditions(true);
    try {
      const cleanWorkKey = currentBook.openLibraryKey.replace('/works/', '');
      
      let englishOnly = true;
      if (notionSettings && notionSettings.useEnglishOnlySources === false) {
        englishOnly = false;
      }
      
      let url = `/api/books/editions/${cleanWorkKey}`;
      const queryParams = new URLSearchParams();
      if (englishOnly) {
        queryParams.append('englishOnly', 'true');
        if (currentBook.title) {
          queryParams.append('originalTitle', encodeURIComponent(currentBook.title));
        }
      }
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log(`Fetching ${englishOnly ? 'English-only' : 'all'} editions for "${currentBook.title}"`);
      const response = await fetch(url);
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
          console.log(`Enhanced book data with information from ${result.data.editions.length} editions and audiobook data`);
        }
      }
    } catch (error) {
      console.error('Error fetching editions:', error);
    } finally {
      setLoadingEditions(false);
    }
  }, [currentBook.openLibraryKey, currentBook.title, currentBook.audiobookData?.description, currentBook.audiobookData?.hasAudiobook, notionSettings?.useEnglishOnlySources]);

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
            console.log(`Audiobook date (${cleanedAudiobookDate}) is earlier than other dates - marking as preferred date`);
          }
        }
      }
      
      setCurrentBook(bookWithAudiobook);
      if (bookWithAudiobook.audiobookData?.hasAudiobook) {
        console.log(`Audiobook data loaded for: "${currentBook.title}"`);
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

  // Initialize field selections based on saved defaults after audiobook data is loaded
  useEffect(() => {
    if (!isOpen || hasInitializedFieldSelectionsRef.current) return;
    
    if (loadingAudiobook) return;
    
    const initializeFieldSelections = () => {
      const initialSelections: any = {};
      let hasSelections = false;
      
      const fieldNames = ['description', 'publisher', 'pagecount', 'releaseDate', 'thumbnail'];
       
      fieldNames.forEach(fieldName => {
        const savedDefault = CategoryService.getFieldDefault(fieldName);
        if (savedDefault && savedDefault !== 'original') {
          const selectionKey = fieldName === 'pagecount' ? 'pageCount' : fieldName;
          
          if (savedDefault === 'audiobook') {
            let hasAudiobookData = false;
            
            switch (fieldName) {
              case 'description':
                hasAudiobookData = !!(currentBook.audiobookData?.description || currentBook.audiobookData?.summary);
                break;
              case 'thumbnail':
                hasAudiobookData = !!currentBook.audiobookData?.image;
                break;
              case 'publisher':
                hasAudiobookData = !!currentBook.audiobookData?.publisher;
                break;
              case 'releaseDate':
                hasAudiobookData = !!currentBook.audiobookData?.publishedDate;
                break;
            }
            
            if (hasAudiobookData) {
              initialSelections[selectionKey] = savedDefault;
              hasSelections = true;
            }
          } else {
            let hasData = false;
            
            if (typeof savedDefault === 'number') {
              if (editions && editions[savedDefault]) {
                switch (fieldName) {
                  case 'description':
                    hasData = !!editions[savedDefault].description;
                    break;
                  case 'publisher':
                    hasData = !!editions[savedDefault].publisher;
                    break;
                  case 'releaseDate':
                    hasData = !!editions[savedDefault].publishedDate;
                    break;
                  case 'pagecount':
                    hasData = !!editions[savedDefault].pageCount;
                    break;
                  case 'thumbnail':
                    hasData = !!editions[savedDefault].thumbnail;
                    break;
                }
              }
            } else {
              hasData = true;
            }
            
            if (hasData) {
              initialSelections[selectionKey] = savedDefault;
              hasSelections = true;
            }
          }
        }
      });
      
      if (hasSelections) {
        setFieldSelections(initialSelections);
        
        const getSelectedDataForInitialSelections = () => {
          const selectedData: any = {};
          
          Object.keys(initialSelections).forEach(fieldKey => {
            const selection = initialSelections[fieldKey];
            
            if (fieldKey === 'thumbnail') {
              if (selection === 'audiobook' && currentBook.audiobookData?.image) {
                selectedData.thumbnail = currentBook.audiobookData.image;
              } else if (typeof selection === 'number' && editions && editions[selection]?.thumbnail) {
                selectedData.thumbnail = editions[selection].thumbnail;
              }
            } else if (fieldKey === 'description') {
              if (selection === 'audiobook' && currentBook.audiobookData?.description) {
                selectedData.description = currentBook.audiobookData.description;
              } else if (selection === 'audiobook_summary' && currentBook.audiobookData?.summary) {
                selectedData.description = currentBook.audiobookData.summary;
              } else if (typeof selection === 'number' && editions && editions[selection]?.description) {
                selectedData.description = editions[selection].description;
              }
            } else if (fieldKey === 'publisher') {
              if (selection === 'audiobook' && currentBook.audiobookData?.publisher) {
                selectedData.publisher = currentBook.audiobookData.publisher;
              } else if (typeof selection === 'number' && editions && editions[selection]?.publisher) {
                selectedData.publisher = editions[selection].publisher;
              } else {
                selectedData.publisher = currentBook.publisher;
              }
            } else if (fieldKey === 'releaseDate') {
              if (selection === 'audiobook' && currentBook.audiobookData?.publishedDate) {
                selectedData.releaseDate = currentBook.audiobookData.publishedDate;
              } else if (typeof selection === 'number' && editions && editions[selection]?.publishedDate) {
                selectedData.releaseDate = editions[selection].publishedDate;
              } else {
                selectedData.releaseDate = currentBook.publishedDate;
              }
            } else if (fieldKey === 'pageCount') {
              if (typeof selection === 'number' && editions && editions[selection]?.pageCount) {
                selectedData.pageCount = editions[selection].pageCount;
              } else {
                selectedData.pageCount = currentBook.pageCount;
              }
            }
          });
          
          return selectedData;
        };
        
        const initialSelectedData = getSelectedDataForInitialSelections();
        if (Object.keys(initialSelectedData).length > 0) {
          setSelectedFieldData(initialSelectedData);
        }
        
        console.log('Initialized field selections based on saved defaults:', initialSelections);
      }
    };
    
    initializeFieldSelections();
    hasInitializedFieldSelectionsRef.current = true;
  }, [isOpen, loadingAudiobook, currentBook.audiobookData, editions]);

  // Reset field selections initialization flag when book changes
  useEffect(() => {
    hasInitializedFieldSelectionsRef.current = false;
  }, [book.id]);

  // Helper function to get sources for a specific field
  const getFieldSources = (fieldId: string) => {
    const sources = [];
    
    const getMainValue = (field: string): string | null => {
      switch (field) {
        case 'title': return currentBook.title || null;
        case 'description': return currentBook.description || null;
        case 'publisher': return currentBook.publisher || null;
        case 'releaseDate': return currentBook.publishedDate || null;
        case 'pageCount': return currentBook.pageCount?.toString() || null;
        case 'thumbnail': return currentBook.thumbnail || null;
        default: return null;
      }
    };

    const mainValue = getMainValue(fieldId);

    if (mainValue) {
      sources.push({
        value: 'original',
        label: 'Original Book',
        content: mainValue
      });
    }

    if (currentBook.audiobookData) {
      let audiobookValue: string | null = null;
      switch (fieldId) {
        case 'description': audiobookValue = currentBook.audiobookData.description || null; break;
        case 'thumbnail': audiobookValue = currentBook.audiobookData.image || null; break;
        case 'publisher': audiobookValue = currentBook.audiobookData.publisher || null; break;
        case 'releaseDate': audiobookValue = currentBook.audiobookData.publishedDate || null; break;
      }
      
      if (audiobookValue && audiobookValue !== mainValue) {
        sources.push({
          value: 'audiobook',
          label: fieldId === 'thumbnail' ? 'Audiobook Cover' : 'Audiobook',
          content: audiobookValue
        });
      }
      
      if (fieldId === 'description' && currentBook.audiobookData.summary && currentBook.audiobookData.summary !== mainValue && currentBook.audiobookData.summary !== audiobookValue) {
        sources.push({
          value: 'audiobook_summary',
          label: 'Audiobook Summary',
          content: currentBook.audiobookData.summary
        });
      }
    }

    if (editions && editions.length > 0) {
      editions.forEach((edition, index) => {
        let editionValue: string | null = null;
        switch (fieldId) {
          case 'title': editionValue = edition.title || null; break;
          case 'publisher': editionValue = edition.publisher || null; break;
          case 'releaseDate': editionValue = edition.publishedDate || null; break;
          case 'pageCount': editionValue = edition.pageCount?.toString() || null; break;
          case 'description': editionValue = edition.description || null; break;
          case 'thumbnail': editionValue = edition.thumbnail || null; break;
        }
        
        if (editionValue && editionValue !== mainValue) {
          sources.push({
            value: index,
            label: `Edition ${index + 1} (${edition.publishedDate || 'Unknown year'})`,
            content: editionValue
          });
        }
      });
    }

    return sources;
  };

  // Get final book data with user's field selections applied
  const getFinalBookData = () => {
    if (!selectedFieldData) {
      return currentBook;
    }

    return {
      ...currentBook,
      description: selectedFieldData.description || currentBook.description,
      publisher: selectedFieldData.publisher || currentBook.publisher,
      pageCount: selectedFieldData.pageCount || currentBook.pageCount,
      publishedDate: selectedFieldData.publishedDate || currentBook.publishedDate,
      thumbnail: selectedFieldData.thumbnail || currentBook.thumbnail,
      audiobookData: currentBook.audiobookData,
    };
  };

  return {
    currentBook,
    setCurrentBook,
    editions,
    loadingEditions,
    loadingAudiobook,
    fieldSelections,
    selectedFieldData,
    setFieldSelections,
    setSelectedFieldData,
    fetchAllEditionsCategories,
    fetchAudiobookData,
    getFinalBookData,
    getFieldSources
  };
}; 