import React from 'react';
import { CategoryService } from '../../services/categoryService';
import CategoryItem from './CategoryItem';

interface ProcessedCategory {
  original: string;
  processed: string;
  isIgnored: boolean;
  isMapped: boolean;
  mappedFrom?: string;
  mappedToThis?: string[];
}

interface CategoryListProps {
  processedCategories: ProcessedCategory[];
  selectedCategories: string[];
  showSimilarCategories: { [key: string]: string[] };
  onToggleCategory: (category: string) => void;
  onIgnoreCategory: (category: ProcessedCategory) => void;
  onUnignoreCategory: (category: ProcessedCategory) => void;
  onMergeCategories: (fromCategory: string, toCategory: string) => void;
  onManualMapping: (category: ProcessedCategory) => void;
  onUnmapCategory: (category: ProcessedCategory) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
  processedCategories,
  selectedCategories,
  showSimilarCategories,
  onToggleCategory,
  onIgnoreCategory,
  onUnignoreCategory,
  onMergeCategories,
  onManualMapping,
  onUnmapCategory
}) => {
  return (
    <>
      {/* Categories List */}
      <div className="space-y-2 mb-6">
        {processedCategories.map((category, index) => (
          <CategoryItem
            key={index}
            category={category}
            isSelected={selectedCategories.includes(category.processed)}
            similarCategories={showSimilarCategories[category.processed]}
            onToggle={() => onToggleCategory(category.processed)}
            onIgnore={() => onIgnoreCategory(category)}
            onUnignore={() => onUnignoreCategory(category)}
            onMergeWith={(fromCategory: string) => onMergeCategories(fromCategory, category.processed)}
            onManualMapping={() => onManualMapping(category)}
            onUnmap={() => onUnmapCategory(category)}
          />
        ))}
        
        {processedCategories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No categories available</p>
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
    </>
  );
};

export default CategoryList; 