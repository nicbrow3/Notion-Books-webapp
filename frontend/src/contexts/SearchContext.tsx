import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BookSearchResult, SearchParams } from '../types/book';
import { BookService } from '../services/bookService';
import { toast } from 'react-hot-toast';

interface SearchContextType {
  isSearching: boolean;
  searchResults: any;
  selectedBook: BookSearchResult | null;
  handleSearch: (params: SearchParams) => Promise<void>;
  handleBookSelect: (book: BookSearchResult) => void;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);

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

  const clearSearch = () => {
    setSearchResults(null);
    setSelectedBook(null);
  };

  return (
    <SearchContext.Provider value={{
      isSearching,
      searchResults,
      selectedBook,
      handleSearch,
      handleBookSelect,
      clearSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
}; 