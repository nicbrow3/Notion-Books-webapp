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
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">Categories</h4>
          <div className="flex gap-2">
            <button
              onClick={() => onSetCategoriesSectionCollapsed(!isCategoriesSectionCollapsed)}
              className="text-xs text-gray-600 hover:text-gray-800 underline"
            >
              {isCategoriesSectionCollapsed ? 'Expand' : 'Collapse'}
            </button>
            <button
              onClick={onSelectAllCategories}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Select All
            </button>
            <button
              onClick={onDeselectAllCategories}
              className="text-xs text-red-600 hover:text-red-800 underline"
            >
              Deselect All
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