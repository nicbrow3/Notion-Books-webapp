import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { BookSearchResult } from '../types/book';
import { NotionService } from '../services/notionService';
import { CreateNotionPageRequest } from '../types/notion';

interface BookCardWithNotionProps {
  book: BookSearchResult;
  onSelect?: (book: BookSearchResult) => void;
  isNotionConnected: boolean;
  notionSettings?: any; // Will be properly typed later
}

const BookCardWithNotion: React.FC<BookCardWithNotionProps> = ({ 
  book, 
  onSelect, 
  isNotionConnected,
  notionSettings 
}) => {
  const [isAddingToNotion, setIsAddingToNotion] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateStatus, setDuplicateStatus] = useState<'unknown' | 'checking' | 'duplicate' | 'unique'>('unknown');

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
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return dateString;
    }
  };

  const checkForDuplicates = async () => {
    if (!isNotionConnected || !notionSettings?.databaseId) {
      return;
    }

    try {
      setIsCheckingDuplicates(true);
      setDuplicateStatus('checking');

      const existingBooks = await NotionService.searchExistingBooks(
        notionSettings.databaseId,
        book.isbn13 || book.isbn10 || undefined,
        book.title
      );

      if (existingBooks.length > 0) {
        setDuplicateStatus('duplicate');
        toast(`This book already exists in your Notion database (${existingBooks.length} match${existingBooks.length > 1 ? 'es' : ''})`, {
          icon: '⚠️',
          duration: 4000,
        });
      } else {
        setDuplicateStatus('unique');
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
      setDuplicateStatus('unknown');
      toast.error('Failed to check for duplicates');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const addToNotion = async () => {
    if (!isNotionConnected || !notionSettings) {
      toast.error('Please connect to Notion and configure your settings first');
      return;
    }

    try {
      setIsAddingToNotion(true);

      // Check for duplicates first if not already checked
      if (duplicateStatus === 'unknown') {
        await checkForDuplicates();
      }

      // If duplicate found, ask for confirmation
      if (duplicateStatus === 'duplicate') {
        const confirmed = window.confirm(
          'This book already exists in your Notion database. Do you want to add it anyway?'
        );
        if (!confirmed) {
          setIsAddingToNotion(false);
          return;
        }
      }

      const request: CreateNotionPageRequest = {
        databaseId: notionSettings.databaseId,
        bookData: book,
        fieldMapping: notionSettings.fieldMapping,
        customValues: notionSettings.defaultValues
      };

      const createdPage = await NotionService.createPage(request);
      
      if (createdPage) {
        toast.success(`"${book.title}" added to Notion successfully!`);
        setDuplicateStatus('duplicate'); // Mark as added
      } else {
        throw new Error('Failed to create page');
      }
    } catch (error) {
      console.error('Add to Notion failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to add book to Notion: ${errorMessage}`);
    } finally {
      setIsAddingToNotion(false);
    }
  };

  const renderNotionActions = () => {
    if (!isNotionConnected) {
      return (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          Connect to Notion to add this book to your database
        </div>
      );
    }

    if (!notionSettings?.databaseId) {
      return (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          Configure your Notion settings to add books
        </div>
      );
    }

    return (
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {duplicateStatus === 'checking' && (
            <span className="text-xs text-gray-500 flex items-center">
              <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Checking...
            </span>
          )}
          
          {duplicateStatus === 'duplicate' && (
            <span className="text-xs text-orange-600 flex items-center">
              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              May be duplicate
            </span>
          )}
          
          {duplicateStatus === 'unique' && (
            <span className="text-xs text-green-600 flex items-center">
              <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Unique
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {duplicateStatus === 'unknown' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                checkForDuplicates();
              }}
              disabled={isCheckingDuplicates}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Check Duplicates
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToNotion();
            }}
            disabled={isAddingToNotion}
            className={`px-3 py-1 text-xs rounded font-medium ${
              isAddingToNotion
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isAddingToNotion ? (
              <span className="flex items-center">
                <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </span>
            ) : (
              'Add to Notion'
            )}
          </button>
        </div>
      </div>
    );
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
            {book.publishedDate && (
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
          <div className="flex gap-2 text-xs mb-3">
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
          <div className="flex items-center justify-between">
            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
              Source: {book.source}
            </span>
          </div>

          {/* Notion Integration */}
          {renderNotionActions()}
        </div>
      </div>
    </div>
  );
};

export default BookCardWithNotion; 