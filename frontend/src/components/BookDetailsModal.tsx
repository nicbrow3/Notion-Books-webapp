import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import './BookDetailsModal/transitions.css';
import { BookSearchResult } from '../types/book';
import { CategoryService } from '../services/categoryService';
import AudiobookSelectionModal from './AudiobookSelectionModal';
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
      
      // Add original book categories
      (bookData.currentBook.categories || []).forEach(cat => bookAndEditionCategories.add(cat));
      
      // Add categories from all editions
      bookData.editions.forEach(edition => {
        (edition.categories || []).forEach(cat => bookAndEditionCategories.add(cat));
      });
      
      // Collect audiobook genres separately
      const audiobookGenres = new Set<string>();
      if (bookData.currentBook.audiobookData?.genres && bookData.currentBook.audiobookData.genres.length > 0) {
        bookData.currentBook.audiobookData.genres.forEach(genre => {
          const genreName = typeof genre === 'string' ? genre : (genre as any)?.name;
          if (genreName) {
            audiobookGenres.add(genreName);
          }
        });
      }
      
      // Combine all categories
      const allCategories = Array.from(bookAndEditionCategories).concat(Array.from(audiobookGenres));
      const uniqueCategories = Array.from(new Set(allCategories));
      categoryManagement.setRawCategories(uniqueCategories);
    }
  }, [bookData.editions, bookData.currentBook.categories, bookData.currentBook.audiobookData?.genres, categoryManagement.setRawCategories]);

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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
              book={bookData.currentBook}
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
          isAddingToNotion={notionIntegration.isAddingToNotion}
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
          bookTitle={bookData.currentBook.title}
          bookAuthor={bookData.currentBook.authors?.[0] || ''}
          onAudiobookSelected={handleAudiobookSelected}
        />
      )}

      {/* Duplicate Book Modal */}
      {notionIntegration.showDuplicateModal && (
        <DuplicateBookModal
          isOpen={notionIntegration.showDuplicateModal}
          bookTitle={bookData.currentBook.title}
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
        book={bookData.currentBook}
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