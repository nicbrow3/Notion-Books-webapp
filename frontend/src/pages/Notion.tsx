import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import NotionAuth from '../components/NotionAuth';
import SearchForm from '../components/SearchForm';
import BookCardWithNotion from '../components/BookCardWithNotion';
import { BookService } from '../services/bookService';
import { NotionService } from '../services/notionService';
import { BookSearchResult, BookSearchResponse, SearchParams } from '../types/book';
import { NotionDatabase, NotionIntegrationSettings, BookToNotionMapping } from '../types/notion';

const Notion: React.FC = () => {
  // Authentication state
  const [isNotionConnected, setIsNotionConnected] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [notionUser, setNotionUser] = useState<any>(null);

  // Database and settings state
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [databaseProperties, setDatabaseProperties] = useState<any>(null);
  const [notionSettings, setNotionSettings] = useState<NotionIntegrationSettings | null>(null);

  // Search state
  const [searchResults, setSearchResults] = useState<BookSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);

  // Loading states
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load initial data when Notion is connected
  useEffect(() => {
    if (isNotionConnected) {
      loadDatabases();
      loadSettings();
    }
  }, [isNotionConnected]);

  // Load database properties when database is selected
  useEffect(() => {
    if (selectedDatabase) {
      loadDatabaseProperties(selectedDatabase);
    }
  }, [selectedDatabase]);

  const handleAuthChange = (authenticated: boolean, user?: any) => {
    setIsNotionConnected(authenticated);
    setNotionUser(user);
    
    if (!authenticated) {
      // Reset all state when disconnected
      setDatabases([]);
      setSelectedDatabase('');
      setDatabaseProperties(null);
      setNotionSettings(null);
      setSearchResults(null);
      setSelectedBook(null);
    }
  };

  const loadDatabases = async () => {
    try {
      setIsLoadingDatabases(true);
      const databaseList = await NotionService.getDatabases();
      setDatabases(databaseList);
      
      if (databaseList.length === 0) {
        toast('No databases found. Make sure you have shared at least one database with this integration.', {
          icon: 'ℹ️',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to load databases:', error);
      toast.error('Failed to load Notion databases');
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  const loadDatabaseProperties = async (databaseId: string) => {
    try {
      setIsLoadingProperties(true);
      const properties = await NotionService.getDatabaseProperties(databaseId);
      setDatabaseProperties(properties);
    } catch (error) {
      console.error('Failed to load database properties:', error);
      toast.error('Failed to load database properties');
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await NotionService.getSettings();
      if (settings) {
        setNotionSettings(settings);
        setSelectedDatabase(settings.databaseId);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Don't show error toast for missing settings - it's expected for new users
    }
  };

  const saveSettings = async () => {
    if (!selectedDatabase || !databaseProperties) {
      toast.error('Please select a database first');
      return;
    }

    try {
      setIsSavingSettings(true);

      // Create default field mapping based on available properties
      const defaultMapping: BookToNotionMapping = {
        title: findPropertyByType('title') || 'Title',
        authors: findPropertyByType('rich_text') || 'Authors',
        description: findPropertyByName('description') || findPropertyByType('rich_text', 1),
        isbn: findPropertyByName('isbn') || findPropertyByType('rich_text', 2),
        publishedDate: findPropertyByType('date') || 'Published Date',
        publisher: findPropertyByName('publisher') || findPropertyByType('rich_text', 3),
        pageCount: findPropertyByType('number') || 'Page Count',
        categories: findPropertyByType('multi_select') || 'Categories',
        rating: findPropertyByName('rating') || findPropertyByType('number', 1),
        thumbnail: findPropertyByType('url') || 'Cover URL',
        status: findPropertyByName('status') || findPropertyByType('select'),
        notes: findPropertyByName('notes') || findPropertyByType('rich_text', 4),
      };

      const settings: NotionIntegrationSettings = {
        databaseId: selectedDatabase,
        fieldMapping: defaultMapping,
        defaultValues: {},
        autoAddBooks: false,
      };

      await NotionService.saveSettings(settings);
      setNotionSettings(settings);
      toast.success('Notion settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save Notion settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const findPropertyByType = (type: string, index: number = 0): string | undefined => {
    if (!databaseProperties?.properties) return undefined;
    
    const properties = Object.entries(databaseProperties.properties)
      .filter(([_, prop]: [string, any]) => prop.type === type);
    
    return properties[index]?.[0];
  };

  const findPropertyByName = (name: string): string | undefined => {
    if (!databaseProperties?.properties) return undefined;
    
    const lowerName = name.toLowerCase();
    return Object.keys(databaseProperties.properties)
      .find(propName => propName.toLowerCase().includes(lowerName));
  };

  const handleSearch = async (params: SearchParams) => {
    setIsSearching(true);
    setSearchResults(null);
    setSelectedBook(null);

    try {
      const results = await BookService.searchBooks(params);
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
      setIsSearching(false);
    }
  };

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book);
    toast.success(`Selected: ${book.title}`);
  };

  const renderDatabaseSelection = () => {
    if (!isNotionConnected) return null;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Configuration</h2>
        
        {isLoadingDatabases ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-600">Loading databases...</span>
          </div>
        ) : databases.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Databases Found</h3>
            <p className="text-gray-600 mb-4">
              You need to share at least one database with this Notion integration.
            </p>
            <button
              onClick={loadDatabases}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh Databases
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="database-select" className="block text-sm font-medium text-gray-700 mb-2">
                Select Database for Books
              </label>
              <select
                id="database-select"
                value={selectedDatabase}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a database...</option>
                {databases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.title || 'Untitled Database'}
                  </option>
                ))}
              </select>
            </div>

            {selectedDatabase && (
              <div className="mt-4">
                {isLoadingProperties ? (
                  <div className="flex items-center py-4">
                    <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Loading database properties...</span>
                  </div>
                ) : databaseProperties ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Database Properties</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(databaseProperties.properties).map(([name, prop]: [string, any]) => (
                        <div key={name} className="flex items-center space-x-2">
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span className="text-gray-700">{name}</span>
                          <span className="text-gray-500 text-xs">({prop.type})</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={saveSettings}
                        disabled={isSavingSettings}
                        className={`px-4 py-2 rounded-md font-medium ${
                          isSavingSettings
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isSavingSettings ? 'Saving...' : 'Save Configuration'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSearchSection = () => {
    if (!isNotionConnected || !notionSettings) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {!isNotionConnected ? 'Connect to Notion First' : 'Configure Database First'}
          </h3>
          <p className="text-gray-600">
            {!isNotionConnected 
              ? 'Please connect your Notion account to start searching and adding books.'
              : 'Please select and configure a database before searching for books.'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Books</h2>
          <SearchForm onSearch={handleSearch} isLoading={isSearching} />
        </div>

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
                {searchResults.books.map((book) => (
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
        {renderDatabaseSelection()}
        {renderSearchSection()}
      </div>
    </div>
  );
};

export default Notion; 