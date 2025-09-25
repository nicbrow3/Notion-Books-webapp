import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

  // 1. Reject strings that contain obvious non-Latin characters
  // eslint-disable-next-line no-control-regex
  const hasNonLatinChars = /[^\u0001-\u024F\u1E00-\u1EFF\s\d.,;:!?'"()[\]{}\-_/\\@#$%^&*+=<>|~`]/.test(text);
  if (hasNonLatinChars) return false;

  // Clean tokenisation – split on anything that isn't a letter (keeps words like "sci-fi")
  const words = text.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 0);

  // 2. Quick hit list of frequent English filler words / conjunctions
  const commonEnglishWords = new Set([
    'the','and','or','of','in','to','for','with','by','from','at','on','is','are','was','were'
  ]);
  if (words.some(w => commonEnglishWords.has(w))) return true;

  // 3. Domain-specific single/short genre words that we want to treat as English even if they aren't in dictionaries
  const genreTerms = new Set([
    'fiction','nonfiction','fantasy','romance','mystery','thriller','horror','drama','comedy','biography','memoir',
    'history','science','art','music','poetry','philosophy','religion','health','fitness','business','economics',
    'politics','psychology','sociology','education','children','juvenile','young','adult','teen','adventure',
    'action','crime','detective','war','military','historical','contemporary','classic','literature','anthology',
    'humor','humorous','paranormal','urban','suspense'
  ]);

  if (words.length <= 2 && words.every(w => genreTerms.has(w))) {
    return true;
  }

  // 4. Fallback – all-Latin characters and not empty → assume English
  return true;
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
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    // Delay the actual close to allow animation to complete
    setTimeout(() => {
      onClose();
    }, 300); // Match the exit animation duration
  };

  // Load editions and audiobook data on modal open
  useEffect(() => {
    if (isOpen && bookData.currentBook.openLibraryKey) {
      setIsClosing(false); // Reset closing state when modal opens
      bookData.fetchAllEditionsCategories();
    }
  }, [isOpen, bookData]);

  useEffect(() => {
    if (isOpen && !bookData.currentBook.audiobookData && !bookData.loadingAudiobook) {
      setIsClosing(false); // Reset closing state when modal opens
      bookData.fetchAudiobookData();
    }
  }, [isOpen, bookData]);

  // Update categories from editions when they're loaded
  useEffect(() => {
    if (bookData.editions.length > 0 && bookData.currentBook.categories) {
      const bookAndEditionCategories = new Set<string>();
      
      // Determine if we should filter for English-only categories
      const shouldFilterEnglishOnly = !notionSettings || notionSettings.useEnglishOnlySources !== false;
      
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
            console.log(`Filtering non-English category from edition "${edition.title}": "${cat}"`);
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
              console.log(`Filtering non-English audiobook genre for "${bookData.currentBook.title}": "${genreName}"`);
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

      // NEW: Pre-split categories based on current settings to avoid showing unsplit compound genres
      const currentCategorySettings = CategoryService.loadSettings();
      const preSplitCategories = CategoryService.splitCategories(
        filteredCategories,
        {
          splitCommas: currentCategorySettings.splitCommas !== false,
          splitAmpersand: currentCategorySettings.splitAmpersand !== false,
          splitSlashes: currentCategorySettings.splitSlashes !== false,
        }
      );

      // Only update state if categories actually changed to avoid render loops
      const prevCategories = categoryManagement.rawCategories;
      const areArraysEqual = (a: string[], b: string[]) =>
        a.length === b.length && a.every((val, idx) => val === b[idx]);

      if (!areArraysEqual(preSplitCategories, prevCategories)) {
        categoryManagement.setRawCategories(preSplitCategories);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookData.currentBook.title, categoryManagement, notionSettings]);

  // Handler for "Add another book" button
  const handleAddAnotherBook = () => {
    notionIntegration.setShowSuccessModal(false);
    notionIntegration.setSuccessModalData(null);
    handleClose();
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
      bookData.updateFieldSelection(editingField, value);
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

  if (!isOpen && !isClosing) return null;

  return (
    <AnimatePresence mode="wait">
      {(isOpen || isClosing) && (
        <motion.div
          key="book-details-modal"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: isClosing ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isClosing) {
              handleClose();
            }
          }}
        >
          <motion.div
            className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ 
              opacity: isClosing ? 0 : 1, 
              scale: isClosing ? 0.9 : 1, 
              y: isClosing ? 0 : 0 
            }}
            transition={{ 
              type: "spring", 
              stiffness: isClosing ? 600 : 300, 
              damping: isClosing ? 25 : 30,
              duration: isClosing ? 0.25 : 0.3
            }}
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
              onClick={handleClose}
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
              getFieldSources={bookData.getFieldSources}
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
          </motion.div>

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
            if (bookData.fieldSelections && bookData.fieldSelections[editingField as keyof FieldSelections] !== undefined) {
              return bookData.fieldSelections[editingField as keyof FieldSelections];
            }
            
            // If no fieldSelections yet, check for saved defaults
            const fieldNameForDefault = editingField === 'pageCount' ? 'pagecount' : editingField;
            const savedDefault = CategoryService.getFieldDefault(fieldNameForDefault.toLowerCase());
            
            // For audiobook-related fields, only use audiobook default if audiobook data is actually loaded
            if ((savedDefault === 'audiobook' || savedDefault === 'audiobook_summary') && editingField !== 'pageCount') {
              if (bookData.currentBook.audiobookData && !bookData.loadingAudiobook) {
                switch (editingField) {
                  case 'description':
                    if (savedDefault === 'audiobook' && bookData.currentBook.audiobookData.description) {
                      return savedDefault;
                    }
                    if (savedDefault === 'audiobook_summary' && bookData.currentBook.audiobookData.summary) {
                      return savedDefault;
                    }
                    // If the specific audiobook data isn't available, fallback to original
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
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

export default BookDetailsModal; 