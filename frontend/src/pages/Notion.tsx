import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { NotionService } from '../services/notionService';
import { BookService } from '../services/bookService';
import { NotionIntegrationSettings } from '../types/notion';
import { BookSearchResult, SearchParams } from '../types/book';
import SearchForm from '../components/SearchForm';
import BookCardWithNotion from '../components/BookCardWithNotion';
import NotionAuth from '../components/NotionAuth';

const Notion: React.FC = () => {
  // Use auth context instead of local state
  const { isAuthenticated } = useAuth();
  const [notionSettings, setNotionSettings] = useState<NotionIntegrationSettings | null>(null);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);

  // Prevent multiple simultaneous settings loads
  const loadingSettingsRef = useRef(false);

  // Load settings when authenticated
  useEffect(() => {
    console.log('📖 Notion page: isAuthenticated changed to:', isAuthenticated);
    if (isAuthenticated) {
      console.log('📖 Notion page: Loading settings...');
      loadSettings();
    } else {
      console.log('📖 Notion page: Not authenticated, clearing state...');
      setNotionSettings(null);
      setSearchResults(null);
      setSelectedBook(null);
    }
  }, [isAuthenticated]);

  const loadSettings = async () => {
    if (loadingSettingsRef.current) {
      console.log('📖 Notion page: Settings loading already in progress, skipping...');
      return;
    }

    try {
      loadingSettingsRef.current = true;
      console.log('📖 Notion page: 🔧 Loading settings...');
      const settings = await NotionService.getSettings();
      console.log('📖 Notion page: ✅ Settings loaded:', settings);
      setNotionSettings(settings);
    } catch (error) {
      console.error('📖 Notion page: ❌ Failed to load settings:', error);
      // Don't show error toast for missing settings - it's expected for new users
    } finally {
      loadingSettingsRef.current = false;
    }
  };

  const handleSearch = async (params: SearchParams) => {
    try {
      setIsSearching(true);
      setSearchResults(null);
      setSelectedBook(null);
      
      const results = await BookService.searchBooks(params);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search books');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book);
    toast.success(`Selected: ${book.title}`);
  };

  const renderSearchSection = () => {

    if (!notionSettings || !notionSettings.databaseId) {
      return (
        <div>
        </div>
      );
    }

    return (
      <div className="space-y-6">

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Books</h2>
          <SearchForm onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* Loading State */}
        {isSearching && (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-lg text-gray-600">Searching books...</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Search Results</h2>
              <div className="text-sm text-gray-600">
                Found {searchResults.books?.length || 0} of {searchResults.totalItems || 0} books for "{searchResults.query}"
              </div>
            </div>

            {searchResults.books && searchResults.books.length > 0 ? (
              <div className="space-y-4">
                {searchResults.books.map((book: BookSearchResult) => (
                  <BookCardWithNotion
                    key={book.id}
                    book={book}
                    onSelect={handleBookSelect}
                    isNotionConnected={isAuthenticated}
                    notionSettings={notionSettings}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No books found for your search query.</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Book Debug Info */}
        {selectedBook && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Selected Book: {selectedBook.title}
            </h3>
            <pre className="bg-white p-4 rounded border text-xs overflow-auto max-h-96">
              {JSON.stringify(selectedBook, null, 2)}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSelectedBook(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                Clear Selection
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedBook, null, 2));
                  toast.success('Book data copied to clipboard');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Copy JSON
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notion Integration</h1>
          <p className="text-gray-600">
            Add books directly to your database.
          </p>
        </div>
        <div className="flex-shrink-0 ml-6">
          <NotionAuth />
        </div>
      </div>

      <div className="space-y-6">
        {renderSearchSection()}
      </div>
    </div>
  );
};

export default Notion; 