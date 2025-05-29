import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { NotionService } from '../services/notionService';
import { BookService } from '../services/bookService';
import { NotionIntegrationSettings } from '../types/notion';
import { BookSearchResult, SearchParams } from '../types/book';
import SearchForm from '../components/SearchForm';
import BookCardWithNotion from '../components/BookCardWithNotion';
import NotionAuth from '../components/NotionAuth';

const Notion: React.FC = () => {
  // Authentication state
  const [isNotionConnected, setIsNotionConnected] = useState(false);
  const [notionSettings, setNotionSettings] = useState<NotionIntegrationSettings | null>(null);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);

  // Load initial data
  useEffect(() => {
    if (isNotionConnected) {
      loadSettings();
    }
  }, [isNotionConnected]);

  const handleAuthChange = (authenticated: boolean, user?: any) => {
    setIsNotionConnected(authenticated);
    if (authenticated) {
      loadSettings();
    } else {
      setNotionSettings(null);
      setSearchResults(null);
      setSelectedBook(null);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await NotionService.getSettings();
      setNotionSettings(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Don't show error toast for missing settings - it's expected for new users
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
    if (!isNotionConnected) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connect to Notion First
          </h3>
          <p className="text-gray-600">
            Please connect your Notion account to start searching and adding books.
          </p>
        </div>
      );
    }

    if (!notionSettings || !notionSettings.databaseId) {
      return (
        <div className="bg-yellow-50 rounded-lg p-8 text-center border border-yellow-200">
          <div className="flex items-center justify-center mb-4">
            <svg className="h-12 w-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-yellow-900 mb-2">
            Configure Database Settings
          </h3>
          <p className="text-yellow-700 mb-4">
            Please configure your database and field mappings in Settings before searching for books.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Go to Settings
          </a>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Configuration Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">
                Ready to search and add books!
              </span>
            </div>
            <a
              href="/settings"
              className="text-green-700 hover:text-green-800 text-sm font-medium underline"
            >
              Edit Settings
            </a>
          </div>
        </div>

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
                    isNotionConnected={isNotionConnected}
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notion Integration</h1>
        <p className="text-gray-600">
          Connect your Notion account and add books directly to your database.
        </p>
      </div>

      <div className="space-y-6">
        <NotionAuth onAuthChange={handleAuthChange} />
        {renderSearchSection()}
      </div>
    </div>
  );
};

export default Notion; 