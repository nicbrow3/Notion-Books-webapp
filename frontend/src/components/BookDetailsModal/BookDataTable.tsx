import React from 'react';
import { BookSearchResult } from '../../types/book';
import BookDataRow from './BookDataRow';
import { MagnifyingGlassIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { ICON_CONTEXTS, ICON_WEIGHTS } from '../../constants/iconConfig';
import Tooltip from '../ui/Tooltip';

// Define the BookDataField interface
interface BookDataField {
  id: string;
  label: string;
  category: 'basic' | 'publishing' | 'audiobook';
}

interface BookDataTableProps {
  book: BookSearchResult;
  selectedCategories: string[];
  notionSettings?: any;
  tempFieldMappings?: any;
  databaseProperties?: any;
  loadingDatabaseProperties?: boolean;
  onSelectSource: (fieldId: string) => void;
  onTempFieldMappingChange?: (bookField: string, notionProperty: string) => void;
  fieldSelections?: any;
  editions?: any[];
  audiobookData?: any;
  openAudiobookSearch?: () => void;
  loadingAudiobook?: boolean;
  onOpenCategoriesModal?: () => void;
  getFieldSources: (fieldId: string) => any[];
}

// Configuration for all book data fields
const bookDataFields: BookDataField[] = [
  // Basic Information
  { id: 'title', label: 'Title', category: 'basic' },
  { id: 'authors', label: 'Authors', category: 'basic' },
  { id: 'description', label: 'Description', category: 'basic' },
  { id: 'categories', label: 'Categories', category: 'basic' },
  { id: 'rating', label: 'Rating', category: 'basic' },
  { id: 'thumbnail', label: 'Cover Image', category: 'basic' },
  
  // Publishing Information
  { id: 'publisher', label: 'Publisher', category: 'publishing' },
  { id: 'releaseDate', label: 'Release Date', category: 'publishing' },
  { id: 'pageCount', label: 'Page Count', category: 'publishing' },
  { id: 'isbn13', label: 'ISBN-13', category: 'publishing' },
  { id: 'isbn10', label: 'ISBN-10', category: 'publishing' },
  
  // Audiobook Information
  { id: 'audiobookPublisher', label: 'Audiobook Publisher', category: 'audiobook' },
  { id: 'audiobookNarrators', label: 'Narrators', category: 'audiobook' },
  { id: 'audiobookDuration', label: 'Duration', category: 'audiobook' },
  { id: 'audiobookChapters', label: 'Chapters', category: 'audiobook' },
  { id: 'audiobookRating', label: 'Audiobook Rating', category: 'audiobook' },
  { id: 'audiobookASIN', label: 'ASIN', category: 'audiobook' },
  { id: 'audiobookURL', label: 'Audiobook URL', category: 'audiobook' },
];

const BookDataTable: React.FC<BookDataTableProps> = ({
  book,
  selectedCategories,
  notionSettings,
  tempFieldMappings,
  databaseProperties,
  loadingDatabaseProperties,
  onSelectSource,
  onTempFieldMappingChange,
  fieldSelections,
  editions,
  audiobookData,
  openAudiobookSearch,
  loadingAudiobook,
  onOpenCategoriesModal,
  getFieldSources,
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

  // Helper function to get the value for a field
  const getFieldValue = (fieldId: string) => {
    // If we have field selections, use those first
    if (fieldSelections && fieldSelections[fieldId] !== undefined) {
      // Handle special field selection cases
      if (fieldId === 'thumbnail') {
        const selection = fieldSelections[fieldId];
        if (selection === 'original') {
          return book.thumbnail || '';
        }
        if (selection === 'audiobook' && book.audiobookData?.image) {
          return book.audiobookData.image;
        }
        if (typeof selection === 'number' && editions && editions[selection]?.thumbnail) {
          return editions[selection].thumbnail;
        }
        // Fallback to original if selection doesn't match
        return book.thumbnail || '';
      }
      
      if (fieldId === 'description') {
        const selection = fieldSelections[fieldId];
        if (selection === 'original') {
          return book.description || '';
        }
        if (selection === 'audiobook' && book.audiobookData?.description) {
          return book.audiobookData.description;
        }
        if (selection === 'audiobook_summary' && book.audiobookData?.summary) {
          return book.audiobookData.summary;
        }
        if (typeof selection === 'number' && editions && editions[selection]?.description) {
          return editions[selection].description;
        }
        // Fallback to original if selection doesn't match
        return book.description || '';
      }
      
      if (fieldId === 'publisher') {
        const selection = fieldSelections[fieldId];
        if (selection === 'original') {
          return book.publisher || '';
        }
        if (selection === 'audiobook' && book.audiobookData?.publisher) {
          return book.audiobookData.publisher;
        }
        if (typeof selection === 'number' && editions && editions[selection]?.publisher) {
          return editions[selection].publisher;
        }
        // Fallback to original if selection doesn't match
        return book.publisher || '';
      }
      
      if (fieldId === 'releaseDate') {
        const selection = fieldSelections[fieldId];
        if (selection === 'original') {
          return book.publishedDate || '';
        }
        if (selection === 'first_published') {
          return book.originalPublishedDate || '';
        }
        if (selection === 'audiobook' && book.audiobookData?.publishedDate) {
          return book.audiobookData.publishedDate;
        }
        if (selection === 'copyright') {
          return book.copyright || '';
        }
        if (selection === 'audiobook_copyright' && book.audiobookData?.copyright) {
          return book.audiobookData.copyright;
        }
        if (typeof selection === 'number' && editions && editions[selection]?.publishedDate) {
          return editions[selection].publishedDate;
        }
        // Fallback to published date if selection doesn't match
        return book.publishedDate || '';
      }
      
      if (fieldId === 'pageCount') {
        const selection = fieldSelections[fieldId];
        if (selection === 'original') {
          return book.pageCount?.toString() || '';
        }
        if (typeof selection === 'number' && editions && editions[selection]?.pageCount) {
          return editions[selection].pageCount.toString();
        }
        // Fallback to original if selection doesn't match
        return book.pageCount?.toString() || '';
      }
      
      // For other fields that might have selections, fall back to the default logic
    }

    // Otherwise get from book data
    switch (fieldId) {
      case 'title': return book.title || '';
      case 'authors': return book.authors?.join(', ') || '';
      case 'description': return book.description || '';
      case 'categories': return selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'None selected';
      case 'rating': return book.averageRating ? `${book.averageRating}/5` : '';
      case 'thumbnail': return book.thumbnail || '';
      case 'publisher': return book.publisher || '';
      case 'releaseDate': return formatDate(book.publishedDate) || formatDate(book.originalPublishedDate) || '';
      case 'pageCount': return book.pageCount?.toString() || '';
      case 'isbn13': return book.isbn13 || '';
      case 'isbn10': return book.isbn10 || '';
      case 'audiobookPublisher': return book.audiobookData?.publisher || '';
      case 'audiobookNarrators': 
        if (book.audiobookData?.narrators) {
          if (Array.isArray(book.audiobookData.narrators)) {
            return book.audiobookData.narrators.join(', ');
          }
          return String(book.audiobookData.narrators);
        }
        return '';
      case 'audiobookDuration': 
        if (book.audiobookData?.totalDurationHours) {
          return book.audiobookData.totalDurationHours < 1 
            ? `${Math.round(book.audiobookData.totalDurationHours * 60)} min`
            : `${book.audiobookData.totalDurationHours.toFixed(1)} hrs`;
        }
        return book.audiobookData?.duration || '';
      case 'audiobookChapters': return book.audiobookData?.chapters?.toString() || book.audiobookData?.chapterCount?.toString() || '';
      case 'audiobookRating': 
        if (book.audiobookData?.rating) {
          return book.audiobookData.ratingCount 
            ? `${book.audiobookData.rating}/5 (${book.audiobookData.ratingCount} reviews)`
            : `${book.audiobookData.rating}/5`;
        }
        return '';
      case 'audiobookASIN': return book.audiobookData?.asin || '';
      case 'audiobookURL': return book.audiobookData?.audibleUrl || '';
      default: return '';
    }
  };

  // Helper function to check if field has data
  const hasFieldData = (fieldId: string) => {
    const value = getFieldValue(fieldId);
    return value && value !== '' && value !== 'None' && value !== 'None selected' && value !== 'Empty (default)';
  };

  // Helper function to determine if a field is visible
  const isFieldVisible = (fieldId: string) => {
    const hasData = hasFieldData(fieldId);
    const isMapped = tempFieldMappings?.[fieldId] || notionSettings?.fieldMapping?.[fieldId];
    return hasData || isMapped;
  };

  const renderRow = (field: BookDataField) => {
    if (!isFieldVisible(field.id)) return null;

    const value = getFieldValue(field.id);
    const sources = getFieldSources(field.id);

    // Special handling for the audiobook section header
    if (field.id === 'audiobookPublisher' && sources.length <= 1 && (value === '' || value === 'N/A')) {
      // If there's no audiobook data, don't render the first field (which acts as a header trigger)
      return null;
    }
    
    return (
      <BookDataRow
        key={field.id}
        field={field}
        book={book}
        value={value}
        sources={sources}
        notionSettings={notionSettings}
        tempFieldMappings={tempFieldMappings}
        databaseProperties={databaseProperties}
        loadingDatabaseProperties={loadingDatabaseProperties}
        onSelectSource={onSelectSource}
        onTempFieldMappingChange={onTempFieldMappingChange}
        fieldSelections={fieldSelections}
        selectedCategories={selectedCategories}
        onOpenCategoriesModal={onOpenCategoriesModal}
      />
    );
  };

  const renderSection = (title: string, category: string) => {
    const fieldsInCategory = bookDataFields.filter(field => field.category === category);
    
    // Check if the section should be rendered at all
    // For audiobooks, only render if there is some data or an option to search
    if (category === 'audiobook') {
      const hasAnyAudiobookData = fieldsInCategory.some(field => hasFieldData(field.id));
      if (!hasAnyAudiobookData && !openAudiobookSearch) {
        return null;
      }
    }
    
    const visibleFields = fieldsInCategory.filter(field => isFieldVisible(field.id));
    if (visibleFields.length === 0) {
      // Special case for audiobook section to show the 'Find Audiobook' button
      if (category === 'audiobook' && openAudiobookSearch) {
        // Render a placeholder or the button directly if no fields are visible but search is possible
      } else {
        return null;
      }
    }

    // Special introductory row for audiobook section if no data is loaded yet
    if (category === 'audiobook' && !audiobookData && openAudiobookSearch) {
      return (
        <div className="pt-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
          <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
            <p className="text-sm text-gray-700">
              No audiobook data loaded. You can search for an audiobook to link it.
            </p>
            <button
              onClick={openAudiobookSearch}
              disabled={loadingAudiobook}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {loadingAudiobook ? 'Loading...' : 'Find Audiobook'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          {title}
          {category === 'audiobook' && openAudiobookSearch && (
            <Tooltip content={audiobookData ? 'Re-select audiobook' : 'Search for audiobook'}>
              <button
                onClick={openAudiobookSearch}
                disabled={loadingAudiobook}
                aria-label={audiobookData ? 'Re-select audiobook' : 'Search for audiobook'}
                className="group p-2 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:bg-purple-50 disabled:text-purple-300 transition-colors"
              >
                {loadingAudiobook ? (
                  <SpinnerGapIcon
                    size={ICON_CONTEXTS.UI.BUTTON}
                    weight={ICON_WEIGHTS.REGULAR}
                    className="animate-spin"
                  />
                ) : (
                  <MagnifyingGlassIcon
                    size={ICON_CONTEXTS.UI.BUTTON}
                    weight={ICON_WEIGHTS.FILL}
                    className="group-hover:animate-wiggle"
                  />
                )}
              </button>
            </Tooltip>
          )}
        </h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {visibleFields.map((field, index) => (
            <div 
              key={field.id} 
              className={`
                ${index !== 0 ? 'border-t border-gray-200' : ''}
              `}
            >
              {renderRow(field)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="sticky top-0 z-20 grid grid-cols-4 gap-4 p-3 mb-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
        <div>Field</div>
        <div>Value</div>
        <div>Source</div>
        <div>Notion Property</div>
      </div>
      {renderSection('Basic Information', 'basic')}
      {renderSection('Publishing Information', 'publishing')}
      {renderSection('Audiobook Information', 'audiobook')}
    </div>
  );
};

export default BookDataTable; 