import React, { useState } from 'react';
import { SearchType, SearchParams } from '../types/book';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading?: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading = false }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('general');
  const [limit, setLimit] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch({
        query: query.trim(),
        type: searchType,
        limit
      });
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
        <div>
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
          </label>
          <input
            type="text"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
            required
          />
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
            <option value={40}>40 results (max)</option>
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
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </div>
          ) : (
            'Search Books'
          )}
        </button>
      </form>
    </div>
  );
};

export default SearchForm; 