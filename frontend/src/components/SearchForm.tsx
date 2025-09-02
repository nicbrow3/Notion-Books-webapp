import React, { useState, useEffect, useRef } from 'react';
import { SearchType, SearchParams } from '../types/book';
import { SuggestionService, BookSuggestion } from '../services/suggestionService';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading = false }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('general');
  const [limit, setLimit] = useState(10);
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fetch suggestions with debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 3 && searchType === 'general') {
      debounceRef.current = setTimeout(async () => {
        setIsLoadingSuggestions(true);
        try {
          const result = await SuggestionService.getSuggestions(query);
          setSuggestions(result.suggestions);
          setShowSuggestions(result.suggestions.length > 0);
        } catch (error) {
          console.error('Failed to fetch suggestions:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchType]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      onSearch({
        query: query.trim(),
        type: searchType,
        limit
      });
    }
  };

  const handleSuggestionClick = (suggestion: BookSuggestion) => {
    setQuery(suggestion.searchQuery);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Automatically search with the suggestion
    onSearch({
      query: suggestion.searchQuery,
      type: searchType,
      limit
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedSuggestionIndex(-1);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const searchTypeOptions = [
    { value: 'general' as SearchType, label: 'General Search', description: 'Search across all fields' },
    { value: 'title' as SearchType, label: 'Title', description: 'Search by book title' },
    { value: 'author' as SearchType, label: 'Author', description: 'Search by author name' },
    { value: 'isbn' as SearchType, label: 'ISBN', description: 'Search by ISBN-10 or ISBN-13' },
  ];

  const getPlaceholder = () => {
    switch (searchType) {
      case 'title':
        return 'Enter book title (e.g., "Harry Potter")';
      case 'author':
        return 'Enter author name (e.g., "J.K. Rowling")';
      case 'isbn':
        return 'Enter ISBN (e.g., "9780439708180")';
      default:
        return 'Enter search terms...';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {searchTypeOptions.map((option) => (
              <label
                key={option.value}
                className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                  searchType === option.value
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="searchType"
                  value={option.value}
                  checked={searchType === option.value}
                  onChange={(e) => setSearchType(e.target.value as SearchType)}
                  className="sr-only"
                />
                <div className="flex flex-col">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-gray-500">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Search Query Input */}
        <div className="relative">
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
            {searchType === 'general' && (
              <span className="text-xs text-gray-500 ml-2">
                (Try "harry potter 2" for suggestions)
              </span>
            )}
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              id="query"
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              required
            />
            {isLoadingSuggestions && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.suggestion}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    index === selectedSuggestionIndex
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.displayText}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        by {suggestion.author}
                        {suggestion.metadata.series && (
                          <span className="ml-2">
                            • {suggestion.metadata.series.split(' ').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')} #{suggestion.metadata.bookNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-2 flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        suggestion.metadata.confidence > 0.8 ? 'bg-green-400' :
                        suggestion.metadata.confidence > 0.6 ? 'bg-yellow-400' :
                        'bg-gray-400'
                      }`}></span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t">
                Use ↑↓ to navigate, Enter to select, Esc to close
              </div>
            </div>
          )}
        </div>

        {/* Results Limit */}
        <div>
          <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Results
          </label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value={5}>5 results</option>
            <option value={10}>10 results</option>
            <option value={20}>20 results</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading || !query.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          Search Books
        </button>
      </form>
    </div>
  );
};

export default SearchForm; 