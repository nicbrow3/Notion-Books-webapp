import React from 'react';
import { BookSearchResult } from '../../types/book';
import BookDataRow from './BookDataRow';

// Define the BookDataField interface
interface BookDataField {
  id: string;
  label: string;
  category: 'basic' | 'publishing' | 'audiobook' | 'metadata';
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
  { id: 'publishedDate', label: 'Published Date', category: 'publishing' },
  { id: 'originalPublishedDate', label: 'Original Published Date', category: 'publishing' },
  { id: 'pageCount', label: 'Page Count', category: 'publishing' },
  { id: 'isbn13', label: 'ISBN-13', category: 'publishing' },
  { id: 'isbn10', label: 'ISBN-10', category: 'publishing' },
  
  // Audiobook Information
  { id: 'audiobookPublisher', label: 'Audiobook Publisher', category: 'audiobook' },
  { id: 'audiobookPublishedDate', label: 'Audiobook Published Date', category: 'audiobook' },
  { id: 'audiobookNarrators', label: 'Narrators', category: 'audiobook' },
  { id: 'audiobookDuration', label: 'Duration', category: 'audiobook' },
  { id: 'audiobookChapters', label: 'Chapters', category: 'audiobook' },
  { id: 'audiobookRating', label: 'Audiobook Rating', category: 'audiobook' },
  { id: 'audiobookASIN', label: 'ASIN', category: 'audiobook' },
  { id: 'audiobookURL', label: 'Audiobook URL', category: 'audiobook' },
  
  // Metadata
  { id: 'status', label: 'Reading Status', category: 'metadata' },
  { id: 'notes', label: 'Notes', category: 'metadata' }
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
      
      if (fieldId === 'publishedDate') {
        const selection = fieldSelections[fieldId];
        if (selection === 'original') {
          return book.publishedDate || '';
        }
        if (selection === 'audiobook' && book.audiobookData?.publishedDate) {
          return book.audiobookData.publishedDate;
        }
        if (typeof selection === 'number' && editions && editions[selection]?.publishedDate) {
          return editions[selection].publishedDate;
        }
        // Fallback to original if selection doesn't match
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
      case 'publishedDate': return formatDate(book.publishedDate);
      case 'originalPublishedDate': return formatDate(book.originalPublishedDate);
      case 'pageCount': return book.pageCount?.toString() || '';
      case 'isbn13': return book.isbn13 || '';
      case 'isbn10': return book.isbn10 || '';
      case 'audiobookPublisher': return book.audiobookData?.publisher || '';
      case 'audiobookPublishedDate': return formatDate(book.audiobookData?.publishedDate);
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
      case 'status': return 'To Read (default)';
      case 'notes': return 'Empty (default)';
      default: return '';
    }
  };

  // Helper function to check if field has data
  const hasFieldData = (fieldId: string) => {
    const value = getFieldValue(fieldId);
    return value && value !== '' && value !== 'None' && value !== 'None selected' && value !== 'Empty (default)';
  };

  // Helper function to get available sources for a field
  const getFieldSources = (fieldId: string) => {
    const sources = [];
    
    // Always add main book source if it has data
    const getMainValue = (fieldId: string) => {
      switch (fieldId) {
        case 'title': return book.title || '';
        case 'authors': return book.authors?.join(', ') || '';
        case 'description': return book.description || '';
        case 'categories': return selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'None selected';
        case 'rating': return book.averageRating ? `${book.averageRating}/5` : '';
        case 'thumbnail': return book.thumbnail || '';
        case 'publisher': return book.publisher || '';
        case 'publishedDate': return formatDate(book.publishedDate);
        case 'originalPublishedDate': return formatDate(book.originalPublishedDate);
        case 'pageCount': return book.pageCount?.toString() || '';
        case 'isbn13': return book.isbn13 || '';
        case 'isbn10': return book.isbn10 || '';
        case 'audiobookPublisher': return book.audiobookData?.publisher || '';
        case 'audiobookPublishedDate': return formatDate(book.audiobookData?.publishedDate);
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
        case 'status': return 'To Read (default)';
        case 'notes': return 'Empty (default)';
        default: return '';
      }
    };

    const mainValue = getMainValue(fieldId);
    if (mainValue) {
      sources.push({
        value: 'original', // Use 'original' to match BookInfoPanel
        label: 'Original Book',
        content: mainValue
      });
    }

    // Add edition sources if available
    if (editions && editions.length > 0) {
      editions.forEach((edition, index) => {
        let editionValue = '';
        switch (fieldId) {
          case 'title': editionValue = edition.title; break;
          case 'publisher': editionValue = edition.publisher; break;
          case 'publishedDate': editionValue = edition.publishedDate; break;
          case 'pageCount': editionValue = edition.pageCount?.toString(); break;
          case 'description': editionValue = edition.description; break;
          case 'thumbnail': editionValue = edition.thumbnail; break;
          // Add more edition fields as needed
        }
        
        if (editionValue && editionValue !== mainValue) {
          sources.push({
            value: index, // Use index number to match BookInfoPanel
            label: `Edition ${index + 1}`,
            content: editionValue
          });
        }
      });
    }

    // Add audiobook sources if available
    if (book.audiobookData) {
      if (fieldId === 'thumbnail' && book.audiobookData.image && book.audiobookData.image !== mainValue) {
        sources.push({
          value: 'audiobook',
          label: 'Audiobook Cover',
          content: book.audiobookData.image
        });
      }
      if (fieldId === 'description' && book.audiobookData.description && book.audiobookData.description !== mainValue) {
        sources.push({
          value: 'audiobook',
          label: 'Audiobook Description',
          content: book.audiobookData.description
        });
      }
      // Add audiobook summary as separate source for description
      if (fieldId === 'description' && book.audiobookData.summary && book.audiobookData.summary !== mainValue && book.audiobookData.summary !== book.audiobookData.description) {
        sources.push({
          value: 'audiobook_summary',
          label: 'Audiobook Summary',
          content: book.audiobookData.summary
        });
      }
    }

    return sources;
  };

  // Filter fields to only show those with data or that are mapped
  const visibleFields = bookDataFields.filter(field => {
    const hasData = hasFieldData(field.id);
    const isMapped = tempFieldMappings?.[field.id] || notionSettings?.fieldMapping?.[field.id];
    return hasData || isMapped;
  });

  // Group fields by category
  const groupedFields = visibleFields.reduce((groups, field) => {
    const category = field.category || 'basic';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(field);
    return groups;
  }, {} as Record<string, BookDataField[]>);

  const categoryLabels = {
    basic: 'Basic Information',
    publishing: 'Publishing Details',
    audiobook: 'Audiobook Information',
    metadata: 'Metadata'
  };

  const renderRow = (field: BookDataField) => {
    if (!hasFieldData(field.id)) return null;
    return (
      <BookDataRow
        key={field.id}
        field={field}
        book={book}
        value={getFieldValue(field.id)}
        sources={getFieldSources(field.id)}
        notionSettings={notionSettings}
        tempFieldMappings={tempFieldMappings}
        databaseProperties={databaseProperties}
        loadingDatabaseProperties={loadingDatabaseProperties}
        onSelectSource={onSelectSource}
        onTempFieldMappingChange={onTempFieldMappingChange}
        fieldSelections={fieldSelections}
      />
    );
  };

  const renderSection = (title: string, category: string) => {
    const fieldsInCategory = bookDataFields.filter(field => field.category === category);
    const renderedRows = fieldsInCategory.map(renderRow).filter(Boolean);

    if (renderedRows.length === 0) {
      if (category !== 'audiobook') {
        return null;
      }
    }
    
    // Always render audiobook section header if there's audiobook data, even if no fields have values yet
    if (category === 'audiobook' && !book.audiobookData?.hasAudiobook) {
      return null;
    }
    
    return (
      <div key={category} className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
          {category === 'audiobook' && openAudiobookSearch && (
            <button
              onClick={openAudiobookSearch}
              className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 hover:text-gray-700 transition-colors"
              disabled={loadingAudiobook}
              title={loadingAudiobook ? 'Searching...' : 'Find Audiobook'}
            >
              {loadingAudiobook ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
                </svg>
              )}
            </button>
          )}
        </div>
        <div className="space-y-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {renderedRows.length > 0 ? (
             renderedRows
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No book data available</p>
              <p className="text-sm mt-1">Try adding field mappings in Settings to see more data</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 p-3 bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
        <div>Field</div>
        <div>Value</div>
        <div>Source</div>
        <div>Notion Property</div>
      </div>

      {/* Grouped Field Rows */}
      {Object.entries(groupedFields).map(([category, fields]) => (
        renderSection(categoryLabels[category as keyof typeof categoryLabels], category)
      ))}
    </div>
  );
};

export default BookDataTable; 