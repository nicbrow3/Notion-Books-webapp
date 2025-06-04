import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SearchForm from '../components/SearchForm';
import BookCard from '../components/BookCard';
import { BookService } from '../services/bookService';
import { BookSearchResult, BookSearchResponse, SearchParams } from '../types/book';

const Search: React.FC = () => {
  const [searchResults, setSearchResults] = useState<BookSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);

  // Test API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const result = await BookService.testConnection();
        if (result.success) {
          setConnectionStatus('connected');
          toast.success('Connected to Google Books API');
        } else {
          setConnectionStatus('error');
          toast.error(`API Connection Error: ${result.message}`);
        }
      } catch (error) {
        setConnectionStatus('error');
        toast.error('Failed to connect to API');
      }
    };

    testConnection();
  }, []);

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setSearchResults(null);
    setSelectedBook(null);

    try {
      // Update params to include audiobook data for top result
      const searchParams: SearchParams = { 
        ...params, 
        includeAudiobooks: 'top' as const // Automatically load audiobook data for top result
      };
      
      console.log('🔍 Searching with audiobook data for top result');
      const results = await BookService.searchBooks(searchParams);
      
      setSearchResults(results);
      
      if (!results.books || results.books.length === 0) {
        toast.error('No books found for your search query');
      } else {
        toast.success(`Found ${results.books.length} book${results.books.length === 1 ? '' : 's'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Search failed: ${errorMessage}`);
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book);
    toast.success(`Selected: ${book.title}`);
  };

  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'checking':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-yellow-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-yellow-800">Checking API connection...</span>
            </div>
          </div>
        );
      case 'connected':
        return (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800">Connected to Google Books API</span>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-800">API connection failed. Please check your configuration.</span>
            </div>
          </div>
        );
    }
  };

  const renderSearchResults = () => {
    if (!searchResults) return null;

    // Add safety check for books array
    const books = searchResults.books || [];

    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Search Results
          </h2>
          <div className="text-sm text-gray-600">
            Found {books.length} of {searchResults.totalItems || 0} books for "{searchResults.query}"
          </div>
        </div>

        {books.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No books found for your search query.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {books.map((book: BookSearchResult) => (
              <BookCard
                key={book.id}
                book={book}
                onSelect={handleBookSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSelectedBook = () => {
    if (!selectedBook) return null;

    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Selected Book Details
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Raw API Data for: {selectedBook.title}
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
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Books</h1>
        <p className="text-gray-600">
          Search for books using the Google Books API. All available data will be displayed.
        </p>
      </div>

      {renderConnectionStatus()}

      <SearchForm 
        onSearch={handleSearch} 
        isLoading={isLoading}
      />

      {isLoading && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg text-gray-600">Searching books...</span>
          </div>
        </div>
      )}

      {renderSearchResults()}
      {renderSelectedBook()}

      {/* Quick Search Examples */}
      {!searchResults && !isLoading && connectionStatus === 'connected' && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Try These Example Searches:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">By Title:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "Harry Potter"</li>
                <li>• "The Great Gatsby"</li>
                <li>• "To Kill a Mockingbird"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">By Author:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "J.K. Rowling"</li>
                <li>• "Stephen King"</li>
                <li>• "Agatha Christie"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">By ISBN:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "9780439708180" (Harry Potter)</li>
                <li>• "9780061120084" (To Kill a Mockingbird)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">General Search:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "science fiction"</li>
                <li>• "programming"</li>
                <li>• "cooking recipes"</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search; 