import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import './BookDetailsModal/transitions.css';
import { BookSearchResult, BookEdition, BookEditionsResponse } from '../types/book';
import { NotionService } from '../services/notionService';
import { BookService } from '../services/bookService';
import { CreateNotionPageRequest } from '../types/notion';
import { CategoryService, CategorySettings } from '../services/categoryService';
import AudiobookSelectionModal from './AudiobookSelectionModal';
import {
  BookInfoPanel,
  CategoriesModal,
  BookDataTable,
  FieldSourceSelectionModal,
  ManualMappingModal,
  DuplicateBookModal,
  SuccessModal
} from './BookDetailsModal/index';
import { FieldSelections } from './BookDetailsModal/BookInfoPanel';

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookSearchResult;
  isNotionConnected: boolean;
  notionSettings?: any;
  onSettingsUpdated?: (updatedSettings: any) => void;
}

interface ProcessedCategory {
  original: string;
  processed: string;
  isIgnored: boolean;
  isMapped: boolean;
  mappedFrom?: string;
  mappedToThis?: string[]; // All categories that map TO this category
}

interface SuccessModalData {
  bookTitle: string;
  notionUrl: string;
  categoriesCount: number;
  dateType: string;
  actionType: 'added' | 'updated' | 'added as separate entry';
}

const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  isOpen,
  onClose,
  book,
  isNotionConnected,
  notionSettings,
  onSettingsUpdated
}) => {
  const [currentBook, setCurrentBook] = useState<BookSearchResult>(book);
  const [rawCategories, setRawCategories] = useState<string[]>([]);
  const [processedCategories, setProcessedCategories] = useState<ProcessedCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySettings, setCategorySettings] = useState<CategorySettings>(CategoryService.loadSettings());
  const [editions, setEditions] = useState<BookEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [isAddingToNotion, setIsAddingToNotion] = useState(false);
  const [duplicateStatus, setDuplicateStatus] = useState<'unknown' | 'checking' | 'duplicate' | 'unique'>('unknown');
  const [existingNotionPage, setExistingNotionPage] = useState<{ url: string; title: string } | null>(null);
  const [showSimilarCategories, setShowSimilarCategories] = useState<{ [key: string]: string[] }>({});
  const [showManualMappingModal, setShowManualMappingModal] = useState(false);
  const [manualMappingFrom, setManualMappingFrom] = useState<string>('');
  const [manualMappingTo, setManualMappingTo] = useState<string>('');
  const [loadingAudiobook, setLoadingAudiobook] = useState(false);
  const [showAudiobookSelectionModal, setShowAudiobookSelectionModal] = useState(false);
  const [isCategoriesSectionCollapsed, setIsCategoriesSectionCollapsed] = useState(false);
  const [isNotionMappingsCollapsed, setIsNotionMappingsCollapsed] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'cancel' | 'replace' | 'keep-both' | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);

  // Temporary field mappings for this modal session
  const [tempFieldMappings, setTempFieldMappings] = useState<any>(null);
  const [databaseProperties, setDatabaseProperties] = useState<any>(null);
  const [loadingDatabaseProperties, setLoadingDatabaseProperties] = useState(false);

  // Field selections for combining data from different sources
  const [fieldSelections, setFieldSelections] = useState<FieldSelections | null>(null);
  const [selectedFieldData, setSelectedFieldData] = useState<any>(null);

  // New modal states for the refactored UI
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const preserveSelectionsRef = useRef<boolean>(false);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return ''; // Return empty string for falsy dates
    
    try {
      // Remove time portion if present (T00:00:00.000Z)
      const cleanDate = dateString.split('T')[0];
      
      // Check if it's just a year (4 digits) - show only the year
      if (/^\d{4}$/.test(cleanDate.trim())) {
        return cleanDate.trim();
      }
      
      // Check if it's in YYYY-MM-DD format to avoid timezone issues
      const isoDateMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        // Use UTC to prevent the date from shifting due to timezone differences
        const date = new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)));
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: '2-digit',
          timeZone: 'UTC'
        });
      }
      
      // Try to parse the full date from original string to preserve timezone if available
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // If invalid date but contains a year, extract and use just the year
        const yearMatch = cleanDate.match(/\d{4}/);
        if (yearMatch) {
          return yearMatch[0];
        }
        return dateString; // Return original if we can't parse anything
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

  // Handler for "Add another book" button
  const handleAddAnotherBook = () => {
    // Close the success modal and the main modal
    setShowSuccessModal(false);
    setSuccessModalData(null);
    onClose();
    
    // Navigate back to the main page (this will be handled by the parent component)
    // The parent component should handle resetting to book search state
  };

  // Process categories whenever raw categories or settings change
  const processCategories = useCallback((preserveSelections = false, overrideSettings?: CategorySettings) => {
    const settingsToUse = overrideSettings || categorySettings;
    const result = CategoryService.processCategories(rawCategories, settingsToUse, currentBook.audiobookData);
    
    const processed: ProcessedCategory[] = [];
    
    // Get all current mappings to calculate reverse mappings
    const allMappings = CategoryService.getAllMappings();
    
    // Create a map of parent categories to their children
    const parentToChildren: { [parent: string]: string[] } = {};
    Object.entries(allMappings).forEach(([child, parent]) => {
      if (!parentToChildren[parent]) {
        parentToChildren[parent] = [];
      }
      parentToChildren[parent].push(child);
    });
    
    // Add processed categories
    result.processed.forEach(processedCat => {
      const originalCat = Object.keys(result.mapped).find(key => result.mapped[key] === processedCat) || processedCat;
      const mappedToThis = parentToChildren[processedCat] || [];
      
      processed.push({
        original: originalCat,
        processed: processedCat,
        isIgnored: false,
        isMapped: !!result.mapped[originalCat],
        mappedFrom: result.mapped[originalCat] ? originalCat : undefined,
        mappedToThis: mappedToThis.length > 0 ? mappedToThis : undefined
      });
    });
    
    // Add ignored categories
    result.ignored.forEach(ignoredCat => {
      processed.push({
        original: ignoredCat,
        processed: ignoredCat,
        isIgnored: true,
        isMapped: false
      });
    });
    
    setProcessedCategories(processed);
    
    // Only update selected categories if we're not preserving selections
    // or if this is the initial load (no current selections)
    if (!preserveSelections) {
      setSelectedCategories(result.processed);
    } else {
      // When preserving selections, filter out any categories that are no longer available
      setSelectedCategories(prev => prev.filter(selected => result.processed.includes(selected)));
    }
    
    // Check for similar categories
    const similar = CategoryService.getSimilarCategories(result.processed);
    setShowSimilarCategories(similar);
  }, [rawCategories, categorySettings, currentBook.audiobookData]);

  // Initialize categories when book changes
  useEffect(() => {
    if (book) {
      setCurrentBook(book);
      const initialCategories = book.categories || [];
      setRawCategories(initialCategories);
      setDuplicateStatus('unknown');
      setExistingNotionPage(null);
      setShowDuplicateModal(false);
      setDuplicateAction(null);
      // Reset selections when book changes
      setSelectedCategories([]);
      preserveSelectionsRef.current = false;
    }
  }, [book]);

  // Process categories when they change
  const hasProcessedCategoriesRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Only process categories when modal is actually open
    if (!isOpen) return;
    
    // Only process if we haven't processed yet or if raw categories have changed
    if (!hasProcessedCategoriesRef.current) {
      processCategories(preserveSelectionsRef.current);
      hasProcessedCategoriesRef.current = true;
    }
  }, [isOpen, rawCategories]);

  // Reset category processing flag when book or raw categories change
  useEffect(() => {
    hasProcessedCategoriesRef.current = false;
  }, [book.id, rawCategories]);

  // Fetch all editions and their categories
  const fetchAllEditionsCategories = useCallback(async () => {
    if (!currentBook.openLibraryKey) return;

    setLoadingEditions(true);
    try {
      const cleanWorkKey = currentBook.openLibraryKey.replace('/works/', '');
      
      // Default to true if notionSettings exists but useEnglishOnlySources is undefined
      // This ensures we honor the default setting from the Settings page
      let englishOnly = true; // Default to true
      
      // Only set to false if explicitly set to false
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
      
      // Remove detailed debug log and use a simpler one
      console.log(`Fetching ${englishOnly ? 'English-only' : 'all'} editions for "${currentBook.title}"`);
      const response = await fetch(url);
      const result: BookEditionsResponse = await response.json();
      
      if (result.success && result.data) {
        setEditions(result.data.editions);
        
        // Collect categories from book and editions (these may have been split already)
        const bookAndEditionCategories = new Set<string>();
        
        // Add original book categories
        (currentBook.categories || []).forEach(cat => bookAndEditionCategories.add(cat));
        
        // Add categories from all editions
        result.data.editions.forEach(edition => {
          (edition.categories || []).forEach(cat => bookAndEditionCategories.add(cat));
        });
        
        // Collect audiobook genres separately (preserve intact to avoid splitting)
        const audiobookGenres = new Set<string>();
        if (currentBook.audiobookData?.genres && currentBook.audiobookData.genres.length > 0) {
          currentBook.audiobookData.genres.forEach(genre => {
            const genreName = typeof genre === 'string' ? genre : (genre as any)?.name;
            if (genreName) {
              // Preserve audiobook genres as-is, don't split them
              audiobookGenres.add(genreName);
            }
          });
        }
        
        // Combine all categories - audiobook genres will be preserved intact
        const allCategories = Array.from(bookAndEditionCategories).concat(Array.from(audiobookGenres));
        
        // Remove duplicates while preserving order
        const uniqueCategories = Array.from(new Set(allCategories));
        setRawCategories(uniqueCategories);

        // Enhancement: Fill in missing book information from editions and audiobook
        const enhancedBook = { ...currentBook };
        let hasEnhancements = false;

        // Priority order: audiobook data > best edition > current book
        // 1. Check if we should prefer audiobook data
        if (currentBook.audiobookData?.hasAudiobook) {
          // Use audiobook description if available and book lacks description
          if (!enhancedBook.description && currentBook.audiobookData.description) {
            enhancedBook.description = currentBook.audiobookData.description;
            hasEnhancements = true;
          }
        }

        // 2. Fill missing info from editions
        if (!enhancedBook.description || !enhancedBook.publisher || !enhancedBook.pageCount) {
          // Find the best edition with description
          const editionWithDescription = result.data.editions.find(edition => 
            edition.description && edition.description.trim().length > 50
          );
          
          // Find the most complete edition (most fields filled)
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

          // Apply enhancements from editions
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

          // Update ISBN if not present
          if (!enhancedBook.isbn13 && mostCompleteEdition?.isbn13) {
            enhancedBook.isbn13 = mostCompleteEdition.isbn13;
            hasEnhancements = true;
          }

          if (!enhancedBook.isbn10 && mostCompleteEdition?.isbn10) {
            enhancedBook.isbn10 = mostCompleteEdition.isbn10;
            hasEnhancements = true;
          }

          // Enhanced edition published date if available
          if (!enhancedBook.publishedDate && mostCompleteEdition?.publishedDate) {
            enhancedBook.publishedDate = mostCompleteEdition.publishedDate;
            hasEnhancements = true;
          }
        }

        // Update the current book if we made enhancements
        if (hasEnhancements) {
          setCurrentBook(enhancedBook);
          console.log(`Enhanced book data with information from ${result.data.editions.length} editions and audiobook data`);
        }
      }
    } catch (error) {
      console.error('Error fetching editions:', error);
      toast.error('Failed to load edition categories');
    } finally {
      setLoadingEditions(false);
    }
  }, [currentBook.openLibraryKey, currentBook.title, currentBook.categories, currentBook.audiobookData?.genres, currentBook.audiobookData?.description, currentBook.audiobookData?.hasAudiobook, notionSettings?.useEnglishOnlySources]);

  // Load editions when modal opens
  useEffect(() => {
    if (isOpen && currentBook.openLibraryKey) {
      // Only fetch when notionSettings is definitely loaded (not undefined)
      if (typeof notionSettings !== 'undefined') {
        fetchAllEditionsCategories();
      }
    }
  }, [isOpen, currentBook.openLibraryKey, fetchAllEditionsCategories, notionSettings]);

  // Fetch audiobook data when modal opens (only if not already loaded)
  const fetchAudiobookData = useCallback(async () => {
    setLoadingAudiobook(true);
    try {
      const bookWithAudiobook = await BookService.getAudiobookData(currentBook);
      
      // Check if we need to use audiobook date
      if (bookWithAudiobook.audiobookData?.hasAudiobook && bookWithAudiobook.audiobookData.publishedDate) {
        // Clean the audiobook date
        const cleanAudiobookDate = (dateString: string) => {
          return dateString.replace(/T00:00:00\.000Z$/, '');
        };
        
        const cleanedAudiobookDate = cleanAudiobookDate(bookWithAudiobook.audiobookData.publishedDate);
        const audiobookDate = new Date(cleanedAudiobookDate);
        
        // If audiobook date is valid, compare with book dates
        if (!isNaN(audiobookDate.getTime())) {
          let shouldUseAudiobookDate = false;
          
          // Compare with book's published date
          if (bookWithAudiobook.publishedDate) {
            const bookDate = new Date(bookWithAudiobook.publishedDate);
            if (!isNaN(bookDate.getTime()) && audiobookDate < bookDate) {
              shouldUseAudiobookDate = true;
            }
          }
          
          // Compare with original published date if no book date match yet
          if (!shouldUseAudiobookDate && bookWithAudiobook.originalPublishedDate) {
            const originalDate = new Date(bookWithAudiobook.originalPublishedDate);
            if (!isNaN(originalDate.getTime()) && audiobookDate < originalDate) {
              shouldUseAudiobookDate = true;
            }
          }
          
          // If we only have audiobook date and no other dates, use it
          if (!shouldUseAudiobookDate && !bookWithAudiobook.publishedDate && !bookWithAudiobook.originalPublishedDate) {
            shouldUseAudiobookDate = true;
          }
          
          // Set a flag in the audiobook data to indicate the date should be used as default
          if (shouldUseAudiobookDate) {
            bookWithAudiobook.audiobookData.isEarlierDate = true;
            console.log(`Audiobook date (${cleanedAudiobookDate}) is earlier than other dates - marking as preferred date`);
          }
        }
      }
      
      setCurrentBook(bookWithAudiobook);
      // Only log if audiobook data was actually found
      if (bookWithAudiobook.audiobookData?.hasAudiobook) {
        console.log(`Audiobook data loaded for: "${currentBook.title}"`);
      }
    } catch (error) {
      console.error('❌ Failed to fetch audiobook data:', error);
      // Set empty audiobook data on error
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
  }, [currentBook.title, currentBook.authors]); // Remove fieldSelections dependency

  useEffect(() => {
    if (isOpen && !currentBook.audiobookData && !loadingAudiobook) {
      fetchAudiobookData();
    }
  }, [isOpen, currentBook.audiobookData, loadingAudiobook, fetchAudiobookData]);

  // Reprocess categories when audiobook data changes (but only once per audiobook data change)
  const hasProcessedAudiobookRef = useRef<boolean>(false);
  
  useEffect(() => {
    // Only reprocess categories when modal is actually open
    if (!isOpen) return;
    
    if (currentBook.audiobookData && rawCategories.length > 0 && !hasProcessedAudiobookRef.current) {
      // Only log if audiobook has genres that might affect category processing
      if (currentBook.audiobookData.hasAudiobook && currentBook.audiobookData.genres && currentBook.audiobookData.genres.length > 0) {
        console.log(`Reprocessing categories with ${currentBook.audiobookData.genres.length} audiobook genres`);
      }
      processCategories(preserveSelectionsRef.current);
      hasProcessedAudiobookRef.current = true;
    }
  }, [isOpen, currentBook.audiobookData, rawCategories.length]);

  // Reset the audiobook processing flag when book changes
  useEffect(() => {
    hasProcessedAudiobookRef.current = false;
  }, [book.id]);

  const toggleCategory = (processedCategory: string) => {
    setSelectedCategories(prev => 
      prev.includes(processedCategory)
        ? prev.filter(cat => cat !== processedCategory)
        : [...prev, processedCategory]
    );
    // After user interaction, preserve selections on future processing
    preserveSelectionsRef.current = true;
  };

  const selectAllCategories = () => {
    const availableCategories = processedCategories
      .filter(cat => !cat.isIgnored)
      .map(cat => cat.processed);
    setSelectedCategories(availableCategories);
    preserveSelectionsRef.current = true;
  };

  const deselectAllCategories = () => {
    setSelectedCategories([]);
    preserveSelectionsRef.current = true;
  };

  const handleIgnoreCategory = (category: ProcessedCategory) => {
    // Remove the category from selected categories if it's currently selected
    setSelectedCategories(prev => prev.filter(cat => cat !== category.processed));
    
    CategoryService.addIgnoredCategory(category.original);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    
    // Immediately reprocess categories with the updated settings to show visual changes
    processCategories(true, updatedSettings);
    
    preserveSelectionsRef.current = true; // Preserve selections after ignoring
    toast.success(`"${category.original}" will always be ignored`);
  };

  const handleUnignoreCategory = (category: ProcessedCategory) => {
    CategoryService.removeIgnoredCategory(category.original);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    
    // Immediately reprocess categories with the updated settings to show visual changes
    processCategories(true, updatedSettings);
    
    preserveSelectionsRef.current = true; // Preserve selections after unignoring
    toast.success(`"${category.original}" is no longer ignored`);
  };

  const handleMergeCategories = (fromCategory: string, toCategory: string) => {
    CategoryService.addCategoryMapping(fromCategory, toCategory);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    
    // Immediately reprocess categories with the updated settings to show visual changes
    processCategories(true, updatedSettings);
    
    preserveSelectionsRef.current = true; // Preserve selections after mapping
    toast.success(`"${fromCategory}" will now map to "${toCategory}"`);
  };

  const handleManualMapping = (category: ProcessedCategory) => {
    setManualMappingFrom(category.processed);
    setManualMappingTo('');
    setShowManualMappingModal(true);
  };

  const executeManualMapping = () => {
    if (!manualMappingFrom || !manualMappingTo) {
      toast.error('Please select both source and target categories');
      return;
    }

    if (manualMappingFrom === manualMappingTo) {
      toast.error('Cannot map a category to itself');
      return;
    }

    CategoryService.addCategoryMapping(manualMappingFrom, manualMappingTo);
    const updatedSettings = CategoryService.loadSettings();
    setCategorySettings(updatedSettings);
    
    // Immediately reprocess categories with the updated settings to show visual changes
    processCategories(true, updatedSettings);
    
    preserveSelectionsRef.current = true;
    setShowManualMappingModal(false);
    setManualMappingFrom('');
    setManualMappingTo('');
    toast.success(`"${manualMappingFrom}" will now map to "${manualMappingTo}"`);
  };

  const cancelManualMapping = () => {
    setShowManualMappingModal(false);
    setManualMappingFrom('');
    setManualMappingTo('');
  };

  const handleUnmapCategory = (category: ProcessedCategory) => {
    if (category.mappedFrom) {
      // This category is the result of a mapping, remove the mapping
      CategoryService.removeCategoryMapping(category.mappedFrom);
      const updatedSettings = CategoryService.loadSettings();
      setCategorySettings(updatedSettings);
      
      // Immediately reprocess categories with the updated settings to show visual changes
      processCategories(true, updatedSettings);
      
      preserveSelectionsRef.current = true; // Preserve selections after unmapping
      toast.success(`Removed mapping: "${category.mappedFrom}" → "${category.processed}"`);
    } else {
      // This category might be mapped to other categories, remove all mappings to it
      const removedMappings = CategoryService.removeAllMappingsTo(category.processed);
      if (removedMappings.length > 0) {
        const updatedSettings = CategoryService.loadSettings();
        setCategorySettings(updatedSettings);
        
        // Immediately reprocess categories with the updated settings to show visual changes
        processCategories(true, updatedSettings);
        
        preserveSelectionsRef.current = true; // Preserve selections after unmapping
        toast.success(`Removed ${removedMappings.length} mapping(s) to "${category.processed}"`);
      } else {
        toast(`No mappings found for "${category.processed}"`, {
          icon: 'ℹ️',
          duration: 3000,
        });
      }
    }
  };

  const handleAudiobookSelected = (audiobookData: any) => {
    console.log(`User selected audiobook: "${audiobookData.title}"`);
    setCurrentBook(prev => ({
      ...prev,
      audiobookData: audiobookData
    }));
    toast.success(`Audiobook selected: "${audiobookData.title}"`);
  };

  const openAudiobookSearch = () => {
    setShowAudiobookSelectionModal(true);
  };

  // Check for duplicates
  const checkForDuplicates = async () => {
    if (!isNotionConnected || !notionSettings?.databaseId) {
      return 'unknown';
    }

    try {
      setDuplicateStatus('checking');
      const existingBooks = await NotionService.searchExistingBooks(
        notionSettings.databaseId,
        currentBook.isbn13 || currentBook.isbn10 || undefined,
        currentBook.title,
        notionSettings.fieldMapping
      );

      if (existingBooks.length > 0) {
        setDuplicateStatus('duplicate');
        setExistingNotionPage({
          url: existingBooks[0].url,
          title: existingBooks[0].title
        });
        toast(`This book already exists in your Notion database (${existingBooks.length} match${existingBooks.length > 1 ? 'es' : ''})`, {
          icon: '⚠️',
          duration: 4000,
        });
        return 'duplicate';
      } else {
        setDuplicateStatus('unique');
        setExistingNotionPage(null);
        return 'unique';
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
      setDuplicateStatus('unknown');
      toast.error('Failed to check for duplicates');
      return 'unknown';
    }
  };

  const addToNotion = async () => {
    if (!isNotionConnected || !notionSettings) {
      toast.error('Please connect to Notion and configure your settings first');
      return;
    }

    try {
      setIsAddingToNotion(true);

      // Check authentication status before proceeding
      try {
        const authStatus = await NotionService.checkAuth();
        if (!authStatus.authenticated) {
          toast.error('Your session has expired. Please refresh the page and try again.');
          setIsAddingToNotion(false);
          return;
        }
      } catch (authError) {
        console.error('Authentication check failed:', authError);
        toast.error('Authentication check failed. Please refresh the page and try again.');
        setIsAddingToNotion(false);
        return;
      }

      let currentDuplicateStatus = duplicateStatus;
      if (duplicateStatus === 'unknown') {
        currentDuplicateStatus = await checkForDuplicates();
      }

      // If duplicate found and no action set, show modal
      if (currentDuplicateStatus === 'duplicate' && !duplicateAction) {
        setShowDuplicateModal(true);
        return; // Modal handlers will take care of the rest
      }

      // Create book data with selected categories and all available dates
      const bookDataWithSelectedCategories = {
        ...getFinalBookData(),
        categories: selectedCategories,
        // Keep all date fields available for backend to use based on field mappings
        publishedDate: getFinalBookData().publishedDate,
        originalPublishedDate: getFinalBookData().originalPublishedDate,
        audiobookPublishedDate: getFinalBookData().audiobookData?.publishedDate
      };

      // Log thumbnail data for debugging
      console.log('📸 Thumbnail processing for Notion:', {
        originalThumbnail: currentBook.thumbnail,
        selectedThumbnail: selectedFieldData?.thumbnail,
        finalThumbnail: getFinalBookData().thumbnail,
        thumbnailInRequestData: bookDataWithSelectedCategories.thumbnail
      });

      console.log('📅 Date processing for Notion:', {
        originalDate: getFinalBookData().originalPublishedDate,
        editionDate: getFinalBookData().publishedDate,
        audiobookDate: getFinalBookData().audiobookData?.publishedDate,
        bookDataForRequest: {
          publishedDate: bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate
        }
      });

      // ⚠️ CRITICAL DEBUGGING: Log exactly what we're sending to the backend
      console.log('🔍 FRONTEND DEBUGGING: Complete book data being sent to backend:', {
        title: bookDataWithSelectedCategories.title,
        whatWeSendToBackend: {
          publishedDate: bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate
        },
        dataTypes: {
          publishedDate: typeof bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: typeof bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: typeof bookDataWithSelectedCategories.audiobookPublishedDate
        },
        stringLengths: {
          publishedDate: bookDataWithSelectedCategories.publishedDate ? String(bookDataWithSelectedCategories.publishedDate).length : 'null',
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate ? String(bookDataWithSelectedCategories.originalPublishedDate).length : 'null',
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate ? String(bookDataWithSelectedCategories.audiobookPublishedDate).length : 'null'
        },
        rawCurrentBookDates: {
          originalPublishedDate: getFinalBookData().originalPublishedDate,
          publishedDate: getFinalBookData().publishedDate,
          audiobookPublishedDate: getFinalBookData().audiobookData?.publishedDate
        },
        note: 'If backend receives just "2023" but we show "Dec 31, 2022", the issue is in our data prep'
      });

      const request: CreateNotionPageRequest = {
        databaseId: notionSettings.databaseId,
        bookData: bookDataWithSelectedCategories,
        fieldMapping: tempFieldMappings || notionSettings.fieldMapping,
        customValues: notionSettings.defaultValues
      };

      const createdPage = await NotionService.createPage(request);
      
      if (createdPage) {
        const actionType = duplicateAction === 'keep-both' ? 'added as separate entry' : 'added';
        
        // Simple toast notification
        toast.success(`"${getFinalBookData().title}" ${actionType} to Notion!`);
        
        // Set up success modal data
        setSuccessModalData({
          bookTitle: getFinalBookData().title,
          notionUrl: createdPage.url,
          categoriesCount: selectedCategories.length,
          dateType: 'multiple dates available',
          actionType: actionType as 'added' | 'added as separate entry'
        });
        
        setDuplicateAction(null); // Reset duplicate action
        setShowSuccessModal(true); // Show success modal instead of closing immediately
      } else {
        throw new Error('Failed to create page');
      }
    } catch (error) {
      console.error('Add to Notion failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to add book to Notion: ${errorMessage}`);
    } finally {
      setIsAddingToNotion(false);
    }
  };

  const replaceExistingNotionPage = async () => {
    if (!existingNotionPage || !notionSettings) {
      toast.error('Cannot replace: existing page not found');
      return;
    }

    try {
      setIsAddingToNotion(true);

      // Check authentication status before proceeding
      try {
        const authStatus = await NotionService.checkAuth();
        if (!authStatus.authenticated) {
          // Session lost, need to re-authenticate
          toast.error('Your session has expired. Please refresh the page and try again.');
          return;
        }
      } catch (authError) {
        console.error('Authentication check failed:', authError);
        toast.error('Authentication check failed. Please refresh the page and try again.');
        return;
      }

      // Create book data with selected categories and all available dates
      const bookDataWithSelectedCategories = {
        ...getFinalBookData(),
        categories: selectedCategories,
        // Keep all date fields available for backend to use based on field mappings
        publishedDate: getFinalBookData().publishedDate,
        originalPublishedDate: getFinalBookData().originalPublishedDate,
        audiobookPublishedDate: getFinalBookData().audiobookData?.publishedDate
      };

      // Log thumbnail data for debugging
      console.log('📸 Thumbnail processing for Notion (Replace):', {
        originalThumbnail: currentBook.thumbnail,
        selectedThumbnail: selectedFieldData?.thumbnail,
        finalThumbnail: getFinalBookData().thumbnail,
        thumbnailInRequestData: bookDataWithSelectedCategories.thumbnail
      });

      // Extract page ID from URL (Notion URLs end with the page ID)
      // Notion page IDs are 32-character hex strings, often with title prefixes
      const urlPart = existingNotionPage.url.split('/').pop()?.split('?')[0];
      
      if (!urlPart) {
        throw new Error('Could not extract page information from Notion URL');
      }
      
      // Extract the actual 32-character page ID (remove title prefix if present)
      // Notion URLs often look like: "Title-203acdedba7c81dbad1ec46412540de8"
      // We need just the 32-character hex ID at the end
      const pageIdMatch = urlPart.match(/([a-f0-9]{32})$/i);
      const pageId = pageIdMatch ? pageIdMatch[1] : urlPart;
      
      if (!pageId || pageId.length !== 32) {
        throw new Error(`Invalid Notion page ID extracted: "${pageId}". Expected 32-character hex string.`);
      }
      
      console.log('🔍 Extracted page ID:', { originalUrl: existingNotionPage.url, urlPart, pageId });

      // Only use the specific field mappings for book properties to avoid overwriting other page properties
      // This ensures we only update book-related fields and preserve any custom properties
      const selectiveFieldMapping = tempFieldMappings || notionSettings.fieldMapping;
      
      console.log('Updating existing page with selective field mapping:', {
        pageId,
        mappedFields: Object.keys(selectiveFieldMapping).length,
        bookTitle: currentBook.title
      });

      console.log('📅 Date processing for Notion (Replace):', {
        originalDate: getFinalBookData().originalPublishedDate,
        editionDate: getFinalBookData().publishedDate,
        audiobookDate: getFinalBookData().audiobookData?.publishedDate,
        bookDataForRequest: {
          publishedDate: bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate
        }
      });

      // ⚠️ CRITICAL DEBUGGING: Log exactly what we're sending to the backend (REPLACE)
      console.log('🔍 FRONTEND DEBUGGING (REPLACE): Complete book data being sent to backend:', {
        title: bookDataWithSelectedCategories.title,
        whatWeSendToBackend: {
          publishedDate: bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate
        },
        dataTypes: {
          publishedDate: typeof bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: typeof bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: typeof bookDataWithSelectedCategories.audiobookPublishedDate
        },
        stringLengths: {
          publishedDate: bookDataWithSelectedCategories.publishedDate ? String(bookDataWithSelectedCategories.publishedDate).length : 'null',
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate ? String(bookDataWithSelectedCategories.originalPublishedDate).length : 'null',
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate ? String(bookDataWithSelectedCategories.audiobookPublishedDate).length : 'null'
        },
        rawCurrentBookDates: {
          originalPublishedDate: getFinalBookData().originalPublishedDate,
          publishedDate: getFinalBookData().publishedDate,
          audiobookPublishedDate: getFinalBookData().audiobookData?.publishedDate
        },
        note: 'REPLACE path - If backend receives just "2023" but we show "Dec 31, 2022", the issue is in our data prep'
      });

      // Format the update request - same as create but only updates mapped book properties
      const request: CreateNotionPageRequest = {
        databaseId: notionSettings.databaseId,
        bookData: bookDataWithSelectedCategories,
        fieldMapping: selectiveFieldMapping,
        customValues: notionSettings.defaultValues
      };

      // Use the NotionService to update only the book-related properties
      const updatedPage = await NotionService.updateBookPage(pageId, request);
      
      // Simple toast notification
      toast.success(`"${getFinalBookData().title}" updated in Notion!`);
      
      // Set up success modal data
      setSuccessModalData({
        bookTitle: getFinalBookData().title,
        notionUrl: existingNotionPage.url,
        categoriesCount: selectedCategories.length,
        dateType: 'multiple dates available',
        actionType: 'updated'
      });
      
      setShowSuccessModal(true); // Show success modal instead of closing immediately
    } catch (error) {
      console.error('Replace existing page failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to update existing book: ${errorMessage}`);
    } finally {
      setIsAddingToNotion(false);
    }
  };

  // Initialize temporary field mappings from settings
  useEffect(() => {
    // Only initialize when modal is actually open
    if (!isOpen) return;
    
    if (isNotionConnected && notionSettings?.fieldMapping && !tempFieldMappings) {
      console.log('Initializing field mappings');
      setTempFieldMappings({ ...notionSettings.fieldMapping });
      
      // Load database properties if not already loaded
      if (notionSettings.databaseId && !databaseProperties && !loadingDatabaseProperties) {
        setLoadingDatabaseProperties(true);
        NotionService.getDatabaseProperties(notionSettings.databaseId)
          .then(properties => {
            setDatabaseProperties(properties);
          })
          .catch(error => {
            console.error('🔧 Failed to load database properties:', error);
            toast.error('Failed to load database properties for field mapping');
          })
          .finally(() => {
            setLoadingDatabaseProperties(false);
          });
      }
    }
  }, [isOpen, isNotionConnected, notionSettings?.fieldMapping, notionSettings?.databaseId, tempFieldMappings, databaseProperties, loadingDatabaseProperties]);

  // Handle temporary field mapping changes
  const handleTempFieldMappingChange = (bookField: string, notionProperty: string) => {
    setTempFieldMappings((prev: any) => ({
      ...prev,
      [bookField]: notionProperty
    }));
  };

  // Reset temporary field mappings to original settings
  const resetTempFieldMappings = () => {
    if (notionSettings?.fieldMapping) {
      setTempFieldMappings({ ...notionSettings.fieldMapping });
      toast.success('Field mappings reset to saved settings');
    }
  };

  // Save temporary field mappings to permanent settings
  const saveTempFieldMappings = async () => {
    if (!tempFieldMappings || !notionSettings) {
      toast.error('No changes to save');
      return;
    }

    try {
      const updatedSettings = {
        ...notionSettings,
        fieldMapping: { ...tempFieldMappings }
      };

      await NotionService.saveSettings(updatedSettings);
      
      // Notify parent component of updated settings
      if (onSettingsUpdated) {
        onSettingsUpdated(updatedSettings);
      }
      
      toast.success('Field mappings saved permanently! These mappings will be used for all future books.');
    } catch (error) {
      console.error('Failed to save field mappings:', error);
      toast.error('Failed to save field mappings');
    }
  };

  // Check if temp mappings differ from saved settings
  const hasUnsavedChanges = () => {
    if (!tempFieldMappings || !notionSettings?.fieldMapping) return false;
    return JSON.stringify(tempFieldMappings) !== JSON.stringify(notionSettings.fieldMapping);
  };

  // Duplicate modal handlers
  const handleDuplicateCancel = () => {
    setDuplicateAction('cancel');
    setShowDuplicateModal(false);
    setIsAddingToNotion(false);
  };

  const handleDuplicateReplace = () => {
    setDuplicateAction('replace');
    setShowDuplicateModal(false);
    // Call replaceExistingNotionPage directly instead of going through addToNotion() again
    setTimeout(() => replaceExistingNotionPage(), 50);
  };

  const handleDuplicateKeepBoth = () => {
    setDuplicateAction('keep-both');
    setShowDuplicateModal(false);
    // Call the book creation logic directly instead of going through addToNotion() again
    setTimeout(() => createNewNotionPage(), 50);
  };

  const createNewNotionPage = async () => {
    if (!isNotionConnected || !notionSettings) {
      toast.error('Please connect to Notion and configure your settings first');
      return;
    }

    try {
      setIsAddingToNotion(true);

      // Check authentication status before proceeding
      try {
        const authStatus = await NotionService.checkAuth();
        if (!authStatus.authenticated) {
          toast.error('Your session has expired. Please refresh the page and try again.');
          return;
        }
      } catch (authError) {
        console.error('Authentication check failed:', authError);
        toast.error('Authentication check failed. Please refresh the page and try again.');
        return;
      }

      // Create book data with selected categories and all available dates
      const bookDataWithSelectedCategories = {
        ...getFinalBookData(),
        categories: selectedCategories,
        publishedDate: getFinalBookData().publishedDate,
        originalPublishedDate: getFinalBookData().originalPublishedDate,
        audiobookPublishedDate: getFinalBookData().audiobookData?.publishedDate
      };

      // Log thumbnail data for debugging
      console.log('📸 Thumbnail processing for Notion (Keep Both):', {
        originalThumbnail: currentBook.thumbnail,
        selectedThumbnail: selectedFieldData?.thumbnail,
        finalThumbnail: getFinalBookData().thumbnail,
        thumbnailInRequestData: bookDataWithSelectedCategories.thumbnail
      });

      console.log('📅 Date processing for Notion (Keep Both):', {
        originalDate: getFinalBookData().originalPublishedDate,
        editionDate: getFinalBookData().publishedDate,
        audiobookDate: getFinalBookData().audiobookData?.publishedDate,
        bookDataForRequest: {
          publishedDate: bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate
        }
      });

      // ⚠️ CRITICAL DEBUGGING: Log exactly what we're sending to the backend (KEEP BOTH)
      console.log('🔍 FRONTEND DEBUGGING (KEEP BOTH): Complete book data being sent to backend:', {
        title: bookDataWithSelectedCategories.title,
        whatWeSendToBackend: {
          publishedDate: bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate
        },
        dataTypes: {
          publishedDate: typeof bookDataWithSelectedCategories.publishedDate,
          originalPublishedDate: typeof bookDataWithSelectedCategories.originalPublishedDate,
          audiobookPublishedDate: typeof bookDataWithSelectedCategories.audiobookPublishedDate
        },
        stringLengths: {
          publishedDate: bookDataWithSelectedCategories.publishedDate ? String(bookDataWithSelectedCategories.publishedDate).length : 'null',
          originalPublishedDate: bookDataWithSelectedCategories.originalPublishedDate ? String(bookDataWithSelectedCategories.originalPublishedDate).length : 'null',
          audiobookPublishedDate: bookDataWithSelectedCategories.audiobookPublishedDate ? String(bookDataWithSelectedCategories.audiobookPublishedDate).length : 'null'
        },
        rawCurrentBookDates: {
          originalPublishedDate: getFinalBookData().originalPublishedDate,
          publishedDate: getFinalBookData().publishedDate,
          audiobookPublishedDate: getFinalBookData().audiobookData?.publishedDate
        },
        note: 'KEEP BOTH path - If backend receives just "2023" but we show "Dec 31, 2022", the issue is in our data prep'
      });

      const request: CreateNotionPageRequest = {
        databaseId: notionSettings.databaseId,
        bookData: bookDataWithSelectedCategories,
        fieldMapping: tempFieldMappings || notionSettings.fieldMapping,
        customValues: notionSettings.defaultValues
      };

      const createdPage = await NotionService.createPage(request);
      
      if (createdPage) {
        // Simple toast notification
        toast.success(`"${getFinalBookData().title}" added to Notion!`);
        
        // Set up success modal data
        setSuccessModalData({
          bookTitle: getFinalBookData().title,
          notionUrl: createdPage.url,
          categoriesCount: selectedCategories.length,
          dateType: 'multiple dates available',
          actionType: 'added'
        });
        
        setShowSuccessModal(true); // Show success modal instead of closing immediately
      } else {
        throw new Error('Failed to create page');
      }
    } catch (error) {
      console.error('Create new page failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to add book to Notion: ${errorMessage}`);
    } finally {
      setIsAddingToNotion(false);
    }
  };

  const handleSelectEdition = (edition: any) => {
    // Merge data from selected edition into current book
    const enhancedBook = {
      ...currentBook,
      // Use edition data when available, fallback to current book data
      title: edition.title || currentBook.title,
      subtitle: edition.subtitle || currentBook.subtitle,
      authors: edition.authors?.length > 0 ? edition.authors : currentBook.authors,
      publisher: edition.publisher || currentBook.publisher,
      publishedDate: edition.publishedDate || currentBook.publishedDate,
      isbn13: edition.isbn13 || currentBook.isbn13,
      isbn10: edition.isbn10 || currentBook.isbn10,
      pageCount: edition.pageCount || currentBook.pageCount,
      description: edition.description || currentBook.description,
      thumbnail: edition.thumbnail || currentBook.thumbnail,
      language: edition.language || currentBook.language,
      // Keep original book's other data
      openLibraryKey: currentBook.openLibraryKey,
      openLibraryData: currentBook.openLibraryData,
      audiobookData: currentBook.audiobookData,
      categories: currentBook.categories // Keep processed categories
    };

    setCurrentBook(enhancedBook);
    toast.success(`Switched to edition: ${edition.title} (${edition.publishedDate || 'Unknown year'})`);
  };

  const handleFieldSelectionChange = (fieldSelections: FieldSelections, selectedData: any) => {
    setFieldSelections(fieldSelections);
    setSelectedFieldData(selectedData);
    console.log('Field selections updated');
  };

  // Handler for opening source selection modal
  const handleSelectSource = (fieldId: string) => {
    setEditingField(fieldId);
    setIsSourceModalOpen(true);
  };

  // Handler for source selection
  const handleSourceSelected = (value: string | number) => {
    if (editingField) {
      // Update field selections based on the chosen source
      console.log(`Selected source "${value}" for field "${editingField}"`);
      
      // Update the fieldSelections state
      setFieldSelections(prev => {
        const current = prev || {} as any;
        const newSelections = {
          ...current,
          [editingField]: value
        };
        
        // Immediately notify of changes with updated selected data
        const getUpdatedSelectedData = () => {
          const selectedData: any = {};
          
          // Get data for each field based on the new selections
          Object.keys(newSelections).forEach(fieldKey => {
            const selection = newSelections[fieldKey];
            
            if (fieldKey === 'thumbnail') {
              if (selection === 'audiobook' && currentBook.audiobookData?.image) {
                selectedData.thumbnail = currentBook.audiobookData.image;
              } else if (typeof selection === 'number' && editions && editions[selection]?.thumbnail) {
                selectedData.thumbnail = editions[selection].thumbnail;
              } else {
                selectedData.thumbnail = currentBook.thumbnail;
              }
            }
            // Add handling for other fields as needed
            else if (fieldKey === 'description') {
              if (selection === 'audiobook' && currentBook.audiobookData?.description) {
                selectedData.description = currentBook.audiobookData.description;
              } else if (selection === 'audiobook_summary' && currentBook.audiobookData?.summary) {
                selectedData.description = currentBook.audiobookData.summary;
              } else if (typeof selection === 'number' && editions && editions[selection]?.description) {
                selectedData.description = editions[selection].description;
              } else {
                selectedData.description = currentBook.description;
              }
            }
            else if (fieldKey === 'publisher') {
              if (selection === 'audiobook' && currentBook.audiobookData?.publisher) {
                selectedData.publisher = currentBook.audiobookData.publisher;
              } else if (typeof selection === 'number' && editions && editions[selection]?.publisher) {
                selectedData.publisher = editions[selection].publisher;
              } else {
                selectedData.publisher = currentBook.publisher;
              }
            }
            else if (fieldKey === 'publishedDate') {
              if (selection === 'audiobook' && currentBook.audiobookData?.publishedDate) {
                selectedData.publishedDate = currentBook.audiobookData.publishedDate;
              } else if (typeof selection === 'number' && editions && editions[selection]?.publishedDate) {
                selectedData.publishedDate = editions[selection].publishedDate;
              } else {
                selectedData.publishedDate = currentBook.publishedDate;
              }
            }
            else if (fieldKey === 'pageCount') {
              if (typeof selection === 'number' && editions && editions[selection]?.pageCount) {
                selectedData.pageCount = editions[selection].pageCount;
              } else {
                selectedData.pageCount = currentBook.pageCount;
              }
            }
            // Add other field types as needed
          });
          
          return selectedData;
        };
        
        const updatedSelectedData = getUpdatedSelectedData();
        setSelectedFieldData(updatedSelectedData);
        
        return newSelections;
      });
      
      // For now, let's also show a toast to confirm the action
      toast.success(`Updated ${editingField} to use ${value} source`);
    }
    setIsSourceModalOpen(false);
    setEditingField(null);
  };

  // Helper function to get sources for a specific field
  const getFieldSources = (fieldId: string) => {
    const sources = [];
    
         // Always add main book source if it has data
     const getMainValue = (field: string): string | null => {
       switch (field) {
         case 'title': return currentBook.title || null;
         case 'description': return currentBook.description || null;
         case 'publisher': return currentBook.publisher || null;
         case 'publishedDate': return currentBook.publishedDate || null;
         case 'pageCount': return currentBook.pageCount?.toString() || null;
         case 'thumbnail': return currentBook.thumbnail || null;
         default: return null;
       }
     };

     const mainValue = getMainValue(fieldId);
     if (mainValue) {
       sources.push({
         value: 'original', // Use 'original' to match BookInfoPanel
         label: 'Original Book',
         content: mainValue
       });
     }

         // Add edition sources if available
     if (editions && editions.length > 0) {
                editions.forEach((edition, index) => {
         let editionValue: string | null = null;
         switch (fieldId) {
           case 'title': editionValue = edition.title || null; break;
           case 'publisher': editionValue = edition.publisher || null; break;
           case 'publishedDate': editionValue = edition.publishedDate || null; break;
           case 'pageCount': editionValue = edition.pageCount?.toString() || null; break;
           case 'description': editionValue = edition.description || null; break;
           case 'thumbnail': editionValue = edition.thumbnail || null; break;
         }
         
         if (editionValue && editionValue !== mainValue) {
           sources.push({
             value: index, // Use index number to match BookInfoPanel
             label: `Edition ${index + 1} (${edition.publishedDate || 'Unknown year'})`,
             content: editionValue
           });
         }
       });
     }

    // Add audiobook sources if available
    if (currentBook.audiobookData) {
      let audiobookValue: string | null = null;
      switch (fieldId) {
        case 'description': audiobookValue = currentBook.audiobookData.description || null; break;
        case 'thumbnail': audiobookValue = currentBook.audiobookData.image || null; break;
      }
      
      if (audiobookValue && audiobookValue !== mainValue) {
        sources.push({
          value: 'audiobook',
          label: fieldId === 'thumbnail' ? 'Audiobook Cover' : 'Audiobook',
          content: audiobookValue
        });
      }
      
      // Add audiobook summary as separate source for description
      if (fieldId === 'description' && currentBook.audiobookData.summary && currentBook.audiobookData.summary !== mainValue && currentBook.audiobookData.summary !== audiobookValue) {
        sources.push({
          value: 'audiobook_summary',
          label: 'Audiobook Summary',
          content: currentBook.audiobookData.summary
        });
      }
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
      // Add more fields as implemented
    };
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save the current scroll position
      const scrollY = window.scrollY;
      
      // Add styles to prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Remove styles and restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="modal-enter-active bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Book Details & Categories
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Review and customize before adding to Notion
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(95vh-200px)]">
          {/* Book Header Section */}
          <div className="flex items-start gap-6 mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Large Cover Image */}
            <div className="flex-shrink-0">
              {getFinalBookData().thumbnail ? (
                <div 
                  className={`relative group cursor-pointer h-36 transition-all duration-300 ${
                    fieldSelections?.thumbnail === 'audiobook' ? 'w-36' : 'w-24'
                  }`}
                  onClick={() => handleSelectSource('thumbnail')}
                  title="Select cover image source"
                >
                  <img 
                    src={getFinalBookData().thumbnail} 
                    alt={`Cover of ${getFinalBookData().title}`}
                    className={`w-full h-full rounded-lg shadow-md group-hover:opacity-90 transition-opacity ${
                      fieldSelections?.thumbnail === 'audiobook' ? 'object-contain bg-gray-100' : 'object-cover'
                    }`}
                    onError={(e) => {
                      // Show placeholder on error
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const placeholder = target.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                   <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg hidden flex-col items-center justify-center shadow-md">
                     <svg className="w-8 h-8 text-white mb-2" fill="currentColor" viewBox="0 0 20 20">
                       <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14zM19 12h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2h-2a1 1 0 010-2h2v-2a1 1 0 012 0v2z" />
                     </svg>
                     <span className="text-xs text-white text-center px-1">No Cover</span>
                   </div>
                </div>
              ) : (
                 <div className="w-24 h-36 bg-gradient-to-b from-blue-400 to-blue-600 rounded-lg flex flex-col items-center justify-center shadow-md">
                   <svg className="w-8 h-8 text-white mb-2" fill="currentColor" viewBox="0 0 20 20">
                     <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14zM19 12h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2h-2a1 1 0 010-2h2v-2a1 1 0 012 0v2z" />
                   </svg>
                   <span className="text-xs text-white text-center px-1">No Cover</span>
                 </div>
               )}
            </div>

            {/* Book Information */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                {getFinalBookData().title}
              </h3>
              {getFinalBookData().authors && getFinalBookData().authors.length > 0 && (
                <p className="text-lg text-gray-600 mb-3">
                  by {getFinalBookData().authors.join(', ')}
                </p>
              )}
              
              {/* Quick Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {getFinalBookData().publishedDate && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {formatDate(getFinalBookData().publishedDate)}
                  </span>
                )}
                {getFinalBookData().pageCount && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    {getFinalBookData().pageCount} pages
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCategoriesModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Manage Categories ({selectedCategories.length} selected)
              </button>
              
              
            </div>

            <div className="flex items-center gap-2">
              {/* Duplicate status indicator */}
              {duplicateStatus === 'checking' && (
                <div className="flex items-center text-blue-600 text-sm">
                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking for duplicates...
                </div>
              )}
              
              {duplicateStatus === 'duplicate' && existingNotionPage && (
                <div className="text-amber-600 text-sm font-medium">
                  Duplicate found
                </div>
              )}
              
              {duplicateStatus === 'unique' && (
                <div className="text-green-600 text-sm font-medium">
                  No duplicates found
                </div>
              )}
            </div>
          </div>

          {/* Main Book Data Table */}
          <BookDataTable
            book={currentBook}
            selectedCategories={selectedCategories}
            notionSettings={notionSettings}
            tempFieldMappings={tempFieldMappings}
            databaseProperties={databaseProperties}
            loadingDatabaseProperties={loadingDatabaseProperties}
            onSelectSource={handleSelectSource}
            onTempFieldMappingChange={handleTempFieldMappingChange}
            fieldSelections={fieldSelections}
            editions={editions}
            audiobookData={currentBook.audiobookData}
            openAudiobookSearch={openAudiobookSearch}
            loadingAudiobook={loadingAudiobook}
          />
        </div>

        {/* Footer with Notion Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedCategories.length} categories selected
            </div>
            <div className="flex items-center gap-3">
              {isNotionConnected ? (
                <>
                  <button
                    onClick={checkForDuplicates}
                    disabled={duplicateStatus === 'checking'}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Check for Duplicates
                  </button>
                  <button
                    onClick={addToNotion}
                    disabled={isAddingToNotion || selectedCategories.length === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAddingToNotion ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding to Notion...
                      </>
                    ) : (
                      'Add to Notion'
                    )}
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Connect to Notion in Settings to add books
                </div>
              )}
            </div>
          </div>
        </div>
      </div> {/* End of bg-white rounded-lg modal container */}

      {/* Manual Mapping Modal */}
      {showManualMappingModal && (
        <ManualMappingModal
          isOpen={showManualMappingModal}
          processedCategories={processedCategories}
          manualMappingFrom={manualMappingFrom}
          manualMappingTo={manualMappingTo}
          onClose={cancelManualMapping}
          onSetMappingFrom={setManualMappingFrom}
          onSetMappingTo={(newCategory: string) => setManualMappingTo(newCategory)}
          onExecuteMapping={executeManualMapping}
        />
      )}

      {/* Audiobook Selection Modal */}
      {showAudiobookSelectionModal && (
        <AudiobookSelectionModal
          isOpen={showAudiobookSelectionModal}
          onClose={() => setShowAudiobookSelectionModal(false)}
          bookTitle={currentBook.title}
          bookAuthor={currentBook.authors?.[0] || ''}
          onAudiobookSelected={handleAudiobookSelected}
        />
      )}

      {/* Duplicate Book Modal */}
      {showDuplicateModal && (
        <DuplicateBookModal
          isOpen={showDuplicateModal}
          bookTitle={currentBook.title}
          existingNotionPage={existingNotionPage}
          onClose={handleDuplicateCancel}
          onCancel={handleDuplicateCancel}
          onReplace={handleDuplicateReplace}
          onKeepBoth={handleDuplicateKeepBoth}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && successModalData && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          bookTitle={successModalData.bookTitle}
          notionUrl={successModalData.notionUrl}
          categoriesCount={successModalData.categoriesCount}
          dateType={successModalData.dateType}
          actionType={successModalData.actionType}
          onAddAnotherBook={handleAddAnotherBook}
        />
      )}

      {/* Categories Management Modal */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        book={currentBook}
        processedCategories={processedCategories}
        selectedCategories={selectedCategories}
        categorySettings={categorySettings}
        showSimilarCategories={showSimilarCategories}
        onToggleCategory={toggleCategory}
        onSelectAllCategories={selectAllCategories}
        onDeselectAllCategories={deselectAllCategories}
        onIgnoreCategory={handleIgnoreCategory}
        onUnignoreCategory={handleUnignoreCategory}
        onMergeCategories={handleMergeCategories}
        onManualMapping={handleManualMapping}
        onUnmapCategory={handleUnmapCategory}
      />

      {/* Field Source Selection Modal */}
      {isSourceModalOpen && editingField && (
        <FieldSourceSelectionModal<string | number>
          isOpen={isSourceModalOpen}
          onClose={() => setIsSourceModalOpen(false)}
          fieldName={editingField}
          sources={getFieldSources(editingField)}
          selectedValue={(() => {
            // Get the current selection for this field
            if (fieldSelections) {
              switch (editingField) {
                case 'description':
                  return fieldSelections.description || 'original';
                case 'publisher':
                  return fieldSelections.publisher || 'original';
                case 'pageCount':
                  return fieldSelections.pageCount || 'original';
                case 'publishedDate':
                  return fieldSelections.publishedDate || 'original';
                case 'isbn':
                  return fieldSelections.isbn || 'original';
                case 'thumbnail':
                  return fieldSelections.thumbnail || 'original';
                default:
                  return 'original';
              }
            }
            return 'original';
          })()}
          onSelect={handleSourceSelected}
        />
      )}
    </div>
  );
};

export default BookDetailsModal;