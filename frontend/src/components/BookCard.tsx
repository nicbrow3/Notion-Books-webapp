import React from 'react';
import { BookSearchResult } from '../types/book';

interface BookCardProps {
  book: BookSearchResult;
  onSelect?: (book: BookSearchResult) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onSelect }) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(book);
    }
  };

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
    <div 
      className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 transition-all duration-200 ${
        onSelect ? 'hover:shadow-lg hover:border-blue-300 cursor-pointer' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex gap-4">
        {/* Book Cover */}
        <div className="flex-shrink-0">
          {book.thumbnail ? (
            <img
              src={book.thumbnail}
              alt={`Cover of ${book.title}`}
              className="w-24 h-32 object-cover rounded shadow-sm"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-24 h-32 bg-gray-200 rounded shadow-sm flex items-center justify-center">
              <span className="text-gray-400 text-xs text-center">No Cover</span>
            </div>
          )}
        </div>

        {/* Book Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {book.title}
            {book.subtitle && (
              <span className="text-gray-600 font-normal">: {book.subtitle}</span>
            )}
          </h3>
          
          <p className="text-sm text-gray-600 mb-2">
            by {formatAuthors(book.authors)}
          </p>

          {book.description && (
            <p className="text-sm text-gray-700 mb-3 line-clamp-3">
              {book.description}
            </p>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
            {book.originalPublishedDate && (
              <div>
                <span className="font-medium">First Published:</span> {formatDate(book.originalPublishedDate)}
              </div>
            )}
            {book.publishedDate && book.originalPublishedDate !== book.publishedDate && (
              <div>
                <span className="font-medium">This Edition:</span> {formatDate(book.publishedDate)}
              </div>
            )}
            {book.publishedDate && !book.originalPublishedDate && (
              <div>
                <span className="font-medium">Published:</span> {formatDate(book.publishedDate)}
              </div>
            )}
            {book.publisher && (
              <div>
                <span className="font-medium">Publisher:</span> {book.publisher}
              </div>
            )}
            {book.pageCount && (
              <div>
                <span className="font-medium">Pages:</span> {book.pageCount}
              </div>
            )}
            {book.language && (
              <div>
                <span className="font-medium">Language:</span> {book.language.toUpperCase()}
              </div>
            )}
            {book.isbn13 && (
              <div>
                <span className="font-medium">ISBN-13:</span> {book.isbn13}
              </div>
            )}
            {book.isbn10 && (
              <div>
                <span className="font-medium">ISBN-10:</span> {book.isbn10}
              </div>
            )}
          </div>

          {/* Categories */}
          {book.categories && book.categories.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-medium text-gray-600">Categories: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {book.categories.slice(0, 3).map((category, index) => (
                  <span
                    key={index}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {category}
                  </span>
                ))}
                {book.categories.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{book.categories.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Rating */}
          {book.averageRating && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(book.averageRating!) 
                        ? 'text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-gray-600">
                {book.averageRating.toFixed(1)}
                {book.ratingsCount && ` (${book.ratingsCount} reviews)`}
              </span>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-2 text-xs">
            {book.previewLink && (
              <a
                href={book.previewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Preview
              </a>
            )}
            {book.infoLink && (
              <a
                href={book.infoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                More Info
              </a>
            )}
            {book.buyLink && (
              <a
                href={book.buyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Buy
              </a>
            )}
          </div>

          {/* Source indicator */}
          <div className="mt-2">
            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
              Source: {book.source}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCard; 