import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { BookSearchResult, BookEdition } from '../types/book';
import { NotionService } from '../services/notionService';
import BookEditionsModal from './BookEditionsModal';
import BookDetailsModal from './BookDetailsModal';

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
  notionSettings: initialNotionSettings 
}) => {
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateStatus, setDuplicateStatus] = useState<'unknown' | 'checking' | 'duplicate' | 'unique'>('unknown');
  const [existingNotionPage, setExistingNotionPage] = useState<{ url: string; title: string } | null>(null);
  const [showEditionsModal, setShowEditionsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentBook, setCurrentBook] = useState<BookSearchResult>(book);
  const [notionSettings, setNotionSettings] = useState(initialNotionSettings);

  // Update local settings when prop changes
  useEffect(() => {
    setNotionSettings(initialNotionSettings);
  }, [initialNotionSettings]);

  const handleSettingsUpdated = (updatedSettings: any) => {
    setNotionSettings(updatedSettings);
    toast.success('Settings updated! New field mappings will be used for future books.');
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(book);
    }
    // Also open the details modal to speed up the workflow
    setShowDetailsModal(true);
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
        book.title,
        notionSettings.fieldMapping
      );

      if (existingBooks.length > 0) {
        setDuplicateStatus('duplicate');
        setExistingNotionPage({
          url: existingBooks[0].url,
          title: existingBooks[0].title
        });
        toast(`This book already exists in your Notion database (${existingBooks.length} match${existingBooks.length > 1 ? 'es' : ''})`, {
          icon: '⚠️',
          duration: 4000,
        });
      } else {
        setDuplicateStatus('unique');
        setExistingNotionPage(null);
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
      setDuplicateStatus('unknown');
      toast.error('Failed to check for duplicates');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleSelectEdition = (edition: BookEdition) => {
    // Merge categories from original book and selected edition
    const originalCategories = currentBook.categories || [];
    const editionCategories = edition.categories || [];
    
    // Combine and deduplicate categories
    const allCategories = [...originalCategories, ...editionCategories];
    const uniqueCategories = Array.from(new Set(allCategories.map(cat => cat.toLowerCase())))
      .map(lowerCat => allCategories.find(cat => cat.toLowerCase() === lowerCat))
      .filter(Boolean) as string[];

    // Convert BookEdition to BookSearchResult format
    const editionAsBook: BookSearchResult = {
      ...currentBook, // Keep original data as base
      id: edition.id,
      title: edition.title,
      subtitle: edition.subtitle,
      authors: edition.authors,
      publisher: edition.publisher,
      publishedDate: edition.publishedDate,
      isbn13: edition.isbn13,
      isbn10: edition.isbn10,
      pageCount: edition.pageCount,
      language: edition.language,
      thumbnail: edition.thumbnail,
      description: edition.description || currentBook.description, // Keep original description if edition doesn't have one
      categories: uniqueCategories, // Use merged and deduplicated categories
      infoLink: edition.infoLink,
      source: 'open_library_edition',
      openLibraryKey: edition.openLibraryKey,
      // Keep other data from original book
      originalPublishedDate: currentBook.originalPublishedDate,
      openLibraryData: currentBook.openLibraryData
    };

    setCurrentBook(editionAsBook);
    setDuplicateStatus('unknown'); // Reset duplicate status for new edition
    
    // Enhanced toast message with category info
    const categoryInfo = editionCategories.length > 0 
      ? ` (${editionCategories.length} additional categories merged)`
      : '';
    toast.success(`Selected edition: ${edition.title} (${edition.publishedDate || 'Unknown year'})${categoryInfo}`);
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
            <div className="flex items-center space-x-2">
              <span className="text-xs text-orange-600 flex items-center">
                <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                May be duplicate
              </span>
              {existingNotionPage && (
                <a
                  href={existingNotionPage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                  title={`View "${existingNotionPage.title}" in Notion`}
                >
                  View in Notion →
                </a>
              )}
            </div>
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
              setShowDetailsModal(true);
            }}
            className="px-3 py-1 text-xs rounded font-medium bg-black text-white hover:bg-gray-800"
          >
            View Details & Add to Notion
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
          {currentBook.thumbnail ? (
            <img
              src={currentBook.thumbnail}
              alt={`Cover of ${currentBook.title}`}
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
            {currentBook.title}
            {currentBook.subtitle && (
              <span className="text-gray-600 font-normal">: {currentBook.subtitle}</span>
            )}
          </h3>
          
          <p className="text-sm text-gray-600 mb-2">
            by {formatAuthors(currentBook.authors)}
          </p>

          {currentBook.description && (
            <p className="text-sm text-gray-700 mb-3 line-clamp-3">
              {currentBook.description}
            </p>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
            {currentBook.originalPublishedDate && (
              <div>
                <span className="font-medium">First Published:</span> {formatDate(currentBook.originalPublishedDate)}
              </div>
            )}
            {currentBook.publishedDate && currentBook.originalPublishedDate !== currentBook.publishedDate && (
              <div>
                <span className="font-medium">This Edition:</span> {formatDate(currentBook.publishedDate)}
              </div>
            )}
            {currentBook.publishedDate && !currentBook.originalPublishedDate && (
              <div>
                <span className="font-medium">Published:</span> {formatDate(currentBook.publishedDate)}
              </div>
            )}
            {currentBook.publisher && (
              <div>
                <span className="font-medium">Publisher:</span> {currentBook.publisher}
              </div>
            )}
            {currentBook.pageCount && (
              <div>
                <span className="font-medium">Pages:</span> {currentBook.pageCount}
              </div>
            )}
            {currentBook.language && (
              <div>
                <span className="font-medium">Language:</span> {currentBook.language.toUpperCase()}
              </div>
            )}
            {currentBook.isbn13 && (
              <div>
                <span className="font-medium">ISBN-13:</span> {currentBook.isbn13}
              </div>
            )}
            {currentBook.isbn10 && (
              <div>
                <span className="font-medium">ISBN-10:</span> {currentBook.isbn10}
              </div>
            )}
          </div>

          {/* Categories */}
          {currentBook.categories && currentBook.categories.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-medium text-gray-600">Categories: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentBook.categories.slice(0, 3).map((category, index) => (
                  <span
                    key={index}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {category}
                  </span>
                ))}
                {currentBook.categories.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{currentBook.categories.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* API Source Enhancement Indicators */}
          {currentBook.source === 'merged_apis' && (
            <div className="mb-3">
              <div className="flex items-center gap-1 text-xs text-purple-600">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
                <span>Merged data from Google Books & Open Library</span>
              </div>
              {currentBook.openLibraryData?.editionCount && currentBook.openLibraryData.editionCount > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  {currentBook.openLibraryData.editionCount} editions available
                </div>
              )}
            </div>
          )}
          
          {currentBook.source === 'open_library_primary' && (
            <div className="mb-3">
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <span className="inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                <span>Primary data from Open Library</span>
              </div>
              {currentBook.openLibraryData?.editionCount && currentBook.openLibraryData.editionCount > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  {currentBook.openLibraryData.editionCount} editions available
                </div>
              )}
            </div>
          )}
          
          {currentBook.openLibraryData && currentBook.originalPublishedDate !== currentBook.publishedDate && 
           !['merged_apis', 'open_library_primary'].includes(currentBook.source) && (
            <div className="mb-3">
              <div className="flex items-center gap-1 text-xs text-green-600">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Enhanced with original publication date from Open Library</span>
              </div>
              {currentBook.openLibraryData.editionCount && currentBook.openLibraryData.editionCount > 1 && (
                <div className="text-xs text-gray-500 mt-1">
                  {currentBook.openLibraryData.editionCount} editions available
                </div>
              )}
            </div>
          )}

          {/* Rating */}
          {currentBook.averageRating && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(currentBook.averageRating!) 
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
                {currentBook.averageRating.toFixed(1)}
                {currentBook.ratingsCount && ` (${currentBook.ratingsCount} reviews)`}
              </span>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-2 text-xs mb-3">
            {currentBook.previewLink && (
              <a
                href={currentBook.previewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                Preview
              </a>
            )}
            {currentBook.infoLink && (
              <a
                href={currentBook.infoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
                onClick={(e) => e.stopPropagation()}
              >
                More Info
              </a>
            )}
            {currentBook.buyLink && (
              <a
                href={currentBook.buyLink}
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
            <div className="flex items-center gap-2">
              <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                {currentBook.source === 'merged_apis' ? 'Sources: Google Books + Open Library' :
                 currentBook.source === 'open_library_primary' ? 'Source: Open Library' :
                 currentBook.source === 'google_books_enhanced' ? 'Source: Google Books (Enhanced)' :
                 currentBook.source === 'open_library_edition' ? 'Source: Open Library Edition' :
                 `Source: ${currentBook.source}`}
              </span>
              {(currentBook as any).relevanceScore && (
                <span className="inline-block bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded">
                  Score: {(currentBook as any).relevanceScore}
                </span>
              )}
            </div>
            
            {/* View Editions Button */}
            {currentBook.openLibraryData?.editionCount && currentBook.openLibraryData.editionCount > 1 && currentBook.openLibraryKey && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditionsModal(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
              >
                View {currentBook.openLibraryData.editionCount} Editions
              </button>
            )}
          </div>

          {/* Notion Integration */}
          {renderNotionActions()}
        </div>
      </div>

      {/* Book Editions Modal */}
      {currentBook.openLibraryKey && (
        <BookEditionsModal
          isOpen={showEditionsModal}
          onClose={() => setShowEditionsModal(false)}
          workKey={currentBook.openLibraryKey}
          bookTitle={currentBook.title}
          onSelectEdition={handleSelectEdition}
        />
      )}

      {/* Book Details Modal */}
      {showDetailsModal && (
        <BookDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          book={currentBook}
          isNotionConnected={isNotionConnected}
          notionSettings={notionSettings}
          onSettingsUpdated={handleSettingsUpdated}
        />
      )}
    </div>
  );
};

export default BookCardWithNotion; 