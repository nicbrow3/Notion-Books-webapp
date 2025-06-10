import React from 'react';
import { BookSearchResult } from '../../types/book';
import { FieldSelections } from './BookInfoPanel';
import { CategoryService } from '../../services/categoryService';
import { extractPlainText } from './utils/htmlUtils';

interface BookDataField {
  id: string;
  label: string;
  category?: 'basic' | 'publishing' | 'audiobook' | 'metadata';
}

interface FieldSource {
  value: string | number;
  label: string;
  content: string;
}

interface BookDataRowProps {
  field: BookDataField;
  book: BookSearchResult;
  value: string;
  sources: FieldSource[];
  notionSettings?: any;
  tempFieldMappings?: any;
  databaseProperties?: any;
  loadingDatabaseProperties?: boolean;
  onSelectSource: (fieldId: string) => void;
  onTempFieldMappingChange?: (bookField: string, notionProperty: string) => void;
  fieldSelections?: FieldSelections | null;
  selectedCategories?: string[];
  onOpenCategoriesModal?: () => void;
}

const BookDataRow: React.FC<BookDataRowProps> = ({
  field,
  book,
  value,
  sources,
  notionSettings,
  tempFieldMappings,
  databaseProperties,
  loadingDatabaseProperties,
  onSelectSource,
  onTempFieldMappingChange,
  fieldSelections,
  selectedCategories,
  onOpenCategoriesModal
}) => {
  // Get current Notion mapping for this field
  const getCurrentMapping = () => {
    if (tempFieldMappings && tempFieldMappings[field.id]) {
      return tempFieldMappings[field.id];
    }
    if (notionSettings?.fieldMapping && notionSettings.fieldMapping[field.id]) {
      return notionSettings.fieldMapping[field.id];
    }
    return '';
  };

  // Get the property type for a Notion field
  const getPropertyType = (notionField: string) => {
    if (!databaseProperties?.properties || !notionField) return '';
    const property = databaseProperties.properties.find((prop: any) => prop.name === notionField);
    return property ? property.type : '';
  };

  // Get the current source label
  const getCurrentSourceLabel = () => {
    if (sources.length <= 1) {
      return sources.length === 1 ? sources[0].label : 'No source';
    }

    let selectedValue: string | number | undefined;

    // 1. Check for an explicit user selection for this field
    if (fieldSelections && fieldSelections[field.id as keyof FieldSelections] !== undefined) {
      selectedValue = fieldSelections[field.id as keyof FieldSelections];
    }

    // 2. If no selection, check for a saved default preference
    if (selectedValue === undefined) {
      const fieldNameForDefault = (field.id === 'pageCount' ? 'pagecount' : field.id).toLowerCase();
      const savedDefault = CategoryService.getFieldDefault(fieldNameForDefault);
      if (savedDefault) {
        // Ensure the default source is actually available for this book
        if (sources.some(s => s.value === savedDefault)) {
          selectedValue = savedDefault;
        }
      }
    }
    
    // 3. If still no selection, default to 'original'
    if (selectedValue === undefined) {
      selectedValue = 'original';
    }

    // Find the source that matches the selected value
    const matchingSource = sources.find(source => source.value === selectedValue);
    
    if (matchingSource) {
      return matchingSource.label;
    }

    // Fallback logic
    const originalSource = sources.find(source => source.value === 'original');
    if (originalSource) {
      return originalSource.label;
    }
    
    return sources[0]?.label || 'No source';
  };

  // Check if field has data
  const hasData = value && value !== '' && value !== 'None' && value !== 'None selected' && value !== 'Empty (default)';
  
  // Get current mapping value
  const currentMapping = getCurrentMapping();
  const isMapped = currentMapping && currentMapping !== '' && currentMapping !== 'Don\'t map';

  // Determine row styling based on data availability and mapping status
  const getRowStyling = () => {
    if (!hasData && !isMapped) {
      return 'opacity-50 bg-gray-50';
    }
    if (hasData && !isMapped) {
      return 'bg-orange-50 border-l-4 border-orange-300';
    }
    if (hasData && isMapped) {
      return 'bg-green-50 border-l-4 border-green-300';
    }
    return 'bg-gray-50';
  };

  // Format display value
  const getDisplayValue = () => {
    if (!hasData) {
      return <span className="text-gray-400 italic">No data</span>;
    }
    
    // Handle special cases
    if (field.id === 'description' && value.length > 100) {
      // Clean HTML tags from description and truncate
      const cleanText = extractPlainText(value);
      return (
        <span className="text-sm" title={cleanText}>
          {cleanText.substring(0, 100)}...
        </span>
      );
    }
    
    // Format release dates to remove timestamp portion
    if (field.id === 'releaseDate') {
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        
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
      
      return <span className="text-sm">{formatDate(value)}</span>;
    }
    
    if (field.id === 'categories') {
      // Use the selectedCategories prop instead of parsing the value
      const categories = selectedCategories || [];
      
      if (categories.length === 0) {
        return (
          <span 
            className="text-gray-400 italic cursor-pointer hover:text-gray-600 transition-colors" 
            onClick={onOpenCategoriesModal}
            title="Click to select categories"
          >
            No categories selected
          </span>
        );
      }
      
      // Display up to 2 lines worth of categories
      const maxCategoriesPerLine = 3; // Adjust based on typical category length
      const maxCategories = maxCategoriesPerLine * 2;
      const displayCategories = categories.slice(0, maxCategories);
      const hasMore = categories.length > maxCategories;
      
      return (
        <div className="text-sm">
          <div 
            className="flex flex-wrap gap-1 cursor-pointer" 
            onClick={onOpenCategoriesModal}
            title="Click to manage categories"
          >
            {displayCategories.map((category, index) => (
              <span
                key={index}
                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full hover:bg-blue-200 transition-colors"
              >
                {category}
              </span>
            ))}
            {hasMore && (
              <span className="inline-block text-gray-500 text-xs px-2 py-1 hover:text-gray-700 transition-colors">
                +{categories.length - maxCategories} more...
              </span>
            )}
          </div>
        </div>
      );
    }
    
    if (field.id === 'thumbnail') {
      const isAudiobook = fieldSelections?.thumbnail === 'audiobook';
      if (value && value !== 'None') {
        return (
          <div className={`relative h-12 transition-all duration-300 ${isAudiobook ? 'w-12' : 'w-8'}`}>
            <img 
              src={value} 
              alt="Cover" 
              className={`w-full h-full rounded shadow-sm ${isAudiobook ? 'object-contain bg-gray-100' : 'object-cover'}`}
              onError={(e) => {
                // Show placeholder on error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-blue-600 rounded flex-col items-center justify-center shadow-sm" style={{ display: 'none' }}>
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14zM19 12h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2h-2a1 1 0 010-2h2v-2a1 1 0 012 0v2z" />
              </svg>
            </div>
          </div>
        );
      } else {
        return (
          <div className="flex items-center">
            <div className="w-8 h-12 bg-gradient-to-b from-blue-400 to-blue-600 rounded flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14zM19 12h2a1 1 0 010 2h-2v2a1 1 0 01-2 0v-2h-2a1 1 0 010-2h2v-2a1 1 0 012 0v2z" />
              </svg>
            </div>
          </div>
        );
      }
    }
    
    return <span className="text-sm">{value}</span>;
  };

  return (
    <div className={`book-data-row grid grid-cols-4 gap-4 p-3 rounded-lg transition-all ${getRowStyling()}`}>
      {/* Field Label */}
      <div className="flex items-center">
        <span className="font-medium text-gray-900">{field.label}</span>
        {!hasData && (
          <svg className="w-4 h-4 ml-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Field Value */}
      <div className="flex items-center">
        {getDisplayValue()}
      </div>

      {/* Source Selection */}
      <div className="flex items-center">
        {sources.length > 1 ? (
          <button
            onClick={() => onSelectSource(field.id)}
            className="source-button text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center gap-1"
          >
            {getCurrentSourceLabel()}
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            {getCurrentSourceLabel()}
          </span>
        )}
      </div>

      {/* Notion Mapping */}
      <div className="flex items-center">
        {loadingDatabaseProperties ? (
          <div className="flex items-center text-xs text-blue-600">
            <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </div>
        ) : onTempFieldMappingChange && databaseProperties?.properties ? (
          <select
            value={currentMapping}
            onChange={(e) => onTempFieldMappingChange(field.id, e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Don't map</option>
            {databaseProperties.properties
              ?.slice()
              ?.sort((a: any, b: any) => a.name.localeCompare(b.name))
              ?.map((prop: any) => (
                <option key={prop.id} value={prop.name}>
                  {prop.name} ({prop.type})
                </option>
              ))}
          </select>
        ) : isMapped ? (
          <div className="flex items-center text-xs">
            <svg className="w-3 h-3 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700">
              {currentMapping} ({getPropertyType(currentMapping)})
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-500 italic">Not mapped</span>
        )}
      </div>
    </div>
  );
};

export default BookDataRow; 