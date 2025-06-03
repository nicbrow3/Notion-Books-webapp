import React, { useState, useEffect } from 'react';
import { BookSearchResult } from '../../types/book';
import AudiobookInfoSection from './AudiobookInfoSection';
import FieldSourceTable from './FieldSourceTable';
import { CategoryService } from '../../services/categoryService';

export interface FieldSelections {
  description: 'audiobook' | 'original' | number; // number = edition index
  publisher: 'audiobook' | 'original' | number;
  pageCount: 'original' | number;
  publishedDate: 'audiobook' | 'original' | 'first_published' | number;
  isbn: 'original' | number;
  thumbnail: 'original' | number;
}

interface BookInfoPanelProps {
  book: BookSearchResult;
  editions: any[];
  loadingEditions: boolean;
  loadingAudiobook: boolean;
  onOpenAudiobookSearch: () => void;
  onSelectEdition?: (edition: any) => void;
  onFieldSelectionChange?: (fieldSelections: FieldSelections, selectedData: any) => void;
}

const BookInfoPanel: React.FC<BookInfoPanelProps> = ({
  book,
  editions,
  loadingEditions,
  loadingAudiobook,
  onOpenAudiobookSearch,
  onSelectEdition,
  onFieldSelectionChange
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [fieldSelections, setFieldSelections] = useState<FieldSelections>({
    description: 'original',
    publisher: 'original', 
    pageCount: 'original',
    publishedDate: 'original',
    isbn: 'original',
    thumbnail: 'original'
  });

  // Add state for managing which field source tables are open
  const [openFieldTables, setOpenFieldTables] = useState<{
    description: boolean;
    publisher: boolean;
    pageCount: boolean;
    publishedDate: boolean;
  }>({
    description: false,
    publisher: false,
    pageCount: false,
    publishedDate: false
  });

  // Function to toggle field table visibility
  const toggleFieldTable = (fieldName: keyof typeof openFieldTables) => {
    setOpenFieldTables(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Initialize field selections with smart defaults when audiobook/editions load
  useEffect(() => {
    const newSelections = { ...fieldSelections };
    let hasChanges = false;

    // Check for saved defaults first
    const savedDescriptionDefault = CategoryService.getFieldDefault('description');
    const savedPublisherDefault = CategoryService.getFieldDefault('publisher');
    const savedPageCountDefault = CategoryService.getFieldDefault('pages');
    const savedPublishedDateDefault = CategoryService.getFieldDefault('publisheddate');

    // Use saved defaults if available
    if (savedDescriptionDefault !== null && fieldSelections.description === 'original') {
      newSelections.description = savedDescriptionDefault;
      hasChanges = true;
    }
    if (savedPublisherDefault !== null && fieldSelections.publisher === 'original') {
      newSelections.publisher = savedPublisherDefault;
      hasChanges = true;
    }
    if (savedPageCountDefault !== null && savedPageCountDefault !== 'audiobook' && fieldSelections.pageCount === 'original') {
      newSelections.pageCount = savedPageCountDefault as 'original' | number;
      hasChanges = true;
    }
    if (savedPublishedDateDefault !== null && fieldSelections.publishedDate === 'original') {
      newSelections.publishedDate = savedPublishedDateDefault;
      hasChanges = true;
    }

    // Fallback to smart defaults if no saved preferences
    if (!hasChanges) {
      // Default to audiobook description if available and not already set to audiobook
      if (book.audiobookData?.hasAudiobook && book.audiobookData.description && fieldSelections.description === 'original') {
        newSelections.description = 'audiobook';
        hasChanges = true;
      }

      // Default to audiobook publisher if available and original is missing
      if (book.audiobookData?.hasAudiobook && book.audiobookData.publisher && !book.publisher && fieldSelections.publisher === 'original') {
        newSelections.publisher = 'audiobook';
        hasChanges = true;
      }

      // Default to first published date if available and different from publishedDate
      if (book.originalPublishedDate && book.publishedDate && book.originalPublishedDate !== book.publishedDate && fieldSelections.publishedDate === 'original') {
        newSelections.publishedDate = 'first_published';
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setFieldSelections(newSelections);
    }
  }, [book.audiobookData, editions.length]);

  // Get available description sources
  const getDescriptionSources = () => {
    const sources: Array<{value: 'audiobook' | 'original' | number, label: string, content: string}> = [];
    
    // Original book description
    if (book.description) {
      sources.push({
        value: 'original',
        label: 'Original Book',
        content: book.description
      });
    }

    // Audiobook description
    if (book.audiobookData?.hasAudiobook && book.audiobookData.description) {
      sources.push({
        value: 'audiobook',
        label: 'Audiobook',
        content: book.audiobookData.description
      });
    }

    // Edition descriptions
    editions.forEach((edition, index) => {
      if (edition.description) {
        sources.push({
          value: index,
          label: createEditionLabel(edition, index),
          content: edition.description
        });
      }
    });

    return sources;
  };

  // Get the currently selected description
  const getSelectedDescription = () => {
    const sources = getDescriptionSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.description);
    return selectedSource?.content || book.description || '';
  };

  // Get the source label for the selected description
  const getSelectedDescriptionLabel = () => {
    const sources = getDescriptionSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.description);
    return selectedSource?.label || 'Original Book';
  };

  // Get available publisher sources
  const getPublisherSources = () => {
    const sources: Array<{value: 'audiobook' | 'original' | number, label: string, content: string}> = [];
    
    // Original book publisher
    if (book.publisher) {
      sources.push({
        value: 'original',
        label: 'Original Book',
        content: book.publisher
      });
    }

    // Audiobook publisher
    if (book.audiobookData?.hasAudiobook && book.audiobookData.publisher) {
      sources.push({
        value: 'audiobook',
        label: 'Audiobook',
        content: book.audiobookData.publisher
      });
    }

    // Edition publishers
    editions.forEach((edition, index) => {
      if (edition.publisher) {
        sources.push({
          value: index,
          label: createEditionLabel(edition, index),
          content: edition.publisher
        });
      }
    });

    return sources;
  };

  // Get available page count sources
  const getPageCountSources = () => {
    const sources: Array<{value: 'original' | number, label: string, content: number}> = [];
    
    // Original book page count
    if (book.pageCount) {
      sources.push({
        value: 'original',
        label: 'Original Book',
        content: book.pageCount
      });
    }

    // Edition page counts
    editions.forEach((edition, index) => {
      if (edition.pageCount) {
        sources.push({
          value: index,
          label: createEditionLabel(edition, index),
          content: edition.pageCount
        });
      }
    });

    return sources;
  };

  // Helper function to check if a date is year-only
  const isYearOnlyDate = (dateString: string) => {
    return /^\d{4}$/.test(dateString.trim());
  };

  // Helper function to clean audiobook date
  const cleanAudiobookDate = (dateString: string) => {
    return dateString.replace(/T00:00:00\.000Z$/, '');
  };

  // Helper function to create descriptive edition labels
  const createEditionLabel = (edition: any, index: number) => {
    const parts = [];
    
    // Add title if different from main book
    if (edition.title && edition.title !== book.title) {
      parts.push(edition.title);
    }
    
    // Add year if available
    if (edition.publishedDate) {
      const year = edition.publishedDate.match(/\d{4}/)?.[0];
      if (year) {
        parts.push(`${year}`);
      }
    }
    
    // Add publisher if available and helps differentiate
    if (edition.publisher) {
      parts.push(edition.publisher);
    }
    
    // Fallback to edition number if we don't have distinguishing info
    if (parts.length === 0 || (parts.length === 1 && parts[0] === book.title)) {
      parts.push(`Edition ${index + 1}`);
    }
    
    return parts.join(' • ');
  };

  // Get available published date sources
  const getPublishedDateSources = () => {
    const sources: Array<{value: 'audiobook' | 'original' | 'first_published' | number, label: string, content: string}> = [];
    
    // Collect all potential dates first
    const potentialSources: Array<{
      value: 'audiobook' | 'original' | 'first_published' | number;
      label: string;
      content: string;
      isYearOnly: boolean;
    }> = [];
    
    // First published date (original published date)
    if (book.originalPublishedDate) {
      potentialSources.push({
        value: 'first_published',
        label: 'First Published',
        content: book.originalPublishedDate,
        isYearOnly: isYearOnlyDate(book.originalPublishedDate)
      });
    }
    
    // This edition published date
    if (book.publishedDate && book.publishedDate !== book.originalPublishedDate) {
      potentialSources.push({
        value: 'original',
        label: 'This Edition',
        content: book.publishedDate,
        isYearOnly: isYearOnlyDate(book.publishedDate)
      });
    }

    // If we only have one date (either publishedDate or originalPublishedDate but not both)
    if (!book.originalPublishedDate && book.publishedDate) {
      potentialSources.push({
        value: 'original',
        label: 'Original Book',
        content: book.publishedDate,
        isYearOnly: isYearOnlyDate(book.publishedDate)
      });
    }

    // Audiobook published date
    if (book.audiobookData?.hasAudiobook && book.audiobookData.publishedDate) {
      const cleanDate = cleanAudiobookDate(book.audiobookData.publishedDate);
      potentialSources.push({
        value: 'audiobook',
        label: 'Audiobook',
        content: cleanDate,
        isYearOnly: isYearOnlyDate(cleanDate)
      });
    }

    // Edition published dates
    editions.forEach((edition, index) => {
      if (edition.publishedDate) {
        potentialSources.push({
          value: index as number,
          label: createEditionLabel(edition, index),
          content: edition.publishedDate,
          isYearOnly: isYearOnlyDate(edition.publishedDate)
        });
      }
    });

    // Filter out year-only dates if we have more specific dates
    const hasSpecificDates = potentialSources.some(source => !source.isYearOnly);
    
    const filteredSources = hasSpecificDates 
      ? potentialSources.filter(source => !source.isYearOnly)
      : potentialSources; // Keep year-only dates if that's all we have

    // Convert to final format
    filteredSources.forEach(source => {
      sources.push({
        value: source.value,
        label: source.label,
        content: source.content
      });
    });

    return sources;
  };

  // Get selected values for fields
  const getSelectedPublisher = () => {
    const sources = getPublisherSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.publisher);
    return selectedSource?.content || book.publisher || '';
  };

  const getSelectedPageCount = () => {
    const sources = getPageCountSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.pageCount);
    return selectedSource?.content || book.pageCount || null;
  };

  const getSelectedPublishedDate = () => {
    const sources = getPublishedDateSources();
    const selectedSource = sources.find(source => source.value === fieldSelections.publishedDate);
    
    // If we have multiple sources, return the selected one
    if (sources.length > 1) {
      return selectedSource?.content || sources[0]?.content || '';
    }
    
    // If we only have one source, return it
    if (sources.length === 1) {
      return sources[0].content;
    }
    
    // Fallback
    return book.publishedDate || book.originalPublishedDate || '';
  };

  // Notify parent of current selections
  const notifyFieldSelectionChange = (newSelections?: FieldSelections) => {
    const selections = newSelections || fieldSelections;
    if (onFieldSelectionChange) {
      const selectedData = {
        description: getSelectedDescription(),
        publisher: getSelectedPublisher(),
        pageCount: getSelectedPageCount(),
        publishedDate: getSelectedPublishedDate(),
        // Add more fields as needed
      };
      onFieldSelectionChange(selections, selectedData);
    }
  };

  // Call notification when selections change
  useEffect(() => {
    notifyFieldSelectionChange();
  }, [fieldSelections]);

  const formatAuthors = (authors: string[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' and ');
    return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Unknown';
    
    try {
      // Check if it's just a year (4 digits) - show only the year
      if (/^\d{4}$/.test(dateString.trim())) {
        return dateString.trim(); // Just show "2023" instead of "January 1, 2023"
      }
      
      // Check if it's in YYYY-MM-DD format to avoid timezone issues
      const isoDateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoDateMatch) {
        const [, year, month, day] = isoDateMatch;
        // Create date with explicit components to avoid timezone parsing issues
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }
      
      // Try to parse the full date
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // If invalid date but contains a year, extract and use just the year
        const yearMatch = dateString.match(/\d{4}/);
        if (yearMatch) {
          return yearMatch[0]; // Just show the year
        }
        return dateString; // Return original if we can't parse anything
      }
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
      <div className="flex gap-4 mb-6">
        {/* Book Cover */}
        <div className="flex-shrink-0">
          {book.thumbnail ? (
            <img
              src={book.thumbnail}
              alt={`Cover of ${book.title}`}
              className="w-32 h-48 object-cover rounded shadow-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-32 h-48 bg-gray-200 rounded shadow-lg flex items-center justify-center">
              <span className="text-gray-400 text-sm text-center">No Cover</span>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {book.title}
            {book.subtitle && (
              <span className="text-gray-600 font-normal">: {book.subtitle}</span>
            )}
          </h3>
          
          <p className="text-sm text-gray-600 mb-3">
            by {formatAuthors(book.authors)}
          </p>

          {/* Source Indicator */}
          <div className="mb-3">
            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
              {book.source === 'merged_apis' ? 'Sources: Google Books + Open Library' :
               book.source === 'open_library_primary' ? 'Source: Open Library' :
               book.source === 'google_books_enhanced' ? 'Source: Google Books (Enhanced)' :
               book.source === 'open_library_edition' ? 'Source: Open Library Edition' :
               `Source: ${book.source}`}
            </span>
          </div>

          {/* Editions Info */}
          {book.openLibraryData?.editionCount && book.openLibraryData.editionCount > 1 && (
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 font-medium">
                  {book.openLibraryData.editionCount} editions available
                </span>
                {loadingEditions && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
              {editions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Data enhanced from {editions.length} editions
                  </p>
                  {onSelectEdition && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          // For now, show a list of editions. Later this could open a modal
                          const editionsList = editions.map((edition, index) => 
                            `${index + 1}. ${edition.title} (${edition.publishedDate || 'Unknown year'})${edition.description ? ' - Has description' : ''}`
                          ).join('\n');
                          alert(`Available editions:\n\n${editionsList}\n\nEdition selection UI coming soon!`);
                        }}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors w-fit"
                      >
                        📚 Browse Editions
                      </button>
                      
                      {/* Show best edition info */}
                      {(() => {
                        const bestEdition = editions.find(e => e.description) || editions[0];
                        if (bestEdition && bestEdition.description) {
                          return (
                            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                              ✨ Using data from: {bestEdition.title} ({bestEdition.publishedDate || 'Unknown year'})
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {(getSelectedDescription() || getDescriptionSources().length > 0) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-gray-900">Description</h4>
            <FieldSourceTable
              fieldName="Description"
              sources={getDescriptionSources()}
              selectedValue={fieldSelections.description}
              onSelect={(value) => {
                setFieldSelections(prev => ({ ...prev, description: value }));
              }}
              isOpen={openFieldTables.description}
              onToggle={() => toggleFieldTable('description')}
            />
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            <p 
              className={`${!isDescriptionExpanded ? 'overflow-hidden' : ''}`}
              style={!isDescriptionExpanded ? {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              } : {}}
            >
              {getSelectedDescription()}
            </p>
            {getSelectedDescription().length > 200 && (
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="text-blue-600 hover:text-blue-800 text-sm mt-2 underline"
              >
                {isDescriptionExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Detailed Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        {getPublishedDateSources().length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">Published:</span>
              {getPublishedDateSources().length > 1 && (
                <FieldSourceTable
                  fieldName="Published Date"
                  sources={getPublishedDateSources()}
                  selectedValue={fieldSelections.publishedDate}
                  onSelect={(value) => {
                    setFieldSelections(prev => ({ ...prev, publishedDate: value }));
                  }}
                  isOpen={openFieldTables.publishedDate}
                  onToggle={() => toggleFieldTable('publishedDate')}
                />
              )}
            </div>
            <p className="text-gray-600">{formatDate(getSelectedPublishedDate())}</p>
          </div>
        )}
        {getSelectedPublisher() && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">Publisher:</span>
              <FieldSourceTable
                fieldName="Publisher"
                sources={getPublisherSources()}
                selectedValue={fieldSelections.publisher}
                onSelect={(value) => {
                  setFieldSelections(prev => ({ ...prev, publisher: value }));
                }}
                isOpen={openFieldTables.publisher}
                onToggle={() => toggleFieldTable('publisher')}
              />
            </div>
            <p className="text-gray-600">{getSelectedPublisher()}</p>
          </div>
        )}
        {getSelectedPageCount() && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">Pages:</span>
              <FieldSourceTable
                fieldName="Pages"
                sources={getPageCountSources()}
                selectedValue={fieldSelections.pageCount}
                onSelect={(value) => {
                  setFieldSelections(prev => ({ ...prev, pageCount: value }));
                }}
                isOpen={openFieldTables.pageCount}
                onToggle={() => toggleFieldTable('pageCount')}
              />
            </div>
            <p className="text-gray-600">{getSelectedPageCount()}</p>
          </div>
        )}
        {book.language && (
          <div>
            <span className="font-medium text-gray-900">Language:</span>
            <p className="text-gray-600">{book.language.toUpperCase()}</p>
          </div>
        )}
        {book.isbn13 && (
          <div>
            <span className="font-medium text-gray-900">ISBN-13:</span>
            <p className="text-gray-600 font-mono text-xs">{book.isbn13}</p>
          </div>
        )}
        {book.isbn10 && (
          <div>
            <span className="font-medium text-gray-900">ISBN-10:</span>
            <p className="text-gray-600 font-mono text-xs">{book.isbn10}</p>
          </div>
        )}
        {book.averageRating && (
          <div>
            <span className="font-medium text-gray-900">Rating:</span>
            <p className="text-gray-600">
              {book.averageRating.toFixed(1)}/5
              {book.ratingsCount && ` (${book.ratingsCount} reviews)`}
            </p>
          </div>
        )}
      </div>

      {/* Audiobook Information */}
      <AudiobookInfoSection
        book={book}
        loadingAudiobook={loadingAudiobook}
        onOpenAudiobookSearch={onOpenAudiobookSearch}
      />

      {/* Links */}
      <div className="mt-6">
        <h4 className="font-medium text-gray-900 mb-2">Links</h4>
        <div className="flex flex-wrap gap-2">
          {book.previewLink && (
            <a
              href={book.previewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Preview
            </a>
          )}
          {book.infoLink && (
            <a
              href={book.infoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              More Info
            </a>
          )}
          {book.buyLink && (
            <a
              href={book.buyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 underline text-sm"
            >
              Buy
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookInfoPanel; 