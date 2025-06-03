import React from 'react';
import { BookSearchResult } from '../../types/book';
import { CategorySettings } from '../../services/categoryService';
import CategoryList from './CategoryList';
import NotionFieldMappings from './NotionFieldMappings';
import NotionActions from './NotionActions';

interface ProcessedCategory {
  original: string;
  processed: string;
  isIgnored: boolean;
  isMapped: boolean;
  mappedFrom?: string;
  mappedToThis?: string[];
}

interface CategoriesManagementPanelProps {
  book: BookSearchResult;
  processedCategories: ProcessedCategory[];
  selectedCategories: string[];
  categorySettings: CategorySettings;
  isCategoriesSectionCollapsed: boolean;
  isNotionMappingsCollapsed: boolean;
  showSimilarCategories: { [key: string]: string[] };
  duplicateStatus: 'unknown' | 'checking' | 'duplicate' | 'unique';
  existingNotionPage: { url: string; title: string } | null;
  isAddingToNotion: boolean;
  isNotionConnected: boolean;
  notionSettings?: any;
  tempFieldMappings?: any;
  databaseProperties?: any;
  loadingDatabaseProperties?: boolean;
  onToggleCategory: (category: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  onSetCategoriesSectionCollapsed: (collapsed: boolean) => void;
  onSetNotionMappingsCollapsed: (collapsed: boolean) => void;
  onIgnoreCategory: (category: ProcessedCategory) => void;
  onUnignoreCategory: (category: ProcessedCategory) => void;
  onMergeCategories: (fromCategory: string, toCategory: string) => void;
  onManualMapping: (category: ProcessedCategory) => void;
  onUnmapCategory: (category: ProcessedCategory) => void;
  onCheckForDuplicates: () => void;
  onAddToNotion: () => void;
  onTempFieldMappingChange?: (bookField: string, notionProperty: string) => void;
  onResetTempFieldMappings?: () => void;
  onSaveTempFieldMappings?: () => void;
  onHasUnsavedChanges?: () => boolean;
}

const CategoriesManagementPanel: React.FC<CategoriesManagementPanelProps> = ({
  book,
  processedCategories,
  selectedCategories,
  categorySettings,
  isCategoriesSectionCollapsed,
  isNotionMappingsCollapsed,
  showSimilarCategories,
  duplicateStatus,
  existingNotionPage,
  isAddingToNotion,
  isNotionConnected,
  notionSettings,
  tempFieldMappings,
  databaseProperties,
  loadingDatabaseProperties,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  onSetCategoriesSectionCollapsed,
  onSetNotionMappingsCollapsed,
  onIgnoreCategory,
  onUnignoreCategory,
  onMergeCategories,
  onManualMapping,
  onUnmapCategory,
  onCheckForDuplicates,
  onAddToNotion,
  onTempFieldMappingChange,
  onResetTempFieldMappings,
  onSaveTempFieldMappings,
  onHasUnsavedChanges
}) => {
  const formatAuthors = (authors: string[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' and ');
    return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
  };

  return (
    <div className="w-1/2 p-6 overflow-y-auto">
      <div className="mb-4">
        <div 
          className="flex items-center justify-between p-3 mb-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
          onClick={() => onSetCategoriesSectionCollapsed(!isCategoriesSectionCollapsed)}
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

      {/* Field Mappings & Settings */}
      {isNotionConnected && notionSettings?.fieldMapping && (
        <NotionFieldMappings
          book={book}
          selectedCategories={selectedCategories}
          isCollapsed={isNotionMappingsCollapsed}
          notionSettings={notionSettings}
          tempFieldMappings={tempFieldMappings}
          databaseProperties={databaseProperties}
          loadingDatabaseProperties={loadingDatabaseProperties}
          formatAuthors={formatAuthors}
          onSetCollapsed={onSetNotionMappingsCollapsed}
          onTempFieldMappingChange={onTempFieldMappingChange}
          onResetTempFieldMappings={onResetTempFieldMappings}
          onSaveTempFieldMappings={onSaveTempFieldMappings}
          onHasUnsavedChanges={onHasUnsavedChanges}
          showDataValues={true}
        />
      )}

      {/* Notion Actions */}
      <NotionActions
        isNotionConnected={isNotionConnected}
        notionSettings={notionSettings}
        duplicateStatus={duplicateStatus}
        existingNotionPage={existingNotionPage}
        isAddingToNotion={isAddingToNotion}
        selectedCategories={selectedCategories}
        onCheckForDuplicates={onCheckForDuplicates}
        onAddToNotion={onAddToNotion}
      />
    </div>
  );
};

export default CategoriesManagementPanel; 