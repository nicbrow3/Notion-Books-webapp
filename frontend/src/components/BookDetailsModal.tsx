import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { BookSearchResult, BookEdition, BookEditionsResponse } from '../types/book';
import { NotionService } from '../services/notionService';
import { CreateNotionPageRequest } from '../types/notion';
import { CategoryService, CategorySettings } from '../services/categoryService';

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookSearchResult;
  isNotionConnected: boolean;
  notionSettings?: any;
}

interface ProcessedCategory {
  original: string;
  processed: string;
  isIgnored: boolean;
  isMapped: boolean;
  mappedFrom?: string;
  mappedToThis?: string[]; // All categories that map TO this category
}

const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  isOpen,
  onClose,
  book,
  isNotionConnected,
  notionSettings
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

  const preserveSelectionsRef = useRef<boolean>(false);

  // Process categories whenever raw categories or settings change
  const processCategories = useCallback((preserveSelections = false) => {
    const result = CategoryService.processCategories(rawCategories, categorySettings);
    
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
  }, [rawCategories, categorySettings]);

  // Initialize categories when book changes
  useEffect(() => {
    if (book) {
      setCurrentBook(book);
      const initialCategories = book.categories || [];
      setRawCategories(initialCategories);
      setDuplicateStatus('unknown');
      setExistingNotionPage(null);
      // Reset selections when book changes
      setSelectedCategories([]);
      preserveSelectionsRef.current = false;
    }
  }, [book]);

  // Process categories when they change
  useEffect(() => {
    processCategories(preserveSelectionsRef.current);
  }, [processCategories]);

  // Fetch all editions and their categories
  const fetchAllEditionsCategories = useCallback(async () => {
    if (!currentBook.openLibraryKey) return;

    setLoadingEditions(true);
    try {
      const response = await fetch(`/api/books/editions/${currentBook.openLibraryKey.replace('/works/', '')}`);
      const result: BookEditionsResponse = await response.json();
      
      if (result.success && result.data) {
        setEditions(result.data.editions);
        
        // Collect all categories from all editions
        const allEditionCategories = new Set<string>();
        
        // Add original book categories
        (currentBook.categories || []).forEach(cat => allEditionCategories.add(cat));
        
        // Add categories from all editions
        result.data.editions.forEach(edition => {
          (edition.categories || []).forEach(cat => allEditionCategories.add(cat));
        });
        
        const uniqueCategories = Array.from(allEditionCategories);
        setRawCategories(uniqueCategories);
        
        toast.success(`Loaded ${result.data.editions.length} editions with ${uniqueCategories.length} total categories`);
      }
    } catch (error) {
      console.error('Error fetching editions:', error);
      toast.error('Failed to load edition categories');
    } finally {
      setLoadingEditions(false);
    }
  }, [currentBook.openLibraryKey, currentBook.categories]);

  // Load editions when modal opens
  useEffect(() => {
    if (isOpen && currentBook.openLibraryKey) {
      fetchAllEditionsCategories();
    }
  }, [isOpen, currentBook.openLibraryKey, fetchAllEditionsCategories]);

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
    setCategorySettings(CategoryService.loadSettings());
    preserveSelectionsRef.current = true; // Preserve selections after ignoring
    toast.success(`"${category.original}" will always be ignored`);
  };

  const handleUnignoreCategory = (category: ProcessedCategory) => {
    CategoryService.removeIgnoredCategory(category.original);
    setCategorySettings(CategoryService.loadSettings());
    preserveSelectionsRef.current = true; // Preserve selections after unignoring
    toast.success(`"${category.original}" is no longer ignored`);
  };

  const handleMergeCategories = (fromCategory: string, toCategory: string) => {
    CategoryService.addCategoryMapping(fromCategory, toCategory);
    setCategorySettings(CategoryService.loadSettings());
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
    setCategorySettings(CategoryService.loadSettings());
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
      setCategorySettings(CategoryService.loadSettings());
      preserveSelectionsRef.current = true; // Preserve selections after unmapping
      toast.success(`Removed mapping: "${category.mappedFrom}" → "${category.processed}"`);
    } else {
      // This category might be mapped to other categories, remove all mappings to it
      const removedMappings = CategoryService.removeAllMappingsTo(category.processed);
      if (removedMappings.length > 0) {
        setCategorySettings(CategoryService.loadSettings());
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

  const checkForDuplicates = async () => {
    if (!isNotionConnected || !notionSettings?.databaseId) {
      return;
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
      } else {
        setDuplicateStatus('unique');
        setExistingNotionPage(null);
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
      setDuplicateStatus('unknown');
      toast.error('Failed to check for duplicates');
    }
  };

  const addToNotion = async () => {
    if (!isNotionConnected || !notionSettings) {
      toast.error('Please connect to Notion and configure your settings first');
      return;
    }

    try {
      setIsAddingToNotion(true);

      // Check for duplicates first if not already checked
      if (duplicateStatus === 'unknown') {
        await checkForDuplicates();
      }

      // If duplicate found, ask for confirmation
      if (duplicateStatus === 'duplicate') {
        const message = existingNotionPage 
          ? `This book already exists in your Notion database as "${existingNotionPage.title}". Do you want to add it anyway?`
          : 'This book already exists in your Notion database. Do you want to add it anyway?';
        
        const confirmed = window.confirm(message);
        if (!confirmed) {
          setIsAddingToNotion(false);
          return;
        }
      }

      // Create book data with selected categories
      const bookDataWithSelectedCategories = {
        ...currentBook,
        categories: selectedCategories
      };

      const request: CreateNotionPageRequest = {
        databaseId: notionSettings.databaseId,
        bookData: bookDataWithSelectedCategories,
        fieldMapping: notionSettings.fieldMapping,
        customValues: notionSettings.defaultValues
      };

      const createdPage = await NotionService.createPage(request);
      
      if (createdPage) {
        toast.success(
          <div className="flex flex-col">
            <span className="font-medium">"{currentBook.title}" added to Notion!</span>
            <span className="text-sm text-gray-600">{selectedCategories.length} categories included</span>
            <a 
              href={createdPage.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              View in Notion →
            </a>
          </div>,
          {
            duration: 6000,
          }
        );
        onClose(); // Close modal after successful addition
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

  const formatAuthors = (authors: string[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' and ');
    return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden">
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
        <div className="flex h-[calc(95vh-120px)]">
          {/* Left Panel - Book Information */}
          <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
            <div className="flex gap-4 mb-6">
              {/* Book Cover */}
              <div className="flex-shrink-0">
                {currentBook.thumbnail ? (
                  <img
                    src={currentBook.thumbnail}
                    alt={`Cover of ${currentBook.title}`}
                    className="w-32 h-48 object-cover rounded shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-32 h-48 bg-gray-200 rounded shadow-lg flex items-center justify-center">
                    <span className="text-gray-400 text-sm text-center">No Cover</span>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {currentBook.title}
                  {currentBook.subtitle && (
                    <span className="text-gray-600 font-normal">: {currentBook.subtitle}</span>
                  )}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3">
                  by {formatAuthors(currentBook.authors)}
                </p>

                {/* Source Indicator */}
                <div className="mb-3">
                  <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                    {currentBook.source === 'merged_apis' ? 'Sources: Google Books + Open Library' :
                     currentBook.source === 'open_library_primary' ? 'Source: Open Library' :
                     currentBook.source === 'google_books_enhanced' ? 'Source: Google Books (Enhanced)' :
                     currentBook.source === 'open_library_edition' ? 'Source: Open Library Edition' :
                     `Source: ${currentBook.source}`}
                  </span>
                </div>

                {/* Editions Info */}
                {currentBook.openLibraryData?.editionCount && currentBook.openLibraryData.editionCount > 1 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-600 font-medium">
                        {currentBook.openLibraryData.editionCount} editions available
                      </span>
                      {loadingEditions && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                    </div>
                    {editions.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Categories loaded from {editions.length} editions
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {currentBook.description && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentBook.description}
                </p>
              </div>
            )}

            {/* Detailed Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {currentBook.originalPublishedDate && (
                <div>
                  <span className="font-medium text-gray-900">First Published:</span>
                  <p className="text-gray-600">{formatDate(currentBook.originalPublishedDate)}</p>
                </div>
              )}
              {currentBook.publishedDate && currentBook.originalPublishedDate !== currentBook.publishedDate && (
                <div>
                  <span className="font-medium text-gray-900">This Edition:</span>
                  <p className="text-gray-600">{formatDate(currentBook.publishedDate)}</p>
                </div>
              )}
              {currentBook.publishedDate && !currentBook.originalPublishedDate && (
                <div>
                  <span className="font-medium text-gray-900">Published:</span>
                  <p className="text-gray-600">{formatDate(currentBook.publishedDate)}</p>
                </div>
              )}
              {currentBook.publisher && (
                <div>
                  <span className="font-medium text-gray-900">Publisher:</span>
                  <p className="text-gray-600">{currentBook.publisher}</p>
                </div>
              )}
              {currentBook.pageCount && (
                <div>
                  <span className="font-medium text-gray-900">Pages:</span>
                  <p className="text-gray-600">{currentBook.pageCount}</p>
                </div>
              )}
              {currentBook.language && (
                <div>
                  <span className="font-medium text-gray-900">Language:</span>
                  <p className="text-gray-600">{currentBook.language.toUpperCase()}</p>
                </div>
              )}
              {currentBook.isbn13 && (
                <div>
                  <span className="font-medium text-gray-900">ISBN-13:</span>
                  <p className="text-gray-600 font-mono text-xs">{currentBook.isbn13}</p>
                </div>
              )}
              {currentBook.isbn10 && (
                <div>
                  <span className="font-medium text-gray-900">ISBN-10:</span>
                  <p className="text-gray-600 font-mono text-xs">{currentBook.isbn10}</p>
                </div>
              )}
              {currentBook.averageRating && (
                <div>
                  <span className="font-medium text-gray-900">Rating:</span>
                  <p className="text-gray-600">
                    {currentBook.averageRating.toFixed(1)}/5
                    {currentBook.ratingsCount && ` (${currentBook.ratingsCount} reviews)`}
                  </p>
                </div>
              )}
            </div>

            {/* Links */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Links</h4>
              <div className="flex flex-wrap gap-2">
                {currentBook.previewLink && (
                  <a
                    href={currentBook.previewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    Preview
                  </a>
                )}
                {currentBook.infoLink && (
                  <a
                    href={currentBook.infoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    More Info
                  </a>
                )}
                {currentBook.buyLink && (
                  <a
                    href={currentBook.buyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 underline text-sm"
                  >
                    Buy
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Categories Management */}
          <div className="w-1/2 p-6 overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Categories & Subjects</h4>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllCategories}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllCategories}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {selectedCategories.length} of {processedCategories.length} categories selected
                {editions.length > 0 && ` (from ${editions.length + 1} sources)`}
              </p>
            </div>

            {/* Categories List */}
            <div className="space-y-2 mb-6">
              {processedCategories.map((category, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded border transition-colors ${
                    category.isIgnored 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center flex-1">
                    {!category.isIgnored && (
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.processed)}
                        onChange={() => toggleCategory(category.processed)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${category.isIgnored ? 'text-red-600 line-through' : 'text-gray-700'}`}>
                          {category.processed}
                        </span>
                        
                        {/* Category status indicators */}
                        {category.isMapped && !category.isIgnored && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Mapped
                          </span>
                        )}
                        
                        {/* Protected category indicators */}
                        {!category.isIgnored && CategoryService.isGeographicalCategory(category.processed) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" clipRule="evenodd" />
                            </svg>
                            Location
                          </span>
                        )}
                        
                        {!category.isIgnored && CategoryService.isTemporalCategory(category.processed) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Time Period
                          </span>
                        )}
                        
                        {category.isIgnored && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                            Ignored
                          </span>
                        )}
                        
                        {/* Show similar categories indicator */}
                        {showSimilarCategories[category.processed] && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Similar found
                          </span>
                        )}
                      </div>
                      
                      {/* Show original category if mapped */}
                      {category.isMapped && category.mappedFrom && (
                        <div className="text-xs text-gray-500 mt-1">
                          Originally: "{category.mappedFrom}"
                        </div>
                      )}
                      
                      {/* Show categories that map to this parent category */}
                      {category.mappedToThis && category.mappedToThis.length > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          <span className="font-medium">Mapped from:</span> {category.mappedToThis.join(', ')}
                        </div>
                      )}
                      
                      {/* Show similar categories */}
                      {showSimilarCategories[category.processed] && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <div className="font-medium text-yellow-800 mb-1">Similar categories found:</div>
                          <div className="flex flex-wrap gap-1">
                            {showSimilarCategories[category.processed].map((similar, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleMergeCategories(similar, category.processed)}
                                className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 transition-colors"
                                title={`Merge "${similar}" into "${category.processed}"`}
                              >
                                {similar} →
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 ml-2">
                    {category.isIgnored ? (
                      <button
                        onClick={() => handleUnignoreCategory(category)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                        title="Stop ignoring this category"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </button>
                    ) : (
                      <>
                        {/* Un-map button for mapped categories */}
                        {category.isMapped && (
                          <button
                            onClick={() => handleUnmapCategory(category)}
                            className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors"
                            title={category.mappedFrom ? `Remove mapping: "${category.mappedFrom}" → "${category.processed}"` : `Remove all mappings to "${category.processed}"`}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Manual mapping button */}
                        <button
                          onClick={() => handleManualMapping(category)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                          title="Manually map this category to another"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Ignore button */}
                        <button
                          onClick={() => handleIgnoreCategory(category)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                          title="Always ignore this category"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {processedCategories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No categories available</p>
                  {currentBook.openLibraryKey && !loadingEditions && (
                    <button
                      onClick={fetchAllEditionsCategories}
                      className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                    >
                      Try loading edition categories
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Category Management Summary */}
            {processedCategories.length > 0 && (
              <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Selected:</span>
                    <span className="ml-1 text-gray-600">{selectedCategories.length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Available:</span>
                    <span className="ml-1 text-gray-600">{processedCategories.filter(cat => !cat.isIgnored).length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Ignored:</span>
                    <span className="ml-1 text-gray-600">{processedCategories.filter(cat => cat.isIgnored).length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Mapped:</span>
                    <span className="ml-1 text-gray-600">{processedCategories.filter(cat => cat.isMapped).length}</span>
                  </div>
                </div>
                
                {/* Protected categories info */}
                {(processedCategories.some(cat => CategoryService.isGeographicalCategory(cat.processed)) || 
                  processedCategories.some(cat => CategoryService.isTemporalCategory(cat.processed))) && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="flex flex-wrap gap-4 text-xs">
                      {processedCategories.some(cat => CategoryService.isGeographicalCategory(cat.processed)) && (
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mr-1">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" clipRule="evenodd" />
                            </svg>
                            Location
                          </span>
                          <span className="text-gray-600">
                            {processedCategories.filter(cat => CategoryService.isGeographicalCategory(cat.processed)).length} geographical
                          </span>
                        </div>
                      )}
                      {processedCategories.some(cat => CategoryService.isTemporalCategory(cat.processed)) && (
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800 mr-1">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Time Period
                          </span>
                          <span className="text-gray-600">
                            {processedCategories.filter(cat => CategoryService.isTemporalCategory(cat.processed)).length} time periods
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Protected categories won't be suggested for merging with other types
                    </div>
                  </div>
                )}
                
                {Object.keys(showSimilarCategories).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <span className="font-medium text-yellow-700">
                      {Object.keys(showSimilarCategories).length} categories have similar matches
                    </span>
                    <span className="ml-1 text-yellow-600 text-xs">
                      (click arrows above to merge)
                    </span>
                  </div>
                )}
                
                {/* Show current mappings if any */}
                {processedCategories.some(cat => cat.isMapped) && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-purple-700">
                        Active mappings in this book:
                      </span>
                      <span className="text-purple-600 text-xs">
                        (purple ✕ to remove)
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {processedCategories
                        .filter(cat => cat.isMapped && cat.mappedFrom)
                        .map((cat, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            {cat.mappedFrom} → {cat.processed}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Show parent categories with their children */}
                {processedCategories.some(cat => cat.mappedToThis && cat.mappedToThis.length > 0) && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-purple-700">
                        Parent categories in this book:
                      </span>
                      <span className="text-purple-600 text-xs">
                        (categories with children mapped to them)
                      </span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {processedCategories
                        .filter(cat => cat.mappedToThis && cat.mappedToThis.length > 0)
                        .map((cat, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium text-purple-800">{cat.processed}:</span>
                            <span className="ml-1 text-purple-600">{cat.mappedToThis!.join(', ')}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notion Actions */}
            {isNotionConnected && notionSettings?.databaseId && (
              <div className="border-t border-gray-200 pt-4">
                <div className="mb-4">
                  {duplicateStatus === 'checking' && (
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Checking for duplicates...
                    </div>
                  )}
                  
                  {duplicateStatus === 'duplicate' && (
                    <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded">
                      <span className="text-sm text-orange-800 flex items-center">
                        <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        May be duplicate
                      </span>
                      {existingNotionPage && (
                        <a
                          href={existingNotionPage.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          View in Notion →
                        </a>
                      )}
                    </div>
                  )}
                  
                  {duplicateStatus === 'unique' && (
                    <div className="flex items-center p-2 bg-green-50 border border-green-200 rounded">
                      <svg className="h-4 w-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-green-800">Unique book</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {duplicateStatus === 'unknown' && (
                    <button
                      onClick={checkForDuplicates}
                      className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Check for Duplicates
                    </button>
                  )}
                  
                  <button
                    onClick={addToNotion}
                    disabled={isAddingToNotion || selectedCategories.length === 0}
                    className={`flex-1 px-4 py-2 text-sm rounded font-medium ${
                      isAddingToNotion || selectedCategories.length === 0
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {isAddingToNotion ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Adding to Notion...
                      </span>
                    ) : (
                      `Add to Notion (${selectedCategories.length} categories)`
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isNotionConnected && (
              <div className="border-t border-gray-200 pt-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  Connect to Notion to add this book to your database
                </div>
              </div>
            )}

            {isNotionConnected && !notionSettings?.databaseId && (
              <div className="border-t border-gray-200 pt-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  Configure your Notion settings to add books
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Mapping Modal */}
      {showManualMappingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Manual Category Mapping
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Map this category:
                </label>
                <select
                  value={manualMappingFrom}
                  onChange={(e) => setManualMappingFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select source category...</option>
                  {processedCategories
                    .filter(cat => !cat.isIgnored)
                    .map((cat, idx) => (
                      <option key={idx} value={cat.processed}>
                        {cat.processed}
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="flex items-center justify-center py-2">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To this category:
                </label>
                <select
                  value={manualMappingTo}
                  onChange={(e) => setManualMappingTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select target category...</option>
                  {processedCategories
                    .filter(cat => !cat.isIgnored && cat.processed !== manualMappingFrom)
                    .map((cat, idx) => (
                      <option key={idx} value={cat.processed}>
                        {cat.processed}
                      </option>
                    ))}
                  {/* Allow typing a new category name */}
                </select>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Or type a new category name..."
                    value={manualMappingTo}
                    onChange={(e) => setManualMappingTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <p className="font-medium mb-1">How this works:</p>
                <p>"{manualMappingFrom || 'Source category'}" will be replaced with "{manualMappingTo || 'target category'}" in all future books. Existing mappings will be preserved.</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelManualMapping}
                className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={executeManualMapping}
                disabled={!manualMappingFrom || !manualMappingTo}
                className={`flex-1 px-4 py-2 text-sm rounded font-medium ${
                  !manualMappingFrom || !manualMappingTo
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Create Mapping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetailsModal; 