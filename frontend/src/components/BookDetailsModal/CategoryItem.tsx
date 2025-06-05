import React from 'react';
import { CategoryService } from '../../services/categoryService';

interface ProcessedCategory {
  original: string;
  processed: string;
  isIgnored: boolean;
  isMapped: boolean;
  mappedFrom?: string;
  mappedToThis?: string[];
}

interface CategoryItemProps {
  category: ProcessedCategory;
  isSelected: boolean;
  similarCategories?: string[];
  onToggle: () => void;
  onIgnore: () => void;
  onUnignore: () => void;
  onMergeWith: (fromCategory: string) => void;
  onManualMapping: () => void;
  onUnmap: () => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  isSelected,
  similarCategories,
  onToggle,
  onIgnore,
  onUnignore,
  onMergeWith,
  onManualMapping,
  onUnmap
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  const hasSubcategories = category.mappedToThis && category.mappedToThis.length > 0;
  const subcategoryCount = hasSubcategories ? category.mappedToThis!.length : 0;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded border transition-colors ${
        category.isIgnored 
          ? 'border-red-200 bg-red-50' 
          : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
      }`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!category.isIgnored && 
            !target.closest('button') && 
            !target.closest('input') && 
            !target.closest('a') &&
            !target.closest('.subcategory-count')) {
          onToggle();
        }
      }}
    >
      <div className="flex items-center flex-1">
        {!category.isIgnored && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        )}
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${category.isIgnored ? 'text-red-600 line-through' : 'text-gray-700'}`}>
              {category.processed}
            </span>
            
            {/* Show subcategory count badge for parent categories */}
            {hasSubcategories && !category.isIgnored && (
              <div className="relative">
                <div 
                  className="subcategory-count inline-flex items-center justify-center w-5 h-5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full cursor-pointer"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  {subcategoryCount}
                </div>
                
                {/* Tooltip showing subcategories */}
                {showTooltip && (
                  <div className="absolute z-10 w-48 p-2 mt-1 text-xs bg-white rounded-md shadow-lg border border-gray-200">
                    <div className="font-medium text-purple-800 mb-1">
                      Subcategories:
                    </div>
                    <ul className="list-disc pl-4 text-gray-700 space-y-1">
                      {category.mappedToThis!.map((subcategory, idx) => (
                        <li key={idx}>{subcategory}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {category.isMapped && !category.isIgnored && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Mapped
              </span>
            )}
            
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
            
            {similarCategories && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Similar found
              </span>
            )}
          </div>
          
          {category.isMapped && category.mappedFrom && (
            <div className="text-xs text-gray-500 mt-1">
              Originally: "{category.mappedFrom}"
            </div>
          )}
          
          {similarCategories && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="font-medium text-yellow-800 mb-1">Similar categories found:</div>
              <div className="flex flex-wrap gap-1">
                {similarCategories.map((similar, idx) => (
                  <button
                    key={idx}
                    onClick={() => onMergeWith(similar)}
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
      
      <div className="flex items-center gap-1 ml-2">
        {category.isIgnored ? (
          <button
            onClick={onUnignore}
            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
            title="Stop ignoring this category"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <>
            {category.isMapped && (
              <button
                onClick={onUnmap}
                className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors"
                title={category.mappedFrom ? `Remove mapping: "${category.mappedFrom}" → "${category.processed}"` : `Remove all mappings to "${category.processed}"`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 1.944c-4.418 0-8 3.582-8 8s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            <button
              onClick={onManualMapping}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
              title="Manually map this category to another"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button
              onClick={onIgnore}
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
  );
};

export default CategoryItem; 