import React from 'react';
import { BookSearchResult } from '../../types/book';
import { 
  CaretRightIcon, 
  CheckIcon, 
  ArrowClockwiseIcon, 
  SpinnerGapIcon,
  WarningIcon,
  BookIcon,
  ImageIcon
} from '@phosphor-icons/react';
import { ICON_CONTEXTS, ICON_WEIGHTS } from '../../constants/iconConfig';

interface NotionFieldMappingsProps {
  book: BookSearchResult;
  selectedCategories: string[];
  isCollapsed: boolean;
  notionSettings: any;
  tempFieldMappings?: any;
  databaseProperties?: any;
  loadingDatabaseProperties?: boolean;
  formatAuthors: (authors: string[]) => string;
  onSetCollapsed: (collapsed: boolean) => void;
  onTempFieldMappingChange?: (bookField: string, notionProperty: string) => void;
  onResetTempFieldMappings?: () => void;
  onSaveTempFieldMappings?: () => void;
  onHasUnsavedChanges?: () => boolean;
  showDataValues?: boolean;
  hideUnsavedChangesIndicator?: boolean;
}

const NotionFieldMappings: React.FC<NotionFieldMappingsProps> = ({
  book,
  selectedCategories,
  isCollapsed,
  notionSettings,
  tempFieldMappings,
  databaseProperties,
  loadingDatabaseProperties,
  formatAuthors,
  onSetCollapsed,
  onTempFieldMappingChange,
  onResetTempFieldMappings,
  onSaveTempFieldMappings,
  onHasUnsavedChanges,
  showDataValues = true,
  hideUnsavedChangesIndicator = false
}) => {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return ''; // Return empty string for falsy dates
    
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

  return (
    <div className="border-t border-gray-200 pt-6 mb-6">
      <div 
        className="flex items-center justify-between p-3 mb-4 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
        onClick={() => onSetCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand field mappings' : 'Collapse field mappings'}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">Notion Field Mappings</h4>
          <CaretRightIcon 
            size={ICON_CONTEXTS.UI.TABLE} 
            weight={ICON_WEIGHTS.FILL} 
            className={`transition-transform duration-200 text-gray-600 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} 
          />
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {tempFieldMappings && !hideUnsavedChangesIndicator && (
            <>
              {(() => {
                // Check if temp mappings differ from original settings
                const hasChanges = onHasUnsavedChanges ? onHasUnsavedChanges() : false;
                if (hasChanges) {
                  return (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      Unsaved Changes
                    </span>
                  );
                }
                return null;
              })()}
            </>
          )}
          {tempFieldMappings && !hideUnsavedChangesIndicator && onSaveTempFieldMappings && onHasUnsavedChanges && onHasUnsavedChanges() && (
            <button
              onClick={onSaveTempFieldMappings}
              className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors"
              title="Save field mapping changes"
            >
              <CheckIcon 
                size={ICON_CONTEXTS.UI.TABLE} 
                weight={ICON_WEIGHTS.BOLD} 
              />
            </button>
          )}
          {tempFieldMappings && !hideUnsavedChangesIndicator && onResetTempFieldMappings && (
            <button
              onClick={onResetTempFieldMappings}
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-1 rounded transition-colors"
              title="Reset field mappings to saved settings"
            >
              <ArrowClockwiseIcon 
                size={ICON_CONTEXTS.UI.TABLE} 
                weight={ICON_WEIGHTS.BOLD} 
              />
            </button>
          )}
        </div>
      </div>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed 
          ? 'max-h-0 opacity-0' 
          : 'max-h-[2000px] opacity-100'
      }`}>
        <div className={`transform transition-all duration-300 ease-in-out ${
          isCollapsed 
            ? 'translate-y-[-10px] scale-98' 
            : 'translate-y-0 scale-100'
        }`}>
          {/* Loading state for database properties */}
          {loadingDatabaseProperties && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <div className="flex items-center">
                <SpinnerGapIcon 
                  size={ICON_CONTEXTS.UI.TABLE} 
                  weight={ICON_WEIGHTS.BOLD} 
                  className="animate-spin text-blue-600 mr-2" 
                />
                <span className="text-blue-800">Loading field mapping options...</span>
              </div>
            </div>
          )}

          {/* Field Mappings Display */}
          <div className="space-y-2">
            {/* Headers */}
            <div className="flex items-center justify-between py-2 px-3 bg-gray-100 rounded-t text-sm font-medium text-gray-700 border-b border-gray-200">
              <div className="flex-1">
                <span>Book Data (from API)</span>
              </div>
              <div className="flex items-center text-xs">
                <span>Notion Fields (type)</span>
              </div>
            </div>
            
            {(() => {
              const mappingElements: JSX.Element[] = [];
              const unmappedElements: JSX.Element[] = [];
              
              // Helper function to get book value for a field
              const getBookValue = (bookField: string) => {
                switch (bookField) {
                  case 'title': return book.title || '';
                  case 'authors': return formatAuthors(book.authors);
                  case 'description': return book.description ? (book.description.length > 100 ? book.description.substring(0, 100) + '...' : book.description) : '';
                  case 'isbn': return book.isbn13 || book.isbn10 || '';
                  case 'publisher': return book.publisher || '';
                  case 'pageCount': return book.pageCount ? book.pageCount.toString() : '';
                  case 'categories': return selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'None selected';
                  case 'rating': return book.averageRating ? book.averageRating.toString() : '';
                  case 'thumbnail': return book.thumbnail ? 'Available' : 'None';
                  case 'status': return 'To Read (default)';
                  case 'notes': return 'Empty (default)';
                  // Date field - consolidated releaseDate
                  case 'releaseDate': 
                    return book.publishedDate ? formatDate(book.publishedDate) : '';
                  // Audiobook-specific fields
                  case 'audiobookPublisher': return book.audiobookData?.publisher || '';
                  case 'audiobookChapters': return book.audiobookData?.chapters?.toString() || book.audiobookData?.chapterCount?.toString() || '';
                  case 'audiobookASIN': return book.audiobookData?.asin || '';
                  case 'audiobookNarrators': 
                    if (book.audiobookData?.narrators) {
                      if (Array.isArray(book.audiobookData.narrators)) {
                        return book.audiobookData.narrators.join(', ');
                      } else {
                        return String(book.audiobookData.narrators);
                      }
                    }
                    return '';
                  case 'audiobookDuration': 
                    if (book.audiobookData?.totalDurationHours) {
                      return book.audiobookData.totalDurationHours < 1 
                        ? `${Math.round(book.audiobookData.totalDurationHours * 60)} min`
                        : `${book.audiobookData.totalDurationHours.toFixed(1)} hrs`;
                    }
                    return book.audiobookData?.duration || '';
                  case 'audiobookURL': return book.audiobookData?.audibleUrl || '';
                  case 'audiobookRating': 
                    if (book.audiobookData?.rating) {
                      return book.audiobookData.ratingCount 
                        ? `${book.audiobookData.rating}/5 (${book.audiobookData.ratingCount} reviews)`
                        : `${book.audiobookData.rating}/5`;
                    }
                    return '';
                  default: return '';
                }
              };

              // Helper function to format field label
              const formatFieldLabel = (fieldName: string) => {
                // Special cases for date fields
                if (fieldName === 'releaseDate') {
                  return 'Release Date';
                }
                return fieldName.replace(/([A-Z])/g, ' $1').trim();
              };

              // Helper function to get display value for a field
              const getDisplayValue = (bookField: string) => {
                if (!showDataValues) {
                  // Return field descriptions when not showing actual data
                  switch (bookField) {
                    case 'title': return 'Book title';
                    case 'authors': return 'Book authors';
                    case 'description': return 'Book summary/description';
                    case 'isbn': return 'ISBN-13 identifier';
                    case 'publisher': return 'Book publisher';
                    case 'pageCount': return 'Number of pages';
                    case 'categories': return 'Book genres/categories';
                    case 'rating': return 'User rating (1-5 stars)';
                    case 'thumbnail': return 'Book cover image URL';
                    case 'status': return 'Reading progress status';
                    case 'notes': return 'Personal notes about the book';
                    case 'releaseDate': return 'Book publication/release date';
                    case 'audiobookPublisher': return 'Publisher of the audiobook version';
                    case 'audiobookChapters': return 'Number of chapters in audiobook';
                    case 'audiobookASIN': return 'Amazon ASIN for audiobook';
                    case 'audiobookNarrators': return 'Narrators of the audiobook';
                    case 'audiobookDuration': return 'Total duration of audiobook';
                    case 'audiobookURL': return 'Link to the audiobook (e.g., Audible)';
                    case 'audiobookRating': return 'Rating of the audiobook';
                    default: return 'Field data';
                  }
                }
                
                // Special handling for thumbnail field to show image preview
                if (bookField === 'thumbnail') {
                  const thumbnailUrl = getBookValue(bookField);
                  if (thumbnailUrl && thumbnailUrl !== 'None') {
                    return (
                      <div className="flex items-center gap-2">
                        <img 
                          src={book.thumbnail || ''} 
                          alt="Cover" 
                          className="w-6 h-8 object-cover rounded shadow-sm"
                          onError={(e) => {
                            // Show placeholder on error
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const placeholder = target.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        <div className="w-6 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded flex items-center justify-center shadow-sm" style={{ display: 'none' }}>
                          <BookIcon 
                            size={12} 
                            weight={ICON_WEIGHTS.FILL} 
                            className="text-white" 
                          />
                        </div>
                        <span className="text-xs text-gray-600">Cover image</span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded flex items-center justify-center shadow-sm">
                          <BookIcon 
                            size={12} 
                            weight={ICON_WEIGHTS.FILL} 
                            className="text-white" 
                          />
                        </div>
                        <span className="text-xs text-gray-400">No cover</span>
                      </div>
                    );
                  }
                }
                
                // Return actual book data when showDataValues is true
                const bookValue = getBookValue(bookField);
                return bookValue || <span className="text-red-600 font-medium">No data available</span>;
              };

              // Helper function to get the property type for a Notion field
              const getPropertyType = (notionField: string) => {
                if (!databaseProperties?.properties || !notionField) return '';
                const property = databaseProperties.properties.find((prop: any) => prop.name === notionField);
                return property ? property.type : '';
              };

              // Process mapped fields
              const currentFieldMappings = tempFieldMappings || notionSettings.fieldMapping;
              
              // Get all possible book fields that could have data
              const allPossibleBookFields = [
                'title', 'authors', 'description', 'isbn', 'publisher', 'pageCount', 
                'categories', 'rating', 'thumbnail', 'status', 'notes',
                'releaseDate',
                'audiobookPublisher', 'audiobookChapters', 'audiobookASIN', 
                'audiobookNarrators', 'audiobookDuration', 'audiobookURL', 'audiobookRating'
              ];

              // Process all fields and categorize them
              allPossibleBookFields.forEach(bookField => {
                // Skip pageIcon as it's handled separately
                if (bookField === 'pageIcon') return;
                
                const bookValue = getBookValue(bookField);
                const notionField = currentFieldMappings[bookField];
                
                // Process fields that either have data OR are configured in field mappings
                // This ensures that fields set to "Don't map" or empty still show up in unmapped section
                const shouldProcess = (bookValue && bookValue !== 'Not available' && bookValue !== 'Not selected') || 
                                     (bookField in currentFieldMappings);
                
                if (shouldProcess) {
                  const canEdit = !!onTempFieldMappingChange && !!databaseProperties?.properties;
                  
                  // Check if the mapped property actually exists in the database
                  const propertyExists = !notionField || !databaseProperties?.properties || 
                                        databaseProperties.properties.some((prop: any) => prop.name === notionField);
                  
                  // Check if field is truly mapped (has a non-empty Notion property name that exists)
                  const isTrulyMapped = notionField && 
                                       typeof notionField === 'string' && 
                                       notionField.trim() !== '' && 
                                       notionField !== 'Don\'t map' &&
                                       notionField !== 'undefined' &&
                                       notionField !== 'null' &&
                                       propertyExists;
                   
                   // Alternative check - if the field is explicitly set to empty or falsy, it's unmapped
                   const isExplicitlyUnmapped = (bookField in currentFieldMappings) && 
                                               (!notionField || 
                                                notionField === '' || 
                                                notionField === 'Don\'t map' ||
                                                notionField === 'undefined' ||
                                                notionField === 'null' ||
                                                !propertyExists);
                   
                   // Use the more explicit check: if it's not truly mapped OR is explicitly unmapped, put it in unmapped section
                   if (isTrulyMapped && !isExplicitlyUnmapped) {
                     // This is a mapped field
                     mappingElements.push(
                       <div key={bookField} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
                         <div className="flex-1">
                           <span className="font-medium text-gray-700 capitalize">
                             {formatFieldLabel(bookField)}:
                           </span>
                           <span className="ml-2 text-gray-600">{getDisplayValue(bookField)}</span>
                         </div>
                         <div className="flex items-center text-xs text-gray-500">
                           {canEdit ? (
                             <select
                               value={notionField}
                               onChange={(e) => onTempFieldMappingChange!(bookField, e.target.value)}
                               className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                           ) : (
                             <>
                               <CaretRightIcon 
                                 size={12} 
                                 weight={ICON_WEIGHTS.FILL} 
                                 className="mr-1" 
                               />
                               <span className="font-medium">{notionField} ({getPropertyType(notionField)})</span>
                             </>
                           )}
                         </div>
                       </div>
                     );
                   } else {
                     // This is an unmapped field (no mapping or empty mapping)
                     unmappedElements.push(
                       <div key={bookField} className="flex items-center justify-between py-3 px-4 bg-white border border-orange-200 rounded-lg text-sm shadow-sm">
                         <div className="flex-1">
                           <span className="font-medium text-orange-800 capitalize">
                             {formatFieldLabel(bookField)}:
                           </span>
                           <span className="ml-2 text-orange-700">{getDisplayValue(bookField)}</span>
                         </div>
                         <div className="flex items-center text-xs text-orange-600">
                           {canEdit ? (
                             <select
                               value={notionField || ""}
                               onChange={(e) => onTempFieldMappingChange!(bookField, e.target.value)}
                               className="text-xs border border-orange-300 rounded px-2 py-1 text-orange-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                           ) : (
                             <>
                               <WarningIcon 
                                 size={12} 
                                 weight={ICON_WEIGHTS.FILL} 
                                 className="mr-1" 
                               />
                               <span className="font-medium">Not mapped</span>
                             </>
                           )}
                         </div>
                       </div>
                     );
                   }
                }
              });
              
              // Render mapped fields first
              const mappedSection = mappingElements.length > 0 ? (
                <div className="space-y-2">
                  {mappingElements}
                </div>
              ) : null;

              // Render unmapped fields section if there are any
              const unmappedSection = unmappedElements.length > 0 ? (
                <div className="mt-6">
                  <div className="flex items-center mb-3">
                    <div className="flex-1 border-t border-orange-300"></div>
                    <div className="px-3">
                      <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                        Unmapped Fields ({unmappedElements.length})
                      </span>
                    </div>
                    <div className="flex-1 border-t border-orange-300"></div>
                  </div>
                  <div className="space-y-2 bg-orange-50 p-4 rounded-lg border border-orange-200 shadow-sm">
                    {/* Headers for unmapped section */}
                    <div className="flex items-center justify-between py-2 px-3 bg-orange-100 rounded-t text-sm font-medium text-orange-800 border-b border-orange-300">
                      <div className="flex-1">
                        <span>Book Data (from API)</span>
                      </div>
                      <div className="flex items-center text-xs">
                        <span>Notion Fields (type)</span>
                      </div>
                    </div>
                    {unmappedElements}
                  </div>
                </div>
              ) : null;

              return (
                <>
                  {mappedSection}
                  {unmappedSection}
                </>
              );
            })()}
          </div>

          {/* Unmapped fields notice */}
          {(() => {
            const currentFieldMappings = tempFieldMappings || notionSettings.fieldMapping;
            const allPossibleFields = [
              'releaseDate',
              'audiobookPublisher',
              'audiobookChapters',
              'audiobookASIN',
              'audiobookNarrators',
              'audiobookDuration',
              'audiobookURL',
              'audiobookRating'
            ];

            const getBookValue = (bookField: string) => {
              switch (bookField) {
                case 'releaseDate': return book.publishedDate;
                case 'audiobookPublisher': return book.audiobookData?.publisher;
                case 'audiobookChapters': return book.audiobookData?.chapters || book.audiobookData?.chapterCount;
                case 'audiobookASIN': return book.audiobookData?.asin;
                case 'audiobookNarrators': return book.audiobookData?.narrators;
                case 'audiobookDuration': return book.audiobookData?.totalDurationHours || book.audiobookData?.duration;
                case 'audiobookURL': return book.audiobookData?.audibleUrl;
                case 'audiobookRating': return book.audiobookData?.rating;
                default: return false;
              }
            };

            const unmappedWithData = allPossibleFields.filter(field => 
              !currentFieldMappings[field] && getBookValue(field)
            );

            if (unmappedWithData.length > 0) {
              const dateFields = unmappedWithData.filter(f => f === 'releaseDate');
              const audiobookFields = unmappedWithData.filter(f => f.startsWith('audiobook'));

              return (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
                  <div className="flex items-start">
                    <WarningIcon 
                      size={ICON_CONTEXTS.UI.TABLE} 
                      weight={ICON_WEIGHTS.FILL} 
                      className="mr-2 text-orange-600 mt-0.5 flex-shrink-0" 
                    />
                    <div>
                      <span className="text-orange-800 font-medium">
                        Additional data available for mapping
                      </span>
                      {dateFields.length > 0 && (
                        <span className="text-orange-700 text-xs block mt-1">
                          • {dateFields.length} date field{dateFields.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {audiobookFields.length > 0 && (
                        <span className="text-orange-700 text-xs block mt-1">
                          • {audiobookFields.length} audiobook field{audiobookFields.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <p className="text-orange-700 text-xs mt-1">
                        {onTempFieldMappingChange 
                          ? 'Use the dropdowns in the section above to map these fields, or configure them in Settings'
                          : 'Configure mappings in Settings to include this data in Notion'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {notionSettings.fieldMapping.pageIcon && book.thumbnail && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <div className="flex items-center">
                <ImageIcon 
                  size={ICON_CONTEXTS.UI.TABLE} 
                  weight={ICON_WEIGHTS.FILL} 
                  className="mr-2 text-green-600" 
                />
                <span className="text-green-800 font-medium">Book cover will be used as page icon</span>
              </div>
            </div>
          )}

          {Object.keys(notionSettings.fieldMapping).filter(key => notionSettings.fieldMapping[key] && key !== 'pageIcon').length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              <p>No field mappings configured</p>
              <p className="text-xs mt-1">Configure mappings in Settings to see what data will be sent to Notion</p>
            </div>
          )}

          {/* Save Changes Notice */}
          {tempFieldMappings && !hideUnsavedChangesIndicator && onSaveTempFieldMappings && onHasUnsavedChanges && onHasUnsavedChanges() && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
              <div className="flex items-start">
                <WarningIcon 
                  size={ICON_CONTEXTS.UI.TABLE} 
                  weight={ICON_WEIGHTS.FILL} 
                  className="mr-2 text-orange-600 mt-0.5 flex-shrink-0" 
                />
                <div>
                  <span className="text-orange-800 font-medium">You have unsaved field mapping changes</span>
                  <p className="text-orange-700 text-xs mt-1">
                    Click "Save Changes" to make these field mappings permanent for future books, or "Reset" to discard changes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotionFieldMappings; 