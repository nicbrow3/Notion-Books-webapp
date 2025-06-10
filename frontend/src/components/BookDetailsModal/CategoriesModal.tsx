import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { BookSearchResult } from '../../types/book';
import { CategorySettings } from '../../services/categoryService';
import CategoryList from './CategoryList';

interface ProcessedCategory {
  original: string;
  processed: string;
  isIgnored: boolean;
  isMapped: boolean;
  mappedFrom?: string;
  mappedToThis?: string[];
}

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookSearchResult;
  processedCategories: ProcessedCategory[];
  selectedCategories: string[];
  categorySettings: CategorySettings;
  showSimilarCategories: { [key: string]: string[] };
  onToggleCategory: (category: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  onIgnoreCategory: (category: ProcessedCategory) => void;
  onUnignoreCategory: (category: ProcessedCategory) => void;
  onMergeCategories: (fromCategory: string, toCategory: string) => void;
  onManualMapping: (category: ProcessedCategory) => void;
  onUnmapCategory: (category: ProcessedCategory) => void;
}

const CategoriesModal: React.FC<CategoriesModalProps> = ({
  isOpen,
  onClose,
  book,
  processedCategories,
  selectedCategories,
  categorySettings,
  showSimilarCategories,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  onIgnoreCategory,
  onUnignoreCategory,
  onMergeCategories,
  onManualMapping,
  onUnmapCategory
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isCategoriesSectionCollapsed, setIsCategoriesSectionCollapsed] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation(); // Prevent event from bubbling up to parent modal
      onClose();
    }
  };

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen || !isMounted) {
    return null;
  }

  const modalContent = (
    <div
      className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-enter-active bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={handleModalContentClick}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Categories Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage categories for "{book.title}"
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Categories Section */}
          <div className="mb-4">
            <div 
              className="flex items-center justify-between p-3 mb-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              // onClick={() => setIsCategoriesSectionCollapsed(!isCategoriesSectionCollapsed)}
              title={isCategoriesSectionCollapsed ? 'Expand categories' : 'Collapse categories'}
            >
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">Categories / Genres</h4>
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 text-gray-600 ${isCategoriesSectionCollapsed ? 'rotate-0' : 'rotate-90'}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAllCategories();
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                  title="Select all categories"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeselectAllCategories();
                  }}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                  title="Deselect all categories"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {selectedCategories.length} of {processedCategories.length} categories selected
            </p>
          </div>

          {!isCategoriesSectionCollapsed && (
            <CategoryList
              processedCategories={processedCategories}
              selectedCategories={selectedCategories}
              showSimilarCategories={showSimilarCategories}
              onToggleCategory={onToggleCategory}
              onIgnoreCategory={onIgnoreCategory}
              onUnignoreCategory={onUnignoreCategory}
              onMergeCategories={onMergeCategories}
              onManualMapping={onManualMapping}
              onUnmapCategory={onUnmapCategory}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedCategories.length} categories selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Ensure document.body exists for SSR safety
  if (typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(modalContent, document.body);
  }
  return null;
};

export default CategoriesModal; 