import React, { useState } from 'react';
import { BookSearchResult } from '../../types/book';
import AudiobookInfoSection from './AudiobookInfoSection';

interface BookInfoPanelProps {
  book: BookSearchResult;
  editions: any[];
  loadingEditions: boolean;
  loadingAudiobook: boolean;
  onOpenAudiobookSearch: () => void;
}

const BookInfoPanel: React.FC<BookInfoPanelProps> = ({
  book,
  editions,
  loadingEditions,
  loadingAudiobook,
  onOpenAudiobookSearch
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
                <p className="text-xs text-gray-500 mt-1">
                  Categories loaded from {editions.length} editions
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Description</h4>
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
              {book.description}
            </p>
            {book.description.length > 200 && (
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
        {book.originalPublishedDate && (
          <div>
            <span className="font-medium text-gray-900">First Published:</span>
            <p className="text-gray-600">{formatDate(book.originalPublishedDate)}</p>
          </div>
        )}
        {book.publishedDate && book.originalPublishedDate !== book.publishedDate && (
          <div>
            <span className="font-medium text-gray-900">This Edition:</span>
            <p className="text-gray-600">{formatDate(book.publishedDate)}</p>
          </div>
        )}
        {book.publishedDate && !book.originalPublishedDate && (
          <div>
            <span className="font-medium text-gray-900">Published:</span>
            <p className="text-gray-600">{formatDate(book.publishedDate)}</p>
          </div>
        )}
        {book.publisher && (
          <div>
            <span className="font-medium text-gray-900">Publisher:</span>
            <p className="text-gray-600">{book.publisher}</p>
          </div>
        )}
        {book.pageCount && (
          <div>
            <span className="font-medium text-gray-900">Pages:</span>
            <p className="text-gray-600">{book.pageCount}</p>
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