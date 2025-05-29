import React, { useState, useEffect, useCallback } from 'react';
import { BookEdition, BookEditionsResponse } from '../types/book';

interface BookEditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workKey: string;
  bookTitle: string;
  onSelectEdition: (edition: BookEdition) => void;
}

const BookEditionsModal: React.FC<BookEditionsModalProps> = ({
  isOpen,
  onClose,
  workKey,
  bookTitle,
  onSelectEdition
}) => {
  const [editions, setEditions] = useState<BookEdition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalEditions, setTotalEditions] = useState(0);

  const fetchEditions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Extract work key from full path if needed
      const cleanWorkKey = workKey.replace('/works/', '');
      
      const response = await fetch(`/api/books/editions/${cleanWorkKey}`);
      const result: BookEditionsResponse = await response.json();
      
      if (result.success && result.data) {
        setEditions(result.data.editions);
        setTotalEditions(result.data.totalEditions);
      } else {
        setError(result.error || 'Failed to fetch editions');
      }
    } catch (err) {
      setError('Failed to fetch editions');
      console.error('Error fetching editions:', err);
    } finally {
      setLoading(false);
    }
  }, [workKey]);

  useEffect(() => {
    if (isOpen && workKey) {
      fetchEditions();
    }
  }, [isOpen, workKey, fetchEditions]);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Unknown';
    
    // If it's just a year, return it as is
    if (/^\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // Try to parse as a date
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if can't parse
      }
      return date.getFullYear().toString();
    } catch {
      return dateString;
    }
  };

  const formatAuthors = (authors: string[]): string => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
    return `${authors[0]} and ${authors.length - 1} others`;
  };

  const handleSelectEdition = (edition: BookEdition) => {
    onSelectEdition(edition);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Select Edition
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {bookTitle} - {totalEditions} editions available
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading editions...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium">Error Loading Editions</p>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
              </div>
              <button
                onClick={fetchEditions}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && editions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-lg font-medium">No Editions Found</p>
                <p className="text-sm text-gray-600 mt-1">No different editions are available for this book.</p>
              </div>
            </div>
          )}

          {!loading && !error && editions.length > 0 && (
            <div className="space-y-4">
              {editions.map((edition, index) => (
                <div
                  key={edition.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelectEdition(edition)}
                >
                  <div className="flex gap-4">
                    {/* Cover Image */}
                    <div className="flex-shrink-0">
                      {edition.thumbnail ? (
                        <img
                          src={edition.thumbnail}
                          alt={`${edition.title} cover`}
                          className="w-16 h-24 object-cover rounded border border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-24 bg-gray-200 rounded border border-gray-200 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Edition Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 line-clamp-2">
                            {edition.title}
                            {edition.subtitle && (
                              <span className="text-gray-600 font-normal">: {edition.subtitle}</span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            by {formatAuthors(edition.authors)}
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Edition {index + 1}
                          </span>
                        </div>
                      </div>

                      {/* Edition Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs text-gray-600">
                        {edition.publishedDate && (
                          <div>
                            <span className="font-medium">Published:</span> {formatDate(edition.publishedDate)}
                          </div>
                        )}
                        {edition.publisher && (
                          <div>
                            <span className="font-medium">Publisher:</span> {edition.publisher}
                          </div>
                        )}
                        {edition.format && (
                          <div>
                            <span className="font-medium">Format:</span> {edition.format}
                          </div>
                        )}
                        {edition.pageCount && (
                          <div>
                            <span className="font-medium">Pages:</span> {edition.pageCount}
                          </div>
                        )}
                        {edition.isbn13 && (
                          <div className="col-span-2">
                            <span className="font-medium">ISBN-13:</span> {edition.isbn13}
                          </div>
                        )}
                        {edition.isbn10 && (
                          <div className="col-span-2">
                            <span className="font-medium">ISBN-10:</span> {edition.isbn10}
                          </div>
                        )}
                      </div>

                      {/* Categories if available */}
                      {edition.categories && edition.categories.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-medium text-gray-600">Categories:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {edition.categories.slice(0, 5).map((category, catIndex) => (
                              <span
                                key={catIndex}
                                className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded"
                              >
                                {category}
                              </span>
                            ))}
                            {edition.categories.length > 5 && (
                              <span className="text-xs text-gray-500">
                                +{edition.categories.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Select Button */}
                      <div className="mt-3">
                        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                          Select This Edition →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookEditionsModal; 