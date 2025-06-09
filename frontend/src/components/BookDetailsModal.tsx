import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import './BookDetailsModal/transitions.css';
import { BookSearchResult } from '../types/book';
import { CategoryService } from '../services/categoryService';
import AudiobookSelectionModal from './AudiobookSelectionModal';
import { X } from '@phosphor-icons/react';
import {
  BookDataTable,
  FieldSourceSelectionModal,
  ManualMappingModal,
  DuplicateBookModal,
  SuccessModal,
  CategoriesModal,
  BookHeader,
  ActionBar,
  NotionFooter,
  useBookData,
  useCategoryManagement,
  useNotionIntegration,
  formatDate
} from './BookDetailsModal/index';
import { extractPlainText } from './BookDetailsModal/utils/htmlUtils';
import { FieldSelections } from './BookDetailsModal/BookInfoPanel';

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookSearchResult;
  isNotionConnected: boolean;
  notionSettings?: any;
  onSettingsUpdated?: (updatedSettings: any) => void;
}

// Utility function to detect if text appears to be in English
const isLikelyEnglish = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  // Basic heuristics for English detection:
  // 1. Check for non-Latin characters (likely foreign language)
  const hasNonLatinChars = /[^\u0000-\u024F\u1E00-\u1EFF\s\d.,;:!?'"()[\]{}\-_/\\@#$%^&*+=<>|~`]/.test(text);
  if (hasNonLatinChars) return false;
  
  // 2. Check for common English words
  const commonEnglishWords = [
    'the', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'by', 'from', 'at', 'on', 'is', 'are', 'was', 'were',
    'fiction', 'science', 'history', 'art', 'music', 'novel', 'book', 'story', 'adventure', 'mystery', 'romance',
    'fantasy', 'horror', 'thriller', 'drama', 'comedy', 'biography', 'memoir', 'philosophy', 'religion', 'health',
    'business', 'education', 'children', 'young', 'adult', 'teen', 'crime', 'war', 'travel', 'cooking', 'sports'
  ];
  
  const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const englishWordCount = words.filter(word => commonEnglishWords.includes(word)).length;
  
  // If it contains common English words, likely English
  if (englishWordCount > 0) return true;
  
  // 3. For single words or short phrases, be more lenient with common genre terms
  if (words.length <= 2) {
    const singleWordEnglishTerms = [
      'fiction', 'nonfiction', 'fantasy', 'romance', 'mystery', 'thriller', 'horror', 'drama', 'comedy',
      'biography', 'memoir', 'history', 'science', 'art', 'music', 'poetry', 'philosophy', 'religion',
      'health', 'fitness', 'business', 'economics', 'politics', 'psychology', 'sociology', 'education',
      'children', 'juvenile', 'young', 'adult', 'teen', 'adventure', 'action', 'crime', 'detective',
      'war', 'military', 'historical', 'contemporary', 'classic', 'literature', 'poetry', 'anthology'
    ];
    
    return words.some(word => singleWordEnglishTerms.includes(word));
  }
  
  // 4. Fallback: if it's mostly Latin characters and not obviously foreign, assume English
  return text.length > 0 && !hasNonLatinChars;
};

// Utility function to check if a category should be automatically deselected
const shouldDeselectedCategory = (category: string, categorySettings: any): boolean => {
  if (!category || typeof category !== 'string') return false;
  
  const lowerCategory = category.toLowerCase();
  
  // Check for award/winner categories
  if (lowerCategory.includes('award') || lowerCategory.includes('winner')) {
    return true;
  }
  
  // Check for "large type" categories
  if (lowerCategory.includes('large type') || lowerCategory.includes('large print')) {
    return true;
  }
  
  // Check for location-based categories if auto-filtering is enabled
  if (categorySettings?.autoFilterLocations) {
    // Import the CategoryService function for location detection
    // We'll check if it's a geographical category
    const locationBasedGenres = [
      'england', 'london', 'new york', 'paris', 'rome', 'italy', 'japan', 'china', 'france', 
      'scotland', 'ireland', 'australia', 'united states', 'america', 'california', 'texas',
      'canada', 'india', 'russia', 'germany', 'spain', 'mexico', 'brazil', 'africa',
      'asia', 'europe', 'north america', 'south america', 'american', 'british', 'english', 
      'french', 'german', 'italian', 'spanish', 'canadian', 'australian', 'japanese', 
      'chinese', 'indian', 'european', 'asian', 'african', 'latin', 'nordic', 'scandinavian', 
      'mediterranean'
    ];
    
    if (locationBasedGenres.some(location => 
      lowerCategory === location || 
      lowerCategory.includes(location) ||
      location.includes(lowerCategory)
    )) {
      return true;
    }
  }
  
  return false;
};

const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  isOpen,
  onClose,
  book,
  isNotionConnected,
  notionSettings,
  onSettingsUpdated
}) => {
  // Use custom hooks for state management
  const bookData = useBookData({ book, isOpen, notionSettings });
  const categoryManagement = useCategoryManagement({ 
    book, 
    isOpen, 
    currentBook: bookData.currentBook 
  });
  const notionIntegration = useNotionIntegration({
    isOpen,
    isNotionConnected,
    notionSettings,
    onSettingsUpdated,
    currentBook: bookData.currentBook
  });

  // Local modal state
  const [showManualMappingModal, setShowManualMappingModal] = useState(false);
  const [manualMappingFrom, setManualMappingFrom] = useState<string>('');
  const [manualMappingTo, setManualMappingTo] = useState<string>('');
  const [showAudiobookSelectionModal, setShowAudiobookSelectionModal] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Load editions and audiobook data on modal open
  useEffect(() => {
    if (isOpen && bookData.currentBook.openLibraryKey) {
      bookData.fetchAllEditionsCategories();
    }
  }, [isOpen, bookData.currentBook.openLibraryKey, bookData.fetchAllEditionsCategories]);

  useEffect(() => {
    if (isOpen && !bookData.currentBook.audiobookData && !bookData.loadingAudiobook) {
      bookData.fetchAudiobookData();
    }
  }, [isOpen, bookData.currentBook.audiobookData, bookData.loadingAudiobook, bookData.fetchAudiobookData]);

  // Update categories from editions when they're loaded
  useEffect(() => {
    if (bookData.editions.length > 0 && bookData.currentBook.categories) {
      const bookAndEditionCategories = new Set<string>();
      
      // Determine if we should filter for English-only categories
      const shouldFilterEnglishOnly = !notionSettings || notionSettings.useEnglishOnlySources !== false;
      
      // Load category settings to check for auto-filtering preferences
      const categorySettings = CategoryService.loadSettings();
      
      // Add original book categories (with English filtering if enabled)
      (bookData.currentBook.categories || []).forEach(cat => {
        if (!shouldFilterEnglishOnly || isLikelyEnglish(cat)) {
          bookAndEditionCategories.add(cat);
        } else {
          console.log(`Filtering non-English category from original book: "${cat}"`);
        }
      });
      
      // Add categories from all editions (these should already be English-filtered editions)
      bookData.editions.forEach(edition => {
        (edition.categories || []).forEach(cat => {
          // Double-check that edition categories are English, since editions are already filtered
          if (!shouldFilterEnglishOnly || isLikelyEnglish(cat)) {
            bookAndEditionCategories.add(cat);
          } else {
            console.log(`Filtering non-English category from edition: "${cat}"`);
          }
        });
      });
      
      // Collect audiobook genres separately (these are typically in English from audiobook services)
      const audiobookGenres = new Set<string>();
      if (bookData.currentBook.audiobookData?.genres && bookData.currentBook.audiobookData.genres.length > 0) {
        bookData.currentBook.audiobookData.genres.forEach(genre => {
          const genreName = typeof genre === 'string' ? genre : (genre as any)?.name;
          if (genreName) {
            if (!shouldFilterEnglishOnly || isLikelyEnglish(genreName)) {
              audiobookGenres.add(genreName);
            } else {
              console.log(`Filtering non-English audiobook genre: "${genreName}"`);
            }
          }
        });
      }
      
      // Combine all categories
      const allCategories = Array.from(bookAndEditionCategories).concat(Array.from(audiobookGenres));
      const uniqueCategories = Array.from(new Set(allCategories));
      
      if (shouldFilterEnglishOnly) {
        console.log(`Collected ${uniqueCategories.length} English categories from book and ${bookData.editions.length} editions`);
      }
      
      // Apply additional filtering for award/winner/large type categories
      const filteredCategories = uniqueCategories.filter(cat => {
        const lowerCat = cat.toLowerCase();
        
        // Filter out award/winner categories
        if (lowerCat.includes('award') || lowerCat.includes('winner')) {
          console.log(`Filtering award/winner category: "${cat}"`);
          return false;
        }
        
        // Filter out large type categories
        if (lowerCat.includes('large type') || lowerCat.includes('large print')) {
          console.log(`Filtering large type category: "${cat}"`);
          return false;
        }
        
        // Filter out language materials categories
        if (lowerCat.includes('language materials')) {
          console.log(`Filtering language materials category: "${cat}"`);
          return false;
        }
        
        return true;
      });
      
      console.log(`Final category count: ${filteredCategories.length} (filtered out ${uniqueCategories.length - filteredCategories.length} unwanted categories)`);
      
      categoryManagement.setRawCategories(filteredCategories);
    }
  }, [bookData.editions, bookData.currentBook.categories, bookData.currentBook.audiobookData?.genres, categoryManagement.setRawCategories, notionSettings?.useEnglishOnlySources]);

  // Handler for "Add another book" button
  const handleAddAnotherBook = () => {
    notionIntegration.setShowSuccessModal(false);
    notionIntegration.setSuccessModalData(null);
    onClose();
  };

  // Handler functions that delegate to hooks
  const handleAudiobookSelected = (audiobookData: any) => {
    console.log(`User selected audiobook: "${audiobookData.title}"`);
    bookData.setCurrentBook({
      ...bookData.currentBook,
      audiobookData: audiobookData
    });
    toast.success(`Audiobook selected: "${audiobookData.title}"`);
  };

  const openAudiobookSearch = () => {
    setShowAudiobookSelectionModal(true);
  };

  // Manual mapping handlers
  const executeManualMapping = () => {
    if (!manualMappingFrom || !manualMappingTo) {
      toast.error('Please select both source and target categories');
      return;
    }

    if (manualMappingFrom === manualMappingTo) {
      toast.error('Cannot map a category to itself');
      return;
    }

    categoryManagement.handleMergeCategories(manualMappingFrom, manualMappingTo);
    setShowManualMappingModal(false);
    setManualMappingFrom('');
    setManualMappingTo('');
  };

  const cancelManualMapping = () => {
    setShowManualMappingModal(false);
    setManualMappingFrom('');
    setManualMappingTo('');
  };

  const handleManualMapping = (category: any) => {
    setManualMappingFrom(category.processed);
    setManualMappingTo('');
    setShowManualMappingModal(true);
  };

  // Handler for opening source selection modal
  const handleSelectSource = (fieldId: string) => {
    setEditingField(fieldId);
    setIsSourceModalOpen(true);
  };

  // Handler for source selection
  const handleSourceSelected = (value: string | number) => {
    if (editingField) {
      console.log(`Selected source "${value}" for field "${editingField}"`);
      
      // Update field selections based on the chosen source
      const currentSelections = bookData.fieldSelections || {} as FieldSelections;
      const newSelections = {
        ...currentSelections,
        [editingField]: value
      };
      
      // Get updated selected data
      const getUpdatedSelectedData = () => {
        const selectedData: any = {};
        
        Object.keys(newSelections).forEach(fieldKey => {
          const selection = newSelections[fieldKey as keyof typeof newSelections];
          
          if (fieldKey === 'thumbnail') {
            if (selection === 'audiobook' && bookData.currentBook.audiobookData?.image) {
              selectedData.thumbnail = bookData.currentBook.audiobookData.image;
            } else if (typeof selection === 'number' && bookData.editions && bookData.editions[selection]?.thumbnail) {
              selectedData.thumbnail = bookData.editions[selection].thumbnail;
            } else {
              selectedData.thumbnail = bookData.currentBook.thumbnail;
            }
          }
          else if (fieldKey === 'description') {
            if (selection === 'audiobook' && bookData.currentBook.audiobookData?.description) {
              // Clean HTML from audiobook description for Notion
              selectedData.description = extractPlainText(bookData.currentBook.audiobookData.description);
            } else if (selection === 'audiobook_summary' && bookData.currentBook.audiobookData?.summary) {
              // Clean HTML from audiobook summary for Notion
              selectedData.description = extractPlainText(bookData.currentBook.audiobookData.summary);
            } else if (typeof selection === 'number' && bookData.editions && bookData.editions[selection]?.description) {
              selectedData.description = bookData.editions[selection].description;
            } else {
              selectedData.description = bookData.currentBook.description;
            }
          }
          else if (fieldKey === 'publisher') {
            if (selection === 'audiobook' && bookData.currentBook.audiobookData?.publisher) {
              selectedData.publisher = bookData.currentBook.audiobookData.publisher;
            } else if (typeof selection === 'number' && bookData.editions && bookData.editions[selection]?.publisher) {
              selectedData.publisher = bookData.editions[selection].publisher;
            } else {
              selectedData.publisher = bookData.currentBook.publisher;
            }
          }
          else if (fieldKey === 'releaseDate') {
            if (selection === 'audiobook' && bookData.currentBook.audiobookData?.publishedDate) {
              selectedData.releaseDate = bookData.currentBook.audiobookData.publishedDate;
            } else if (typeof selection === 'number' && bookData.editions && bookData.editions[selection]?.publishedDate) {
              selectedData.releaseDate = bookData.editions[selection].publishedDate;
            } else {
              selectedData.releaseDate = bookData.currentBook.publishedDate;
            }
          }
          else if (fieldKey === 'pageCount') {
            if (typeof selection === 'number' && bookData.editions && bookData.editions[selection]?.pageCount) {
              selectedData.pageCount = bookData.editions[selection].pageCount;
            } else {
              selectedData.pageCount = bookData.currentBook.pageCount;
            }
          }
        });
        
        return selectedData;
      };
      
      const updatedSelectedData = getUpdatedSelectedData();
      bookData.setFieldSelections(newSelections);
      bookData.setSelectedFieldData(updatedSelectedData);
      
      // Debug logging to track field selection changes
      console.log(`Field selection updated for ${editingField}:`, {
        selectedSource: value,
        newData: updatedSelectedData[editingField],
        allSelectedData: updatedSelectedData
      });
      
      toast.success(`Updated ${editingField} to use ${value} source`);
    }
    setIsSourceModalOpen(false);
    setEditingField(null);
  };

  // Enhanced duplicate handlers
  const handleDuplicateReplace = () => {
    const finalBookData = bookData.getFinalBookData();
    notionIntegration.handleDuplicateReplace(finalBookData, categoryManagement.selectedCategories);
  };

  const handleDuplicateKeepBoth = () => {
    const finalBookData = bookData.getFinalBookData();
    notionIntegration.handleDuplicateKeepBoth(finalBookData, categoryManagement.selectedCategories);
  };

  // Enhanced addToNotion that passes final book data
  const addToNotionWithData = async () => {
    const finalBookData = bookData.getFinalBookData();
    await notionIntegration.addToNotion(finalBookData, categoryManagement.selectedCategories);
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
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
              <X size={24} weight="light" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 overflow-y-auto h-[calc(95vh-200px)]">
          {/* Book Header Section */}
          <div className="pt-6">
            <BookHeader
              book={bookData.getFinalBookData()}
              fieldSelections={bookData.fieldSelections}
              getFieldSources={bookData.getFieldSources}
              onSelectSource={handleSelectSource}
              formatDate={formatDate}
            />
          </div>

          {/* Action Bar */}
          <ActionBar
            selectedCategoriesCount={categoryManagement.selectedCategories.length}
            duplicateStatus={notionIntegration.duplicateStatus}
            onOpenCategoriesModal={() => setIsCategoriesModalOpen(true)}
          />

          {/* Main Book Data Table */}
          <div className="pb-6">
            <BookDataTable
              book={bookData.getFinalBookData()}
              selectedCategories={categoryManagement.selectedCategories}
              notionSettings={notionSettings}
              tempFieldMappings={notionIntegration.tempFieldMappings}
              databaseProperties={notionIntegration.databaseProperties}
              loadingDatabaseProperties={notionIntegration.loadingDatabaseProperties}
              onSelectSource={handleSelectSource}
              onTempFieldMappingChange={notionIntegration.handleTempFieldMappingChange}
              fieldSelections={bookData.fieldSelections}
              editions={bookData.editions}
              audiobookData={bookData.currentBook.audiobookData}
              openAudiobookSearch={openAudiobookSearch}
              loadingAudiobook={bookData.loadingAudiobook}
              onOpenCategoriesModal={() => setIsCategoriesModalOpen(true)}
            />
          </div>
        </div>

        {/* Footer with Notion Actions */}
        <NotionFooter
          isNotionConnected={isNotionConnected}
          duplicateStatus={notionIntegration.duplicateStatus}
          duplicateCount={notionIntegration.duplicateCount}
          duplicatePages={notionIntegration.duplicatePages}
          isAddingToNotion={notionIntegration.isAddingToNotion}
          isCheckingDuplicates={notionIntegration.duplicateStatus === 'checking'}
          selectedCategoriesCount={categoryManagement.selectedCategories.length}
          duplicateCheckButtonRef={notionIntegration.duplicateCheckButtonRef}
          onCheckForDuplicates={() => notionIntegration.checkForDuplicates(true)}
          onAddToNotion={addToNotionWithData}
        />
      </div>

      {/* Manual Mapping Modal */}
      {showManualMappingModal && (
        <ManualMappingModal
          isOpen={showManualMappingModal}
          processedCategories={categoryManagement.processedCategories}
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
          bookTitle={bookData.getFinalBookData().title}
          bookAuthor={bookData.getFinalBookData().authors?.[0] || ''}
          onAudiobookSelected={handleAudiobookSelected}
        />
      )}

      {/* Duplicate Book Modal */}
      {notionIntegration.showDuplicateModal && (
        <DuplicateBookModal
          isOpen={notionIntegration.showDuplicateModal}
          bookTitle={bookData.getFinalBookData().title}
          existingNotionPage={notionIntegration.existingNotionPage}
          onClose={notionIntegration.handleDuplicateCancel}
          onCancel={notionIntegration.handleDuplicateCancel}
          onReplace={handleDuplicateReplace}
          onKeepBoth={handleDuplicateKeepBoth}
        />
      )}

      {/* Success Modal */}
      {notionIntegration.showSuccessModal && notionIntegration.successModalData && (
        <SuccessModal
          isOpen={notionIntegration.showSuccessModal}
          onClose={() => notionIntegration.setShowSuccessModal(false)}
          bookTitle={notionIntegration.successModalData.bookTitle}
          notionUrl={notionIntegration.successModalData.notionUrl}
          categoriesCount={notionIntegration.successModalData.categoriesCount}
          dateType={notionIntegration.successModalData.dateType}
          actionType={notionIntegration.successModalData.actionType}
          onAddAnotherBook={handleAddAnotherBook}
        />
      )}

      {/* Categories Management Modal */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        book={bookData.getFinalBookData()}
        processedCategories={categoryManagement.processedCategories}
        selectedCategories={categoryManagement.selectedCategories}
        categorySettings={categoryManagement.categorySettings}
        showSimilarCategories={categoryManagement.showSimilarCategories}
        onToggleCategory={categoryManagement.toggleCategory}
        onSelectAllCategories={categoryManagement.selectAllCategories}
        onDeselectAllCategories={categoryManagement.deselectAllCategories}
        onIgnoreCategory={categoryManagement.handleIgnoreCategory}
        onUnignoreCategory={categoryManagement.handleUnignoreCategory}
        onMergeCategories={categoryManagement.handleMergeCategories}
        onManualMapping={handleManualMapping}
        onUnmapCategory={categoryManagement.handleUnmapCategory}
      />

      {/* Field Source Selection Modal */}
      {isSourceModalOpen && editingField && (
        <FieldSourceSelectionModal<string | number>
          isOpen={isSourceModalOpen}
          onClose={() => setIsSourceModalOpen(false)}
          fieldName={editingField}
          sources={bookData.getFieldSources(editingField)}
          selectedValue={(() => {
            // Get the current selection for this field
            if (bookData.fieldSelections) {
              switch (editingField) {
                case 'description':
                  return bookData.fieldSelections.description || CategoryService.getFieldDefault('description') || 'original';
                case 'publisher':
                  return bookData.fieldSelections.publisher || CategoryService.getFieldDefault('publisher') || 'original';
                case 'pageCount':
                  return bookData.fieldSelections.pageCount || CategoryService.getFieldDefault('pagecount') || 'original';
                case 'releaseDate':
                  return bookData.fieldSelections.releaseDate || CategoryService.getFieldDefault('releaseDate') || 'original';
                case 'isbn':
                  return bookData.fieldSelections.isbn || CategoryService.getFieldDefault('isbn') || 'original';
                case 'thumbnail':
                  return bookData.fieldSelections.thumbnail || CategoryService.getFieldDefault('thumbnail') || 'original';
                default:
                  return CategoryService.getFieldDefault(editingField.toLowerCase()) || 'original';
              }
            }
            
            // If no fieldSelections yet, check for saved defaults
            const savedDefault = CategoryService.getFieldDefault(editingField.toLowerCase());
            
            // For audiobook-related fields, only use audiobook default if audiobook data is actually loaded
            if (savedDefault === 'audiobook' && editingField !== 'pageCount') {
              if (bookData.currentBook.audiobookData && !bookData.loadingAudiobook) {
                switch (editingField) {
                  case 'description':
                    if (bookData.currentBook.audiobookData.description || bookData.currentBook.audiobookData.summary) {
                      return savedDefault;
                    }
                    break;
                  case 'thumbnail':
                    if (bookData.currentBook.audiobookData.image) {
                      return savedDefault;
                    }
                    break;
                  case 'publisher':
                    if (bookData.currentBook.audiobookData.publisher) {
                      return savedDefault;
                    }
                    break;
                  case 'releaseDate':
                    if (bookData.currentBook.audiobookData.publishedDate) {
                      return savedDefault;
                    }
                    break;
                }
              }
              return 'original';
            }
            
            return savedDefault || 'original';
          })()}
          onSelect={handleSourceSelected}
        />
      )}
    </div>
  );
};

export default BookDetailsModal; 