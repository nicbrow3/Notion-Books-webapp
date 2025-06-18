import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    // Delay the actual close to allow animation to complete
    setTimeout(() => {
      onClose();
    }, 300); // Match the exit animation duration
  };

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
      setIsClosing(false); // Reset closing state when modal opens
      fetchEditions();
    }
  }, [isOpen, workKey, fetchEditions]);

  const formatDate = (dateString: string | null | undefined): string => {
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

  const formatAuthors = (authors: string[]): string => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
    return `${authors[0]} and ${authors.length - 1} others`;
  };

  const handleSelectEdition = (edition: BookEdition) => {
    if (!isClosing) {
      onSelectEdition(edition);
      handleClose();
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <AnimatePresence mode="wait">
      {(isOpen || isClosing) && (
        <motion.div
          key="editions-modal"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: isClosing ? 0 : 1 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isClosing) {
              handleClose();
            }
          }}
        >
          <motion.div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ 
              opacity: isClosing ? 0 : 1, 
              scale: isClosing ? 0.9 : 1, 
              y: isClosing ? 0 : 0 
            }}
            transition={{ 
              type: "spring", 
              stiffness: isClosing ? 600 : 300, 
              damping: isClosing ? 25 : 30,
              duration: isClosing ? 0.25 : 0.3
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
              onClick={handleClose}
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
              <motion.button
                onClick={fetchEditions}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                whileHover={{ 
                  backgroundColor: '#1d4ed8',
                  scale: 1.05 
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25 
                }}
              >
                Try Again
              </motion.button>
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
                <motion.div
                  key={edition.id}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ 
                    borderColor: '#93c5fd',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.div>
              ))}
            </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BookEditionsModal; 