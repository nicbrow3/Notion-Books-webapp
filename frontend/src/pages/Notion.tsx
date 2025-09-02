import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useSearch } from '../contexts/SearchContext';
import { useNotionSettings } from '../contexts/NotionSettingsContext';
import SearchForm from '../components/SearchForm';
import BookCardWithNotion from '../components/BookCardWithNotion';
import BookDetailsModal from '../components/BookDetailsModal';
import NotionAuth from '../components/NotionAuth';

const Notion: React.FC = () => {
  // Use auth context instead of local state
  const { isAuthenticated } = useAuth();
  // Use search context instead of local state
  const { isSearching, searchResults, selectedBook, handleSearch, handleBookSelect, clearSelectedBook } = useSearch();
  // Use notion settings context
  const { notionSettings, loadSettings } = useNotionSettings();
  
  // Track modal state to disable hover effects when modal is open
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  // Track modal state based on selectedBook
  useEffect(() => {
    setIsAnyModalOpen(!!selectedBook);
  }, [selectedBook]);

  const handleModalOpen = () => {
    setIsAnyModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAnyModalOpen(false);
  };

  const handleBookDetailsModalClose = () => {
    // Clear the selected book from SearchContext after animation completes
    // This prevents visual artifacts from sticky elements remaining in the DOM
    setTimeout(() => {
      clearSelectedBook();
    }, 300); // Match the modal's exit animation duration
  };

  const handleSettingsUpdated = async (_updatedSettings: any) => {
    // Reload settings from localStorage into context so the whole app state updates
    await loadSettings();
  };

  // Filter function to exclude book summaries, reviews, and analysis
  const filterRealBooks = (books: any[]) => {
    if (!books) return [];
    
    return books.filter((book: any) => {
      const title = (book.title || '').toLowerCase();
      const author = (book.author || '').toLowerCase();
      
      // Filter out obvious summaries and reviews
      const summaryKeywords = [
        'summary', 'review', 'analysis', 'study guide', 'cliff notes', 
        'sparknotes', 'book notes', 'quick read', 'digest', 'synopsis',
        'overview', 'recap', 'breakdown', 'companion', 'guide to',
        'understanding', 'explained', 'commentary', 'sneak peek', 'preview',
        'excerpt', 'sample', 'teaser', 'first chapter', 'prologue only',
        'chapter 1', 'introduction to', 'behind the scenes', 'making of'
      ];
      
      // Check if title contains summary keywords
      const hasSummaryInTitle = summaryKeywords.some(keyword => 
        title.includes(keyword)
      );
      
      // Filter out suspicious authors that indicate summaries
      const summaryAuthors = [
        'unknown author', 'unique summary', 'summary', 'sparknotes',
        'cliffsnotes', 'good reads publishing', 'bookrags', 'study guide',
        'quick read', 'book summary', 'analysis', 'literary analysis'
      ];
      
      const hasSummaryAuthor = summaryAuthors.some(summaryAuthor => 
        author.includes(summaryAuthor)
      );
      
      // Filter out books with publishers that are clearly summary services
      const publisher = (book.publisher || '').toLowerCase();
      const summaryPublishers = [
        'independently published', 'createspace', 'bookrags', 'sparknotes',
        'cliffsnotes', 'good reads publishing', 'irb media', 'summary',
        'analysis', 'study guide'
      ];
      
      const hasSummaryPublisher = summaryPublishers.some(summaryPub => 
        publisher.includes(summaryPub)
      );
      
      // Additional checks for suspicious patterns
      const suspiciousPatterns = [
        // Title patterns that indicate summaries
        /^(summary|analysis|review|study guide|companion)/i,
        /summary of .* by /i,
        /analysis of .* by /i,
        /(summary|analysis|review) and (review|analysis|summary)/i,
        // Preview/excerpt patterns
        /^(sneak peek|preview|excerpt|sample|teaser)/i,
        /sneak peek for .*/i,
        /preview of .*/i,
        /excerpt from .*/i,
        /^(first chapter|prologue|chapter \d+)/i,
        // Very short titles that are likely not real books (less than 3 characters)
        /^.{1,2}$/
      ];
      
      const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
        pattern.test(title)
      );
      
      // Filter out books with very low scores (likely auto-generated content)
      const score = book.score || 0;
      const hasLowScore = score > 0 && score < 10; // Assuming scores are out of 100
      
      // Keep the book if it doesn't match any of the filtering criteria
      return !hasSummaryInTitle && 
             !hasSummaryAuthor && 
             !hasSummaryPublisher && 
             !hasSuspiciousPattern && 
             !hasLowScore;
    });
  };

  const renderSearchSection = () => {
    return (
      <div className="space-y-6">
        {/* Search Form */}
        <motion.div
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Books</h2>
          <SearchForm onSearch={handleSearch} isLoading={isSearching} />
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Loading State */}
          {isSearching && (
            <motion.div
              key="loading"
              className="flex justify-center py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="flex items-center space-x-2">
                <motion.svg 
                  className="h-8 w-8 text-blue-600" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </motion.svg>
                <motion.span 
                  className="text-lg text-gray-600"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                >
                  Searching books...
                </motion.span>
              </div>
            </motion.div>
          )}

          {/* Search Results */}
          {searchResults && !isSearching && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.div 
                className="flex items-center justify-between mb-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              >
                <h2 className="text-2xl font-bold text-gray-900">Search Results</h2>
                <motion.div 
                  className="text-sm text-gray-600"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                >
                  {(() => {
                    const filteredBooks = filterRealBooks(searchResults.books);
                    const originalCount = searchResults.books?.length || 0;
                    const filteredCount = filteredBooks?.length || 0;
                    const filteredOutCount = originalCount - filteredCount;
                    
                    return (
                      <div className="space-y-1">
                        <div>
                          Found {filteredCount} books for "{searchResults.query}"
                        </div>
                        {filteredOutCount > 0 && (
                          <div className="text-xs text-gray-500">
                            ({filteredOutCount} book {filteredOutCount === 1 ? 'summary' : 'summaries'} and reviews filtered out)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              </motion.div>

              {(() => {
                const filteredBooks = filterRealBooks(searchResults.books);
                return filteredBooks && filteredBooks.length > 0 ? (
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    {filteredBooks.map((book: any, index: number) => (
                      <motion.div
                        key={book.id}
                        className="book-card-wrapper"
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ 
                          duration: 0.4,
                          delay: 0.1 + (index * 0.08),
                          ease: "easeOut"
                        }}
                        {...(!isAnyModalOpen && {
                          whileHover: { 
                            scale: 1.02,
                            transition: { duration: 0.2, ease: "easeOut" }
                          }
                        })}
                      >
                        <BookCardWithNotion
                          book={book}
                          onSelect={handleBookSelect}
                          isNotionConnected={isAuthenticated}
                          notionSettings={notionSettings}
                          onModalOpen={handleModalOpen}
                          onModalClose={handleModalClose}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    className="text-center py-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
                  >
                    {(() => {
                      const originalCount = searchResults.books?.length || 0;
                      if (originalCount === 0) {
                        return <p className="text-gray-500">No books found for your search query.</p>;
                      } else {
                        return (
                          <div className="space-y-2">
                            <p className="text-gray-500">No actual books found after filtering.</p>
                            <p className="text-sm text-gray-400">
                              We found {originalCount} result{originalCount === 1 ? '' : 's'}, but they were all book summaries or reviews. 
                              Try refining your search to find the original book.
                            </p>
                          </div>
                        );
                      }
                    })()}
                  </motion.div>
                );
              })()}
            </motion.div>
          )}

          {/* Quick Search Examples */}
          {!searchResults && !isSearching && (
            <motion.div 
              key="examples"
              className="mt-8 bg-gray-50 rounded-lg p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <motion.h3 
                className="text-lg font-semibold text-gray-900 mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              >
                Try These Example Searches:
              </motion.h3>
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
              >
                {[
                  {
                    title: "By Title:",
                    examples: ["• \"Harry Potter\"", "• \"The Great Gatsby\"", "• \"To Kill a Mockingbird\""]
                  },
                  {
                    title: "By Author:",
                    examples: ["• \"J.K. Rowling\"", "• \"Stephen King\"", "• \"Agatha Christie\""]
                  },
                  {
                    title: "By ISBN:",
                    examples: ["• \"9780439708180\" (Harry Potter)", "• \"9780061120084\" (To Kill a Mockingbird)"]
                  },
                  {
                    title: "General Search:",
                    examples: ["• \"science fiction\"", "• \"programming\"", "• \"cooking recipes\""]
                  }
                ].map((section, index) => (
                  <motion.div 
                    key={section.title}
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.3, 
                      delay: 0.5 + (index * 0.1), 
                      ease: "easeOut" 
                    }}
                  >
                    <h4 className="font-medium text-gray-700">{section.title}</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {section.examples.map((example, exampleIndex) => (
                        <motion.li
                          key={exampleIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            duration: 0.2, 
                            delay: 0.6 + (index * 0.1) + (exampleIndex * 0.05),
                            ease: "easeOut" 
                          }}
                        >
                          {example}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div 
        className="mb-8 flex items-start justify-between"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Books</h1>
          <p className="text-gray-600">
            Search for books and add them directly to your database.
          </p>
        </motion.div>
        <motion.div 
          className="flex-shrink-0 ml-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          <NotionAuth />
        </motion.div>
      </motion.div>

      <div className="space-y-6">
        {renderSearchSection()}
      </div>

      {/* Book Details Modal */}
      {selectedBook && (
        <BookDetailsModal
          isOpen={!!selectedBook}
          onClose={handleBookDetailsModalClose}
          book={selectedBook}
          isNotionConnected={isAuthenticated}
          notionSettings={notionSettings}
          onSettingsUpdated={handleSettingsUpdated}
        />
      )}
    </div>
  );
};

export default Notion; 